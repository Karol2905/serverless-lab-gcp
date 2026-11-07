# PEMU 2026 · Laboratorio 7 — Serverless en Google Cloud

Versión GCP del Laboratorio 7 (*Serverless con Azure Static Web Apps, Azure Functions y GitHub Actions*). El sitio, la lógica (`api/src/lib/`), las pruebas y los experimentos son los mismos; cambian los servicios:

| Azure (guía original) | Google Cloud (este repositorio) |
|---|---|
| Static Web Apps (sitio + proxy `/api`) | **Firebase Hosting** con *rewrites* de `/api/*` (mismo dominio, sin CORS) |
| Azure Functions administradas (`api/`) | **Cloud Run functions** (`api/index.js` + `api/src/functions/`), una por endpoint |
| `staticwebapp.config.json` | `firebase.json` |
| Token de despliegue (secreto) | **Workload Identity Federation**: sin secretos, solo variables públicas |
| Entorno de preview por PR | Funciones `*-pr-N` + **canal de preview** de Firebase Hosting |
| Application Insights | **Cloud Logging** (`labels.instanceId`) y **Cloud Monitoring** (instancias, peticiones, latencia) |
| Grupo de recursos `rg-serverless-lab` | Proyecto `serverless-lab-<id del repositorio>` |

```
git push / PR ─▶ GitHub Actions ─▶ test (npm test) ─▶ deploy ──OIDC──▶ STS de Google ─▶ sa-serverless-github
                                                         │
                         gcloud functions deploy ×4  ◀───┤───▶  firebase deploy (src/)
                                                         ▼
 Navegador ──HTTPS──▶ Firebase Hosting  https://<proyecto>.web.app
                        ├── /        → contenido estático (CDN)
                        └── /api/*   → Cloud Run functions: info · questions · answer · certificate
```

## Estructura

```
.github/workflows/serverless-gcp.yml   # test → deploy (prod o pr-N) → close_preview
bootstrap/bootstrap.sh                 # proyecto, APIs, Firebase, cuentas de servicio, WIF y permisos
firebase.json                          # hosting de src/ y rewrites /api/* → funciones
src/                                   # sitio estático
api/index.js                           # registra las 4 funciones (functions.http)
api/src/functions/                     # adaptador HTTP de Cloud Run functions
api/src/lib/                           # lógica pura (igual que en Azure) + banco de preguntas
api/test/                              # pruebas que corren antes de desplegar
```

## Puesta en marcha

1. En Cloud Shell (o con gcloud autenticado):

   ```bash
   GITHUB_REPO=<usuario>/serverless-lab-gcp BILLING_ACCOUNT=<cuenta> bash bootstrap/bootstrap.sh
   ```

2. Cree en GitHub las cuatro **variables** que imprime el script (`GCP_PROJECT`, `GCP_REGION`, `GCP_WIF_PROVIDER`, `GCP_SERVICE_ACCOUNT`). No hace falta ningún secreto.
3. Ejecute de nuevo el workflow. El sitio queda en `https://<proyecto>.web.app`.

Prueba local de una función: `cd api && npm install && npm start` y abra `http://localhost:8081`.

## Limpieza

```bash
gcloud projects delete serverless-lab-<id del repositorio>
```

Borra las funciones, el sitio de Hosting, las cuentas de servicio y el pool de Workload Identity.
