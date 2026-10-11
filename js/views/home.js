// Главная: расписание на сегодня, ближайшие события, задачи.

import * as store from '../store.js';
import { esc, dateKey, addDays, formatLong, timeToMin, newId, formatNumber, DAYS } from '../utils.js';
import { eventsForDate, eventRow } from '../schedule-data.js';
import { empty } from '../ui.js';

function greeting(hour) {
  if (hour < 5) return 'Доброй ночи';
  if (hour < 12) return 'Доброе утро';
  if (hour < 18) return 'Добрый день';
  return 'Добрый вечер';
}

export function render(root) {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const name = store.get('profile/name', '');
  const goal = store.get('profile/stepGoal', 8000);

  // --- Сегодня ---
  const todayEvents = eventsForDate(now);
  const nextToday = todayEvents.find((e) => e.time && timeToMin(e.time) >= nowMin);
  const todayHtml = todayEvents.length
    ? todayEvents
        .map((e) => eventRow(e, { past: !!e.time && timeToMin(e.time) < nowMin, next: nextToday && nextToday.id === e.id }))
        .join('')
    : empty(now.getDay() === 0 ? 'Свободный день' : 'Сегодня событий нет');

  // --- Ближайшие (до 4 штук в ближайшие 7 дней) ---
  const upcoming = [];
  for (let i = 0; i <= 7 && upcoming.length < 4; i++) {
    const d = addDays(now, i);
    for (const e of eventsForDate(d)) {
      if (i === 0 && (!e.time || timeToMin(e.time) < nowMin)) continue;
      const when = i === 0 ? 'Сегодня' : i === 1 ? 'Завтра' : DAYS[d.getDay()];
      upcoming.push({ ...e, when });
      if (upcoming.length >= 4) break;
    }
  }
  const upcomingHtml = upcoming.length
    ? upcoming
        .map(
          (e) => `
      <div class="row">
        <span class="dot dot-${esc(e.kind || 'other')}"></span>
        <div class="row-main"><div class="row-title">${esc(e.title)}</div><div class="row-sub">${esc(e.when)}</div></div>
        <div class="row-time">${e.time ? esc(e.time) : '<span class="muted small-text">время уточняется</span>'}</div>
      </div>`
        )
        .join('')
    : empty('Ближайших событий нет');

  // --- Задачи ---
  const tasks = store.list('tasks').sort((a, b) => (a.done - b.done) || ((a.created || 0) - (b.created || 0)));
  const tasksHtml = tasks.length
    ? tasks
        .map(
          (t) => `
      <div class="row">
        <label class="check"><input type="checkbox" data-toggle-task="${t.id}" ${t.done ? 'checked' : ''}><span></span></label>
        <div class="row-main ${t.done ? 'done' : ''}"><div class="row-title">${esc(t.title)}</div></div>
        <button class="icon-btn quiet" data-del-task="${t.id}" aria-label="Удалить">✕</button>
      </div>`
        )
        .join('')
    : empty('Задач пока нет');

  // --- Плитки ---
  const steps = store.get('steps/' + dateKey(now), 0);
  const openStudy = store.list('study').filter((t) => !t.done).length;

  root.innerHTML = `
    <div class="hello">
      <div class="date">${esc(formatLong(now))}</div>
      <h1>${greeting(now.getHours())}${name ? ', ' + esc(name) : ''}</h1>
    </div>

    <div class="tiles">
      <a class="tile" href="#/activity">
        <div class="tile-label">Шаги сегодня</div>
        <div class="tile-value">${formatNumber(steps)}</div>
        <div class="tile-sub">цель ${formatNumber(goal)}</div>
      </a>
      <a class="tile" href="#/study">
        <div class="tile-label">Учёба</div>
        <div class="tile-value">${openStudy}</div>
        <div class="tile-sub">открытых задач</div>
      </a>
    </div>

    <section class="card">
      <div class="card-head"><h2>Сегодня</h2></div>
      ${todayHtml}
    </section>

    <section class="card">
      <div class="card-head"><h2>Ближайшие события</h2></div>
      ${upcomingHtml}
    </section>

    <section class="card">
      <div class="card-head"><h2>Задачи</h2></div>
      ${tasksHtml}
      <form class="inline-form" data-form="task">
        <input type="text" name="title" placeholder="Новая задача" autocomplete="off" required>
        <button class="btn primary" aria-label="Добавить задачу">+</button>
      </form>
    </section>`;

  root.onsubmit = (e) => {
    if (e.target.dataset.form !== 'task') return;
    e.preventDefault();
    const title = e.target.elements.title.value.trim();
    if (!title) return;
    store.set('tasks/' + newId(), { title, done: false, created: Date.now() });
  };

  root.onchange = (e) => {
    const box = e.target.closest('[data-toggle-task]');
    if (box) store.set(`tasks/${box.dataset.toggleTask}/done`, box.checked);
  };

  root.onclick = (e) => {
    const del = e.target.closest('[data-del-task]');
    if (del) store.remove('tasks/' + del.dataset.delTask);
  };
}
