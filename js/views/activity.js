// Активность: шаги вводятся вручную. Apple Health НЕ подключён.

import * as store from '../store.js';
import { pageHead, formSheet, ask, empty, toast } from '../ui.js';
import { esc, dateKey, addDays, parseKey, formatShort, formatNumber, DAYS_SHORT } from '../utils.js';

function openStepsForm(existingKey) {
  const current = existingKey ? store.get('steps/' + existingKey, '') : '';
  formSheet({
    title: existingKey ? 'Изменить запись' : 'Новая запись',
    values: { date: existingKey || dateKey(new Date()), steps: current },
    fields: [
      { name: 'date', label: 'Дата', type: 'date', required: true },
      { name: 'steps', label: 'Шаги', type: 'number', required: true, step: 1, min: 0 }
    ],
    onSubmit(data) {
      if (existingKey && data.date !== existingKey) store.remove('steps/' + existingKey);
      store.set('steps/' + data.date, Math.round(data.steps));
    },
    onDelete: existingKey
      ? () => {
          if (!ask('Удалить запись?')) return false;
          store.remove('steps/' + existingKey);
        }
      : null
  });
}

export function render(root) {
  const now = new Date();
  const todayKey = dateKey(now);
  const goal = store.get('profile/stepGoal', 8000);
  const steps = store.get('steps', {});
  const today = steps[todayKey] || 0;
  const pct = Math.min(100, Math.round((today / goal) * 100));

  // Последние 7 дней
  const week = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(now, -i);
    week.push({ key: dateKey(d), label: DAYS_SHORT[d.getDay()], value: steps[dateKey(d)] || 0 });
  }
  const max = Math.max(goal, ...week.map((d) => d.value));
  const bars = week
    .map(
      (d) => `
      <div class="bar${d.key === todayKey ? ' today' : ''}">
        <i style="height:${Math.round((d.value / max) * 100)}%"></i>
        <span>${d.label}</span>
      </div>`
    )
    .join('');

  const history = Object.entries(steps)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 14)
    .map(
      ([key, value]) => `
      <div class="row" data-edit-steps="${key}">
        <div class="row-main"><div class="row-title">${esc(formatShort(parseKey(key)))}</div></div>
        <div class="row-time">${formatNumber(value)}</div>
      </div>`
    )
    .join('');

  root.innerHTML = `
    ${pageHead('Активность', '<button class="btn small primary" data-add>+ Запись</button>')}

    <section class="card">
      <div class="muted small-text">Шаги сегодня</div>
      <div class="big-number">${formatNumber(today)}</div>
      <div class="progress"><i style="width:${pct}%"></i></div>
      <div class="muted small-text">Цель: ${formatNumber(goal)} · ${pct}%</div>
      <form class="inline-form" data-form="steps">
        <input type="number" name="steps" inputmode="numeric" min="0" step="1" placeholder="Шаги за сегодня" value="${today || ''}" required>
        <button class="btn primary">Сохранить</button>
      </form>
    </section>

    <section class="card">
      <div class="card-head"><h2>Последние 7 дней</h2></div>
      <div class="bars">${bars}</div>
    </section>

    <section class="card">
      <div class="card-head"><h2>История</h2></div>
      ${history || empty('Записей пока нет')}
    </section>

    <section class="card note-card">Шаги вводятся вручную. Синхронизация с Apple Health пока не подключена.</section>`;

  root.onsubmit = (e) => {
    if (e.target.dataset.form !== 'steps') return;
    e.preventDefault();
    const value = Number(e.target.elements.steps.value);
    if (Number.isNaN(value) || value < 0) return;
    store.set('steps/' + todayKey, Math.round(value));
    toast('Сохранено');
  };

  root.onclick = (e) => {
    if (e.target.closest('[data-add]')) { openStepsForm(null); return; }
    const edit = e.target.closest('[data-edit-steps]');
    if (edit) openStepsForm(edit.dataset.editSteps);
  };
}
