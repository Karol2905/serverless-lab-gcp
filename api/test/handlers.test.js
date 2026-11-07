// Pruebas del adaptador de Cloud Run functions: invocan cada función con
// objetos req/res falsos, como lo haría el Functions Framework.
const test = require('node:test');
const assert = require('node:assert/strict');
const { questions } = require('../src/lib/questions');

function fakeRes() {
  return {
    statusCode: 200, headers: {}, body: undefined,
    status(c) { this.statusCode = c; return this; },
    set(k, v) { this.headers[k] = v; return this; },
    json(b) { this.body = b; return this; }
  };
}
const req = (method, body) => ({ method, body, get: () => undefined });

test('info: la primera invocación es cold start y el contador crece', async () => {
  const { info } = require('../src/functions/info');
  const a = fakeRes(); await info(req('GET'), a);
  const b = fakeRes(); await info(req('GET'), b);
  assert.equal(a.body.coldStart, true);
  assert.equal(b.body.coldStart, false);
  assert.equal(b.body.invocationsOnThisInstance, a.body.invocationsOnThisInstance + 1);
  assert.equal(a.body.instanceId, b.body.instanceId);
});

test('questions: responde sin las respuestas', async () => {
  const res = fakeRes();
  await require('../src/functions/questions').questions(req('GET'), res);
  assert.equal(res.statusCode, 200);
  for (const q of res.body) assert.equal(q.answer, undefined);
});

test('answer: 400 con opción inválida, 405 con GET y 200 con una válida', async () => {
  const { answer } = require('../src/functions/answer');
  let res = fakeRes(); await answer(req('POST', { id: 'q1', choice: 9 }), res);
  assert.equal(res.statusCode, 400);
  res = fakeRes(); await answer(req('GET'), res);
  assert.equal(res.statusCode, 405);
  res = fakeRes(); await answer(req('POST', { id: questions[0].id, choice: questions[0].answer }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.correct, true);
});

test('certificate: emite código solo si aprueba', async () => {
  const { certificate } = require('../src/functions/certificate');
  const all = questions.map((q) => ({ id: q.id, choice: q.answer }));
  let res = fakeRes(); await certificate(req('POST', { name: 'Ana', answers: all }), res);
  assert.equal(res.body.passed, true);
  assert.match(res.body.code, /^[0-9A-F]{12}$/);
  res = fakeRes(); await certificate(req('POST', { name: 'Ana', answers: [] }), res);
  assert.equal(res.body.code, null);
  res = fakeRes(); await certificate(req('POST', { name: 'A' }), res);
  assert.equal(res.statusCode, 400);
});

test('hello: saluda con el nombre limpio o a un visitante', async () => {
  const { hello } = require('../src/functions/hello');
  let res = fakeRes(); await hello({ method: 'GET', query: { name: '<b>Ana</b>' }, get: () => undefined }, res);
  assert.match(res.body.saludo, /Hola, bAna\/b!/);
  res = fakeRes(); await hello({ method: 'GET', query: {}, get: () => undefined }, res);
  assert.equal(res.body.name, 'visitante');
});
