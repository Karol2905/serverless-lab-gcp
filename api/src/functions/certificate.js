// POST /api/certificate  { "name": "Ana", "answers": [{ "id": "q1", "choice": 1 }, ...] }
// Califica el formulario completo en el servidor y emite un certificado.
const { grade, sanitizeName, certificateCode } = require('../lib/quiz');
const { readJson } = require('./http');

async function certificate(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  const body = readJson(req);
  if (body === undefined) return res.status(400).json({ error: 'El cuerpo debe ser JSON' });

  const name = sanitizeName(body?.name);
  if (name.length < 2) return res.status(400).json({ error: 'Escribe tu nombre (mínimo 2 caracteres)' });

  const result = grade(body?.answers);
  const issuedAt = new Date().toISOString();
  console.log(`Certificado para "${name}": ${result.score}/${result.total}`);
  res.json({ name, ...result, issuedAt, code: result.passed ? certificateCode(name, result.score, issuedAt) : null });
}

module.exports = { certificate };
