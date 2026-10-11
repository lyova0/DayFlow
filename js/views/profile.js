// Профиль: аккаунт, настройки, еженедельные показатели, статус функций.

import * as store from '../store.js';
import { session } from '../session.js';
import { logout, showAuth } from '../auth.js';
import { isAiConfigured } from '../ai.js';
import { pageHead, formSheet, empty } from '../ui.js';
import { esc, dateKey, startOfWeek, parseKey, formatShort, formatNumber } from '../utils.js';

const MOODS = [
  { value: '', label: 'Не указано' },
  { value: '1', label: '1 — плохо' },
  { value: '2', label: '2 — так себе' },
  { value: '3', label: '3 — нормально' },
  { value: '4', label: '4 — хорошо' },
  { value: '5', label: '5 — отлично' }
];

function openSettingsForm() {
  formSheet({
    title: 'Настройки',
    values: store.get('profile', {}),
    fields: [
      { name: 'name', label: 'Имя', type: 'text' },
      { name: 'stepGoal', label: 'Цель по шагам в день', type: 'number', step: 1, min: 1 },
      { name: 'calorieLimit', label: 'Лимит калорий в день, ккал', type: 'number', step: 50, min: 500 }
    ],
    onSubmit(data) {
      store.set('profile', {
        name: data.name,
        stepGoal: data.stepGoal || 8000,
        calorieLimit: data.calorieLimit || 1600
      });
    }
  });
}

function openWeekForm(weekKey) {
  const current = store.get('weekly/' + weekKey, {});
  formSheet({
    title: 'Неделя с ' + formatShort(parseKey(weekKey)),
    values: { ...current, mood: current.mood ? String(current.mood) : '' },
    fields: [
      { name: 'weight', label: 'Вес, кг', type: 'number', step: 0.1, min: 0 },
      { name: 'sleep', label: 'Сон, часов в сутки (в среднем)', type: 'number', step: 0.1, min: 0 },
      { name: 'mood', label: 'Настроение', type: 'select', options: MOODS },
      { name: 'note', label: 'Комментарий', type: 'textarea', rows: 3 }
    ],
    onSubmit(data) {
      const out = {};
      if (data.weight !== null) out.weight = data.weight;
      if (data.sleep !== null) out.sleep = data.sleep;
      if (data.mood) out.mood = Number(data.mood);
      if (data.note) out.note = data.note;
      store.set('weekly/' + weekKey, Object.keys(out).length ? out : null);
    }
  });
}

function weekSummary(w) {
  const parts = [];
  if (w.weight != null) parts.push(`${formatNumber(w.weight)} кг`);
  if (w.sleep != null) parts.push(`сон ${formatNumber(w.sleep)} ч`);
  if (w.mood) parts.push(`настроение ${w.mood}/5`);
  return parts.join(' · ');
}

export function render(root) {
  const profile = store.get('profile', {});
  const weekKey = dateKey(startOfWeek(new Date()));
  const weekly = store.get('weekly', {});
  const thisWeek = weekly[weekKey];

  // --- Аккаунт ---
  let account;
  if (session.user) {
    account = `
      <div class="status-line"><span>Аккаунт</span><span>${esc(session.user.email || '')}</span></div>
      <div class="status-line"><span>Данные</span><span>Синхронизируются с Firebase</span></div>
      <button class="btn block" data-logout>Выйти</button>`;
  } else if (session.firebase) {
    account = `
      <div class="status-line"><span>Режим</span><span>Локальный (только на этом устройстве)</span></div>
      <button class="btn primary block" data-login>Войти или создать аккаунт</button>`;
  } else {
    account = `
      <div class="status-line"><span>Режим</span><span>Локальный (только на этом устройстве)</span></div>
      <div class="status-line"><span>Firebase</span><span>Не настроен — см. js/config.js</span></div>`;
  }

  // --- История недель ---
  const history = Object.keys(weekly)
    .filter((k) => k !== weekKey)
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 12)
    .map(
      (k) => `
      <div class="row" data-edit-week="${k}">
        <div class="row-main">
          <div class="row-title">Неделя с ${esc(formatShort(parseKey(k)))}</div>
          <div class="row-sub">${esc(weekSummary(weekly[k]))}</div>
        </div>
      </div>`
    )
    .join('');

  root.innerHTML = `
    ${pageHead('Профиль', '<button class="btn small" data-settings>Настройки</button>')}

    <section class="card">
      <div class="card-head"><h2>${profile.name ? esc(profile.name) : 'Без имени'}</h2></div>
      <div class="status-line"><span>Цель по шагам</span><span>${formatNumber(profile.stepGoal || 8000)} в день</span></div>
      <div class="status-line"><span>Лимит калорий</span><span>${formatNumber(profile.calorieLimit || 1600)} ккал в день</span></div>
    </section>

    <section class="card">
      <div class="card-head"><h2>Эта неделя</h2><button class="btn small primary" data-edit-week="${weekKey}">${thisWeek ? 'Изменить' : 'Заполнить'}</button></div>
      <div class="row-sub" style="margin-bottom:4px">С ${esc(formatShort(parseKey(weekKey)))}</div>
      ${thisWeek ? `<div class="row-title">${esc(weekSummary(thisWeek)) || '—'}</div>${thisWeek.note ? `<div class="row-sub">${esc(thisWeek.note)}</div>` : ''}` : empty('Показатели ещё не внесены')}
    </section>

    ${history ? `<section class="card"><div class="card-head"><h2>Прошлые недели</h2></div>${history}</section>` : ''}

    <section class="card">
      <div class="card-head"><h2>Аккаунт</h2></div>
      ${account}
    </section>

    <section class="card">
      <div class="card-head"><h2>Подключения</h2></div>
      <div class="status-line"><span>Шаги из Apple Health</span><span>Не подключено</span></div>
      <div class="status-line"><span>Подбор питания через AI</span><span>${isAiConfigured() ? 'Подключено (Gemini через ваш Worker)' : 'Не подключено — см. worker/README.md'}</span></div>
    </section>`;

  root.onclick = (e) => {
    if (e.target.closest('[data-settings]')) { openSettingsForm(); return; }

    const week = e.target.closest('[data-edit-week]');
    if (week) { openWeekForm(week.dataset.editWeek); return; }

    if (e.target.closest('[data-logout]')) { logout(); return; }

    if (e.target.closest('[data-login]')) {
      localStorage.removeItem('dayflow:mode');
      showAuth();
    }
  };
}
