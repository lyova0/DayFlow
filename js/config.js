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
    apiKey: "AIzaSyC8AakMpxNFc3ceL7wmoizqrzq89ZEQKK0",
    authDomain: "ayflow-app.firebaseapp.com",
    projectId: "ayflow-app",
    storageBucket: "ayflow-app.firebasestorage.app",
    messagingSenderId: "83976051861",
    appId: "1:83976051861:web:7c5528d37e7c72c4dfcf9c",
    measurementId: "G-MGYVD4JYTS",
    databaseURL: 'https://ayflow-app-default-rtdb.firebaseio.com/',
};

// Адрес вашего Cloudflare Worker для ИИ-меню (см. worker/README.md).
// Пока здесь YOUR_WORKER_URL, кнопка ИИ сообщает, что он не подключён.
export const aiEndpoint = 'https://dash.cloudflare.com/94b087d8a8103c359583034764e7ed7d/home';

export function isAiConfigured() {
    return aiEndpoint.startsWith('https://');
}


// Настроен ли Firebase (заменены ли заглушки)
export function isConfigured() {
    return Object.values(firebaseConfig).every((v) => typeof v === 'string' && v && !v.includes('YOUR_'));
}