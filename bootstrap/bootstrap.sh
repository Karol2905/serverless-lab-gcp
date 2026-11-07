#!/usr/bin/env bash
# Bootstrap del laboratorio serverless en Google Cloud (se ejecuta UNA vez).
# Equivale a "Crear la Static Web App" + "token de despliegue" de la guía de Azure,
# pero sin ningún secreto: GitHub Actions se autentica con Workload Identity Federation.
#
#   GITHUB_REPO=<usuario>/serverless-lab-gcp BILLING_ACCOUNT=XXXXXX-XXXXXX-XXXXXX bash bootstrap/bootstrap.sh
#
# Es idempotente: si algo falla (p. ej. por propagación de una API recién habilitada),
# vuelva a ejecutarlo y retomará desde donde quedó.
set -euo pipefail

: "${GITHUB_REPO:?Defina GITHUB_REPO=usuario/repositorio}"
: "${BILLING_ACCOUNT:?Defina BILLING_ACCOUNT (gcloud billing accounts list)}"
REGION="${REGION:-us-central1}"

retry() { # reintenta comandos que fallan por consistencia eventual
  local n=0
  until "$@"; do
    n=$((n + 1)); [ "$n" -ge 12 ] && return 1
    echo "   … reintento $n/12 en 10 s"; sleep 10
  done
}

echo "0/6 Identificadores del repositorio en GitHub"
META=$(curl -fsS "https://api.github.com/repos/${GITHUB_REPO}")
REPO_ID=$(echo "$META" | python3 -c 'import json,sys;print(json.load(sys.stdin)["id"])')
OWNER_ID=$(echo "$META" | python3 -c 'import json,sys;print(json.load(sys.stdin)["owner"]["id"])')
PROJECT="serverless-lab-${REPO_ID}"
echo "   repo=${GITHUB_REPO} repository_id=${REPO_ID} owner_id=${OWNER_ID} proyecto=${PROJECT}"

echo "1/6 Proyecto (equivale al grupo de recursos rg-serverless-lab)"
gcloud projects describe "$PROJECT" >/dev/null 2>&1 || \
  gcloud projects create "$PROJECT" --name="serverless-lab" --labels=course=pemu-2026,lab=serverless
gcloud billing projects link "$PROJECT" --billing-account="$BILLING_ACCOUNT" >/dev/null
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')

echo "2/6 APIs (Cloud Run functions, Firebase Hosting, IAM, STS, Logging, Monitoring)"
retry gcloud services enable --project "$PROJECT" \
  cloudfunctions.googleapis.com run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com iam.googleapis.com iamcredentials.googleapis.com \
  sts.googleapis.com firebase.googleapis.com firebasehosting.googleapis.com \
  logging.googleapis.com monitoring.googleapis.com cloudresourcemanager.googleapis.com \
  serviceusage.googleapis.com cloudbilling.googleapis.com

echo "3/6 Firebase Hosting (sitio ${PROJECT}.web.app)"
TOKEN=$(gcloud auth print-access-token)
if ! curl -fsS -H "Authorization: Bearer $TOKEN" -H "x-goog-user-project: $PROJECT" \
    "https://firebase.googleapis.com/v1beta1/projects/${PROJECT}" >/dev/null 2>&1; then
  retry curl -fsS -X POST -H "Authorization: Bearer $TOKEN" -H "x-goog-user-project: $PROJECT" \
    -H "Content-Type: application/json" -d '{}' \
    "https://firebase.googleapis.com/v1beta1/projects/${PROJECT}:addFirebase" >/dev/null
  echo "   esperando a que Firebase termine de aprovisionar…"; sleep 30
fi

echo "4/6 Cuentas de servicio (sin claves)"
for sa in sa-serverless-github fn-runtime fn-build; do
  gcloud iam service-accounts describe "${sa}@${PROJECT}.iam.gserviceaccount.com" --project "$PROJECT" >/dev/null 2>&1 || \
    retry gcloud iam service-accounts create "$sa" --project "$PROJECT" \
      --display-name "$sa (laboratorio serverless)"
done
DEPLOYER="sa-serverless-github@${PROJECT}.iam.gserviceaccount.com"
RUNTIME="fn-runtime@${PROJECT}.iam.gserviceaccount.com"
BUILDER="fn-build@${PROJECT}.iam.gserviceaccount.com"

echo "5/6 Workload Identity Federation: pool github y proveedor OIDC github-actions"
gcloud iam workload-identity-pools describe github --project "$PROJECT" --location global >/dev/null 2>&1 || \
  retry gcloud iam workload-identity-pools create github --project "$PROJECT" --location global \
    --display-name "GitHub Actions"
gcloud iam workload-identity-pools providers describe github-actions --project "$PROJECT" \
    --location global --workload-identity-pool github >/dev/null 2>&1 || \
  retry gcloud iam workload-identity-pools providers create-oidc github-actions --project "$PROJECT" \
    --location global --workload-identity-pool github \
    --issuer-uri "https://token.actions.githubusercontent.com" \
    --attribute-mapping "google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_id=assertion.repository_id,attribute.repository_owner_id=assertion.repository_owner_id,attribute.ref=assertion.ref" \
    --attribute-condition "assertion.repository_owner_id == '${OWNER_ID}' && assertion.repository_id == '${REPO_ID}'"
# Solo los tokens de ESTE repositorio pueden hacerse pasar por la cuenta de despliegue.
retry gcloud iam service-accounts add-iam-policy-binding "$DEPLOYER" --project "$PROJECT" \
  --role roles/iam.workloadIdentityUser --condition=None \
  --member "principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github/attribute.repository_id/${REPO_ID}" >/dev/null

echo "6/6 Permisos mínimos"
# Cuenta de despliegue: publicar funciones y sitio, y nada más.
for role in roles/cloudfunctions.developer roles/run.admin roles/firebasehosting.admin \
            roles/serviceusage.serviceUsageConsumer roles/serviceusage.serviceUsageViewer; do
  retry gcloud projects add-iam-policy-binding "$PROJECT" --member "serviceAccount:${DEPLOYER}" \
    --role "$role" --condition=None >/dev/null
done
# Puede "usar" solo las dos cuentas con las que corren y se construyen las funciones.
for sa in "$RUNTIME" "$BUILDER"; do
  retry gcloud iam service-accounts add-iam-policy-binding "$sa" --project "$PROJECT" \
    --member "serviceAccount:${DEPLOYER}" --role roles/iam.serviceAccountUser --condition=None >/dev/null
done
# Cuenta de compilación (Cloud Build): construir la imagen y escribir logs.
for role in roles/cloudbuild.builds.builder roles/logging.logWriter roles/artifactregistry.writer; do
  retry gcloud projects add-iam-policy-binding "$PROJECT" --member "serviceAccount:${BUILDER}" \
    --role "$role" --condition=None >/dev/null
done
# Cuenta de ejecución (fn-runtime): sin roles. La función no necesita acceder a ningún otro servicio.

cat <<EOF

Cree estas cuatro variables en GitHub (Settings > Secrets and variables > Actions > Variables):
  GCP_PROJECT         = ${PROJECT}
  GCP_REGION          = ${REGION}
  GCP_WIF_PROVIDER    = projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github/providers/github-actions
  GCP_SERVICE_ACCOUNT = ${DEPLOYER}
EOF
