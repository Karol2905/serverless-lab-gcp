// POST /api/answer  { "id": "q1", "choice": 1 }
// Califica UNA respuesta en el servidor y devuelve la explicación del concepto.
const { checkAnswer } = require('../lib/quiz');
const { readJson } = require('./http');

async function answer(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  const body = readJson(req);
  if (body === undefined) return res.status(400).json({ error: 'El cuerpo debe ser JSON' });

  const result = checkAnswer(body?.id, body?.choice);
  if (!result) {
    console.warn(`Respuesta inválida: ${JSON.stringify(body)}`);
    return res.status(400).json({ error: 'Pregunta u opción inválida' });
  }
  console.log(`Pregunta ${result.id}: ${result.correct ? 'correcta' : 'incorrecta'}`);
  res.json(result);
}

module.exports = { answer };
