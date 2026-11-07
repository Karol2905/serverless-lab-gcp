// Adaptador HTTP. Cloud Run functions entrega objetos req/res al estilo Express
// (lo que en Azure hacía @azure/functions). El Functions Framework ya parsea el
// JSON cuando llega con Content-Type: application/json.
function readJson(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  const raw = Buffer.isBuffer(req.rawBody) ? req.rawBody.toString('utf8') : typeof req.body === 'string' ? req.body : '';
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

module.exports = { readJson };
