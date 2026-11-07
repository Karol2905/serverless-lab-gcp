// Punto de entrada de Cloud Run functions. Las cuatro funciones se despliegan desde
// esta misma carpeta, cada una como un servicio independiente con su --entry-point:
//   gcloud functions deploy info --gen2 --entry-point=info --trigger-http ...
// El trigger HTTP lo registra functions.http(); la ruta /api/* la pone Firebase Hosting.
const functions = require('@google-cloud/functions-framework');
const { info } = require('./src/functions/info');
const { questions } = require('./src/functions/questions');
const { answer } = require('./src/functions/answer');
const { certificate } = require('./src/functions/certificate');

functions.http('info', info);
functions.http('questions', questions);
functions.http('answer', answer);
functions.http('certificate', certificate);
