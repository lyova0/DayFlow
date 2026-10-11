// Точка входа: запуск Firebase, выбор режима (облако / локально),
// маршрутизация по хэшу (#/home, #/schedule, ...) и отрисовка экранов.

import { session } from './session.js';
import { initFirebase } from './firebase.js';
import * as auth from './auth.js';
import * as store from './store.js';
import { toast, closeSheet } from './ui.js';

import * as home from './views/home.js';
import * as schedule from './views/schedule.js';
import * as study from './views/study.js';
import * as food from './views/food.js';
import * as more from './views/more.js';
import * as gym from './views/gym.js';
import * as activity from './views/activity.js';
import * as notes from './views/notes.js';
import * as profile from './views/profile.js';

const ROUTES = { home, schedule, study, food, more, gym, activity, notes, profile };
// Какой пункт нижнего меню подсвечивать для вложенных экранов
const NAV_GROUP = { gym: 'more', activity: 'more', notes: 'more', profile: 'more' };

const view = document.getElementById('view');
let current = 'home';
let ready = false;

function parseRoute() {
  const name = location.hash.replace(/^#\//, '');
  return ROUTES[name] ? name : 'home';
}

function render(resetScroll = false) {
  // Сбрасываем обработчики предыдущего экрана
  view.onclick = view.onchange = view.onsubmit = null;
  ROUTES[current].render(view);

  const active = NAV_GROUP[current] || current;
  document.querySelectorAll('.nav a').forEach((a) => {
    a.classList.toggle('active', a.dataset.route === active);
  });
  if (resetScroll) window.scrollTo(0, 0);
}

function startApp() {
  ready = true;
  current = parseRoute();
  render(true);
}

window.addEventListener('hashchange', () => {
  if (!ready) return;
  current = parseRoute();
  closeSheet();
  render(true);
});

// Перерисовываем экран при каждом изменении данных
store.subscribe((source) => {
  if (!ready) return;
  const el = document.activeElement;
  const typing = el && view.contains(el) && /INPUT|TEXTAREA|SELECT/.test(el.tagName);
  // Не мешаем вводу, если данные пришли из облака
  if (source === 'remote' && typing) return;
  render(false);
});

store.hooks.onRemoteError = (err) => {
  const denied = String(err && err.message).toLowerCase().includes('permission');
  toast(denied ? 'Нет доступа к базе. Проверьте правила Firebase.' : 'Не удалось синхронизировать с облаком');
};

function startLocal() {
  session.user = null;
  store.disconnect();
  store.load('local');
  startApp();
}
auth.hooks.onLocal = startLocal;

async function boot() {
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch((err) => console.warn('SW:', err));
  }

  const fb = await initFirebase();

  if (!fb) {
    if (session.firebaseError) toast('Облако недоступно — работаю локально');
    startLocal();
    return;
  }

  auth.watch((user) => {
    if (user) {
      session.user = user;
      auth.hideAuth();
      store.load('user-' + user.uid);
      store.connect(user.uid);
      startApp();
    } else {
      session.user = null;
      store.disconnect();
      if (localStorage.getItem('dayflow:mode') === 'local') startLocal();
      else auth.showAuth();
    }
  });
}

boot();
