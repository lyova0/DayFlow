// Подключение Firebase (Authentication + Realtime Database).
// SDK загружается с официального CDN только если config.js заполнен.
// Если загрузка не удалась (нет сети) — приложение работает локально.

import { firebaseConfig, isConfigured } from './config.js';
import { session } from './session.js';

const VERSION = '10.14.1';
const BASE = `https://www.gstatic.com/firebasejs/${VERSION}/`;

export async function initFirebase() {
  if (!isConfigured()) return null;
  try {
    const [appApi, authApi, dbApi] = await Promise.all([
      import(BASE + 'firebase-app.js'),
      import(BASE + 'firebase-auth.js'),
      import(BASE + 'firebase-database.js')
    ]);
    const app = appApi.initializeApp(firebaseConfig);
    session.firebase = {
      auth: authApi.getAuth(app),
      db: dbApi.getDatabase(app),
      authApi,
      dbApi
    };
    return session.firebase;
  } catch (err) {
    console.warn('Не удалось загрузить Firebase:', err);
    session.firebaseError = err;
    return null;
  }
}
