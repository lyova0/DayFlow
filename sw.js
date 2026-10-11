// Service worker: даёт PWA работу без сети.
// Свои файлы — «сначала сеть, потом кэш» (правки видны сразу, офлайн тоже работает).
// Скрипты Firebase с gstatic — «сначала кэш», чтобы вход работал офлайн.

const CACHE = 'dayflow-v2';

const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/styles.css',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'js/main.js',
  'js/config.js',
  'js/session.js',
  'js/firebase.js',
  'js/auth.js',
  'js/store.js',
  'js/utils.js',
  'js/ui.js',
  'js/ai.js',
  'js/defaults.js',
  'js/schedule-data.js',
  'js/views/home.js',
  'js/views/schedule.js',
  'js/views/study.js',
  'js/views/food.js',
  'js/views/more.js',
  'js/views/gym.js',
  'js/views/activity.js',
  'js/views/notes.js',
  'js/views/profile.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Библиотеки Firebase: кэш first
  if (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }))
    );
    return;
  }

  // Остальные внешние запросы (Firebase API и т.д.) не трогаем
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() =>
        caches.match(req, { ignoreSearch: true }).then((cached) => cached || caches.match('index.html'))
      )
  );
});
