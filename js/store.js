// Хранилище данных.
// Все данные лежат в одном объекте (state), как дерево:
//   schedule/{id}, tasks/{id}, study/{id}, fridge/{id}, mealPlan/{день},
//   meals/{дата}/{id}, workouts/{id}, steps/{дата}, notes/{id},
//   profile, weekly/{неделя}
// Что делает модуль:
//   1) сохраняет копию в localStorage (работает без сети и без Firebase);
//   2) если пользователь вошёл — зеркалит изменения в Firebase по пути users/{uid}/...

import { session } from './session.js';
import { buildDefaults } from './defaults.js';
import { newId } from './utils.js';

const PREFIX = 'dayflow:data:';
let storageKey = 'local';
let state = {};
let remoteUid = null;
let stopListening = null;
const listeners = new Set();

export const hooks = { onRemoteError: null };

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify(source) {
  listeners.forEach((fn) => fn(source));
}

function saveLocal() {
  try {
    localStorage.setItem(PREFIX + storageKey, JSON.stringify(state));
  } catch (err) {
    console.warn('localStorage недоступен:', err);
  }
}

// Загрузить данные пользователя из локальной копии
export function load(key) {
  storageKey = key;
  try {
    state = JSON.parse(localStorage.getItem(PREFIX + key)) || {};
  } catch {
    state = {};
  }
  if (!state.meta || !state.meta.seeded) {
    state.schedule = buildDefaults(newId);
    state.meta = { ...(state.meta || {}), seeded: true };
    saveLocal();
  }
  notify('local');
}

function report(err) {
  console.warn('Firebase:', err);
  if (hooks.onRemoteError) hooks.onRemoteError(err);
}

// Включить синхронизацию с Firebase для пользователя uid
export function connect(uid) {
  disconnect();
  const fb = session.firebase;
  if (!fb) return;
  remoteUid = uid;
  const ref = fb.dbApi.ref(fb.db, `users/${uid}`);
  stopListening = fb.dbApi.onValue(
    ref,
    (snap) => {
      const value = snap.val();
      if (value === null) {
        // В облаке пока пусто — отправляем то, что есть локально
        fb.dbApi.set(ref, state).catch(report);
      } else {
        state = value;
        if (!state.meta) state.meta = { seeded: true };
        saveLocal();
        notify('remote');
      }
    },
    report
  );
}

export function disconnect() {
  if (stopListening) stopListening();
  stopListening = null;
  remoteUid = null;
}

const split = (path) => path.split('/').filter(Boolean);

// Прочитать значение по пути ('tasks/abc123')
export function get(path, fallback = null) {
  let cur = state;
  for (const key of split(path)) {
    if (cur === null || typeof cur !== 'object') return fallback;
    cur = cur[key];
  }
  return cur === undefined || cur === null ? fallback : cur;
}

// Записать значение по пути. null — удалить.
export function set(path, value) {
  const clean = value === undefined || value === null ? null : JSON.parse(JSON.stringify(value));
  const keys = split(path);
  let cur = state;
  for (let i = 0; i < keys.length - 1; i++) {
    if (typeof cur[keys[i]] !== 'object' || cur[keys[i]] === null) cur[keys[i]] = {};
    cur = cur[keys[i]];
  }
  const last = keys[keys.length - 1];
  if (clean === null) delete cur[last];
  else cur[last] = clean;

  saveLocal();

  const fb = session.firebase;
  if (fb && remoteUid) {
    fb.dbApi.set(fb.dbApi.ref(fb.db, `users/${remoteUid}/${path}`), clean).catch(report);
  }
  notify('local');
}

export function remove(path) {
  set(path, null);
}

// Объект-словарь { id: {...} } -> массив [{ id, ... }]
export function list(path) {
  const obj = get(path, {});
  return Object.entries(obj).map(([id, value]) => ({ id, ...value }));
}
