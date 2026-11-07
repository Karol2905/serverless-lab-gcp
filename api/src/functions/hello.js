// GET /api/hello?name=Ana — reto de la Parte 9: una función nueva con su propio trigger HTTP.
const { sanitizeName } = require('../lib/quiz');

async function hello(req, res) {
  const name = sanitizeName(req.query?.name) || 'visitante';
  console.log(`Saludo para "${name}"`);
  res.set('Cache-Control', 'no-store').json({
    saludo: `¡Hola, ${name}! Te responde la función hello desde Cloud Run.`,
    name,
    service: process.env.K_SERVICE || 'local',
    stage: process.env.STAGE || 'local'
  });
}

module.exports = { hello };
