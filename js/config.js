// ВАШИ ДАННЫЕ FIREBASE
// -------------------------------------------------------------
// 1. Откройте https://console.firebase.google.com и создайте проект.
// 2. Добавьте Web-приложение (значок </>) — Firebase покажет объект firebaseConfig.
// 3. Скопируйте значения сюда вместо YOUR_... .
// Эти значения не являются секретом (они видны в любом веб-приложении),
// а данные защищает файл database.rules.json.
//
// Пока здесь остаются YOUR_..., приложение работает в локальном режиме:
// данные хранятся только в браузере этого устройства.
// -------------------------------------------------------------

export const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
  databaseURL: 'YOUR_DATABASE_URL', // например https://YOUR_PROJECT_ID-default-rtdb.europe-west1.firebasedatabase.app
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID'
};

// Адрес вашего Cloudflare Worker для ИИ-меню (см. worker/README.md).
// Пока здесь YOUR_WORKER_URL, кнопка ИИ сообщает, что он не подключён.
export const aiEndpoint = 'YOUR_WORKER_URL';

export function isAiConfigured() {
  return aiEndpoint.startsWith('https://');
}

// Настроен ли Firebase (заменены ли заглушки)
export function isConfigured() {
  return Object.values(firebaseConfig).every((v) => typeof v === 'string' && v && !v.includes('YOUR_'));
}
