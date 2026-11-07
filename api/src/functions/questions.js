// GET /api/questions — devuelve las preguntas SIN las respuestas.
const { publicQuestions } = require('../lib/quiz');

async function questions(req, res) {
  console.log('Listando preguntas');
  res.set('Cache-Control', 'no-store').json(publicQuestions());
}

module.exports = { questions };
