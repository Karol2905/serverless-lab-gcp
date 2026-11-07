// Banco de preguntas del laboratorio.
// Vive en el BACKEND (la función) y no en el navegador: así el cliente nunca
// recibe la respuesta correcta y la lógica de calificación queda en el servidor.

const questions = [
  {
    id: 'q1',
    concept: 'Qué es serverless',
    text: '¿Qué significa realmente "serverless"?',
    options: [
      'Que el código se ejecuta sin ningún servidor físico',
      'Que existen servidores, pero el proveedor los gestiona y tú solo despliegas código o configuración',
      'Que la aplicación solo funciona en el navegador del usuario',
      'Que no se necesita conexión a Internet'
    ],
    answer: 1,
    explanation:
      'Siempre hay servidores. "Serverless" significa que tú no los aprovisionas, parcheas ni escalas: el proveedor (Google Cloud) se encarga y tú te concentras en el código.'
  },
  {
    id: 'q2',
    concept: 'Pago por uso',
    text: 'En un modelo serverless de consumo, ¿cuándo pagas por el cómputo?',
    options: [
      'Pagas una tarifa fija mensual por la máquina virtual',
      'Solo cuando tu código se ejecuta (invocaciones y tiempo de ejecución)',
      'Pagas por cada usuario registrado',
      'Nunca, serverless siempre es gratis'
    ],
    answer: 1,
    explanation:
      'El modelo de consumo cobra por ejecuciones y recursos usados mientras la función corre. Si nadie la invoca, el costo de cómputo tiende a cero. (Este lab cabe en la capa gratuita de Google Cloud: Cloud Run incluye 2 millones de peticiones al mes.)'
  },
  {
    id: 'q3',
    concept: 'FaaS y triggers',
    text: '¿Qué hace que una Cloud Run function se ejecute?',
    options: [
      'Un trigger (disparador): una petición HTTP, un mensaje en una cola, un temporizador, etc.',
      'Se ejecuta en un bucle infinito esperando trabajo',
      'Un administrador la inicia manualmente desde el portal cada vez',
      'Se ejecuta automáticamente cada vez que alguien abre el sitio estático'
    ],
    answer: 0,
    explanation:
      'Las funciones son "event-driven": cada una tiene exactamente un trigger. En este laboratorio todas usan trigger HTTP y Firebase Hosting les enruta /api/... (por eso responden en el mismo dominio).'
  },
  {
    id: 'q4',
    concept: 'Cold start',
    text: '¿Qué es un "cold start" (arranque en frío)?',
    options: [
      'Un error que ocurre cuando la función falla',
      'La latencia extra cuando la plataforma debe crear una instancia nueva para atender una invocación',
      'Cuando la base de datos se apaga por inactividad',
      'El tiempo que tarda GitHub Actions en desplegar'
    ],
    answer: 1,
    explanation:
      'Si no hay una instancia "caliente", Cloud Run debe arrancar un contenedor nuevo, cargar el runtime y tu código. Esa primera invocación tarda más. En la pestaña "Laboratorio en vivo" puedes verlo con el campo coldStart.'
  },
  {
    id: 'q5',
    concept: 'Stateless',
    text: 'Guardaste un contador en una variable global de tu función. ¿Qué puede pasar?',
    options: [
      'El contador es permanente y compartido por todos los usuarios',
      'El contador se reinicia cuando la instancia se recicla y no se comparte entre instancias',
      'Google Cloud lo guarda automáticamente en una base de datos',
      'La función no se puede desplegar con variables globales'
    ],
    answer: 1,
    explanation:
      'Las funciones deben diseñarse "stateless". La memoria de una instancia es efímera y cada instancia tiene la suya. Para persistir estado se usa un servicio externo (Firestore, Cloud Storage, etc.).'
  },
  {
    id: 'q6',
    concept: 'Escalado automático',
    text: 'Llegan 1 000 peticiones simultáneas a tu API serverless. ¿Qué hace la plataforma?',
    options: [
      'Rechaza todas las peticiones por encima de 1',
      'Escala horizontalmente creando más instancias según la demanda (dentro de los límites del plan)',
      'Tienes que crear manualmente más máquinas virtuales',
      'Pone las peticiones en pausa hasta el día siguiente'
    ],
    answer: 1,
    explanation:
      'El escalado horizontal (scale-out) es automático. Prueba el botón "Ráfaga" en el laboratorio en vivo: puede que veas distintos instanceId atendiendo las llamadas.'
  },
  {
    id: 'q7',
    concept: 'Hosting estático',
    text: 'En este lab, ¿quién sirve los archivos HTML/CSS/JS?',
    options: [
      'Una máquina virtual que tú administras',
      'Firebase Hosting, que publica los archivos en una CDN global administrada; no hay servidor web que configurar',
      'El propio navegador del estudiante',
      'Una Cloud Run function por cada archivo'
    ],
    answer: 1,
    explanation:
      'El contenido estático se publica en la CDN de Firebase Hosting. Las peticiones a /api/* se reescriben (rewrites de firebase.json) hacia las Cloud Run functions.'
  },
  {
    id: 'q8',
    concept: 'Mismo origen',
    text: 'En este lab, ¿por qué el frontend puede llamar a /api/answer sin configurar CORS?',
    options: [
      'Porque CORS no existe en Google Cloud',
      'Porque Firebase Hosting sirve el sitio y la API bajo el mismo dominio (mismo origen)',
      'Porque el navegador desactiva CORS para estudiantes',
      'Porque la función tiene el rol Owner del proyecto'
    ],
    answer: 1,
    explanation:
      'Firebase Hosting actúa como proxy: los rewrites de firebase.json mandan /api/* a las funciones. El navegador ve un solo dominio, así que no necesita CORS (lo mismo que hacía Static Web Apps en Azure).'
  },
  {
    id: 'q9',
    concept: 'CI/CD sin llaves',
    text: '¿Cómo se autentica GitHub Actions contra Google Cloud en este laboratorio?',
    options: [
      'Con una clave JSON de una cuenta de servicio guardada como secreto',
      'Con Workload Identity Federation: GitHub emite un token OIDC y Google lo cambia por un token temporal de una cuenta de servicio que solo confía en este repositorio',
      'Escribiendo tu usuario y contraseña de Google en el YAML',
      'Subiendo los archivos manualmente por FTP'
    ],
    answer: 1,
    explanation:
      'El workflow pide a GitHub un token OIDC firmado y el Security Token Service de Google lo cambia por un token de corta duración de la cuenta de servicio sa-serverless-github. El proveedor solo acepta tokens de tu repositorio. No hay ningún secreto guardado: el proveedor y el email de la cuenta no son secretos.'
  },
  {
    id: 'q10',
    concept: 'Entornos de preview',
    text: '¿Qué ocurre cuando abres un Pull Request contra main en este repositorio?',
    options: [
      'Nada, solo los push a main hacen algo',
      'El pipeline ejecuta pruebas y despliega un entorno de preview con su propia URL',
      'Se borra el sitio de producción',
      'GitHub cobra el despliegue'
    ],
    answer: 1,
    explanation:
      'El workflow despliega funciones propias (info-pr-<número>, …) y un canal de preview de Firebase Hosting con su URL, y la comenta en el PR. Al cerrar el PR, el job "close" borra las funciones y el canal.'
  },
  {
    id: 'q11',
    concept: 'Escalado a cero',
    text: 'Nadie usa el sitio durante 20 minutos. ¿Qué pasa con las instancias de Cloud Run functions?',
    options: [
      'Siguen encendidas para siempre y se cobran por hora',
      'La plataforma las retira (escala a cero) y la siguiente petición sufre un cold start',
      'Se convierten en máquinas virtuales de Compute Engine',
      'Firebase Hosting las guarda en caché con sus variables'
    ],
    answer: 9,
    explanation:
      'Con min-instances en 0, Cloud Run apaga las instancias ociosas. En el laboratorio se vio en la métrica de instancias (bajó a 0) y en coldStart: true con más de 1 s de latencia en la primera llamada.'
  }
];

module.exports = { questions };
