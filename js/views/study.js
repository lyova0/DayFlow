// Учёба: задачи по математике и английскому.

import * as store from '../store.js';
import { pageHead, formSheet, ask, empty } from '../ui.js';
import { esc, newId, dateKey, parseKey, formatShort } from '../utils.js';

const SUBJECTS = [
  { value: 'math', label: 'Математика' },
  { value: 'english', label: 'Английский' }
];
const label = (value) => (SUBJECTS.find((s) => s.value === value) || {}).label || '';

let filter = 'all'; // all | math | english

function openTaskForm(task) {
  formSheet({
    title: task ? 'Изменить задачу' : 'Новая задача',
    values: task || { subject: filter === 'english' ? 'english' : 'math' },
    fields: [
      { name: 'title', label: 'Что нужно сделать', type: 'text', required: true },
      { name: 'subject', label: 'Предмет', type: 'select', options: SUBJECTS },
      { name: 'due', label: 'Срок (необязательно)', type: 'date' }
    ],
    onSubmit(data) {
      const id = task ? task.id : newId();
      store.set('study/' + id, {
        title: data.title,
        subject: data.subject,
        due: data.due || '',
        done: task ? !!task.done : false,
        created: task ? task.created || Date.now() : Date.now()
      });
    },
    onDelete: task
      ? () => {
          if (!ask('Удалить задачу?')) return false;
          store.remove('study/' + task.id);
        }
      : null
  });
}

function row(t, todayKey) {
  const overdue = !t.done && t.due && t.due < todayKey;
  const due = t.due ? `<span class="${overdue ? 'overdue' : ''}"> · до ${esc(formatShort(parseKey(t.due)))}</span>` : '';
  return `
    <div class="row">
      <label class="check"><input type="checkbox" data-toggle="${t.id}" ${t.done ? 'checked' : ''}><span></span></label>
      <div class="row-main ${t.done ? 'done' : ''}" data-edit="${t.id}">
        <div class="row-title">${esc(t.title)}</div>
        <div class="row-sub">${esc(label(t.subject))}${due}</div>
      </div>
    </div>`;
}

export function render(root) {
  const todayKey = dateKey(new Date());
  const items = store.list('study').filter((t) => filter === 'all' || t.subject === filter);

  const open = items
    .filter((t) => !t.done)
    .sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999') || (a.created || 0) - (b.created || 0));
  const done = items.filter((t) => t.done).sort((a, b) => (b.created || 0) - (a.created || 0));

  const seg = [{ value: 'all', label: 'Все' }, ...SUBJECTS]
    .map((s) => `<button data-filter="${s.value}" class="${filter === s.value ? 'active' : ''}">${esc(s.label)}</button>`)
    .join('');

  root.innerHTML = `
    ${pageHead('Учёба', '<button class="btn small primary" data-add>+ Задача</button>')}
    <div class="segmented">${seg}</div>

    <section class="card">
      <div class="card-head"><h2>Нужно сделать</h2></div>
      ${open.length ? open.map((t) => row(t, todayKey)).join('') : empty('Открытых задач нет')}
    </section>

    ${done.length ? `<section class="card"><div class="card-head"><h2>Готово</h2></div>${done.map((t) => row(t, todayKey)).join('')}</section>` : ''}`;

  root.onclick = (e) => {
    const f = e.target.closest('[data-filter]');
    if (f) { filter = f.dataset.filter; render(root); return; }
    if (e.target.closest('[data-add]')) { openTaskForm(null); return; }
    const edit = e.target.closest('[data-edit]');
    if (edit) {
      const task = store.list('study').find((t) => t.id === edit.dataset.edit);
      if (task) openTaskForm(task);
    }
  };

  root.onchange = (e) => {
    const box = e.target.closest('[data-toggle]');
    if (box) store.set(`study/${box.dataset.toggle}/done`, box.checked);
  };
}
