// Расписание: неделя, повторяющиеся и разовые события, редактирование.

import * as store from '../store.js';
import { pageHead, formSheet, ask, empty } from '../ui.js';
import { DAYS, WEEK_ORDER, addDays, startOfWeek, dateKey, parseKey, formatShort, newId, esc } from '../utils.js';
import { KINDS, eventsForDate, eventRow } from '../schedule-data.js';

let weekOffset = 0; // 0 — текущая неделя, -1 — прошлая, 1 — следующая

function openEventForm(ev, defaultDate) {
  const base = defaultDate ? parseKey(defaultDate) : new Date();
  const values = ev
    ? {
        ...ev,
        day: String(ev.repeat === 'once' && ev.date ? parseKey(ev.date).getDay() : ev.day),
        date: ev.date || dateKey(base)
      }
    : { title: '', kind: 'other', repeat: 'weekly', day: String(base.getDay()), time: '', date: dateKey(base) };

  formSheet({
    title: ev ? 'Изменить событие' : 'Новое событие',
    values,
    fields: [
      { name: 'title', label: 'Название', type: 'text', required: true },
      { name: 'kind', label: 'Тип', type: 'select', options: KINDS },
      {
        name: 'repeat', label: 'Повтор', type: 'select',
        options: [{ value: 'weekly', label: 'Каждую неделю' }, { value: 'once', label: 'Один раз' }]
      },
      {
        name: 'day', label: 'День недели', type: 'select',
        options: WEEK_ORDER.map((d) => ({ value: String(d), label: DAYS[d] })),
        showIf: { name: 'repeat', value: 'weekly' }
      },
      { name: 'date', label: 'Дата', type: 'date', required: true, showIf: { name: 'repeat', value: 'once' } },
      { name: 'time', label: 'Время (если неизвестно — оставьте пустым)', type: 'time' }
    ],
    onSubmit(data) {
      const out = { title: data.title, kind: data.kind, repeat: data.repeat, time: data.time || '' };
      if (data.repeat === 'once') {
        out.date = data.date;
        out.day = parseKey(data.date).getDay();
      } else {
        out.day = Number(data.day);
      }
      store.set('schedule/' + (ev ? ev.id : newId()), out);
    },
    onDelete: ev
      ? () => {
          if (!ask('Удалить событие?')) return false;
          store.remove('schedule/' + ev.id);
        }
      : null
  });
}

export function render(root) {
  const today = new Date();
  const monday = addDays(startOfWeek(today), weekOffset * 7);
  const sunday = addDays(monday, 6);
  const todayKey = dateKey(today);

  const days = WEEK_ORDER.map((_, i) => {
    const d = addDays(monday, i);
    const events = eventsForDate(d);
    return `
      <section class="card${dateKey(d) === todayKey ? ' today' : ''}">
        <div class="card-head">
          <h2>${DAYS[d.getDay()]}<small>${esc(formatShort(d))}</small></h2>
          <button class="icon-btn" data-add-day="${dateKey(d)}" aria-label="Добавить событие">+</button>
        </div>
        ${events.length ? events.map((e) => eventRow(e)).join('') : empty(d.getDay() === 0 ? 'Свободный день' : 'Нет событий')}
      </section>`;
  });

  root.innerHTML = `
    ${pageHead('Расписание', '<button class="btn small primary" data-add-day="">+ Событие</button>')}
    <div class="week-nav">
      <button class="icon-btn" data-week-step="-1" aria-label="Предыдущая неделя">‹</button>
      <button class="week-label" data-week-reset>${esc(formatShort(monday))} – ${esc(formatShort(sunday))}${weekOffset === 0 ? ' · эта неделя' : ''}</button>
      <button class="icon-btn" data-week-step="1" aria-label="Следующая неделя">›</button>
    </div>
    ${days.join('')}`;

  root.onclick = (e) => {
    const step = e.target.closest('[data-week-step]');
    if (step) { weekOffset += Number(step.dataset.weekStep); render(root); return; }

    if (e.target.closest('[data-week-reset]')) { weekOffset = 0; render(root); return; }

    const add = e.target.closest('[data-add-day]');
    if (add) { openEventForm(null, add.dataset.addDay || null); return; }

    const edit = e.target.closest('[data-edit-event]');
    if (edit) {
      const ev = store.list('schedule').find((x) => x.id === edit.dataset.editEvent);
      if (ev) openEventForm(ev);
    }
  };
}
