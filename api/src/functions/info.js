// GET /api/info — expone datos de la instancia para OBSERVAR conceptos serverless:
//  - coldStart: true en la primera invocación que atiende esta instancia.
//  - invocationsOnThisInstance: contador EN MEMORIA (se pierde al reciclar = stateless).
//  - instanceId: distinto por instancia (si ves varios, la plataforma escaló).
// En Cloud Run functions cada "instancia" es un contenedor de Cloud Run.
const crypto = require('node:crypto');

// Este código corre UNA vez, cuando la instancia carga el módulo (cold start).
const instanceId = crypto.randomUUID().slice(0, 8);
const instanceStartedAt = new Date().toISOString();
let invocations = 0;

// ID que Cloud Run asigna a la instancia (el mismo que aparece en labels.instanceId
// de Cloud Logging). Se pide al servidor de metadatos solo una vez por instancia.
let platformInstanceId = null;
async function getPlatformInstanceId() {
  if (platformInstanceId) return platformInstanceId;
  if (!process.env.K_SERVICE) return 'local';
  try {
    const res = await fetch('http://metadata.google.internal/computeMetadata/v1/instance/id', {
      headers: { 'Metadata-Flavor': 'Google' },
      signal: AbortSignal.timeout(2000)
    });
    if (res.ok) platformInstanceId = (await res.text()).trim().slice(0, 16); // prefijo de labels.instanceId
  } catch (err) {
    console.warn(`No se pudo leer el instance id: ${err.message}`);
  }
  return platformInstanceId || 'desconocido';
}

async function info(req, res) {
  invocations++;
  const started = Date.now();
  console.log(`Instancia ${instanceId}, invocación #${invocations}`);

  res.set('Cache-Control', 'no-store').json({
    instanceId,
    instanceStartedAt,
    coldStart: invocations === 1,
    invocationsOnThisInstance: invocations,
    invocationId: req.get('x-cloud-trace-context')?.split('/')[0] || crypto.randomUUID(),
    platformInstanceId: await getPlatformInstanceId(),
    processUptimeSeconds: Math.round(process.uptime()),
    nodeVersion: process.version,
    service: process.env.K_SERVICE || 'local',
    revision: process.env.K_REVISION || 'local', // cambia en cada despliegue
    stage: process.env.STAGE || 'local',
    deployVersion: (process.env.DEPLOY_VERSION || 'local').slice(0, 7),
    serverTimeMs: Date.now() - started
  });
}

module.exports = { info };
