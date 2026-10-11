// Работа с расписанием: какие события выпадают на дату и как их показывать.
// Используется на «Главной» и в «Расписании».

import * as store from './store.js';
import { dateKey, esc, timeToMin, formatShort, parseKey } from './utils.js';

export const KINDS = [
  { value: 'school', label: 'Школа' },
  { value: 'math', label: 'Математика' },
  { value: 'english', label: 'Английский' },
  { value: 'gym', label: 'Тренажёрный зал' },
  { value: 'swim', label: 'Плавание' },
  { value: 'other', label: 'Другое' }
];

// События без времени идут в конце дня
export function byTime(a, b) {
  const ta = timeToMin(a.time);
  const tb = timeToMin(b.time);
  if (ta === null && tb === null) return 0;
  if (ta === null) return 1;
  if (tb === null) return -1;
  return ta - tb;
}

// События на конкретную дату: еженедельные (по дню недели) и разовые (по дате)
export function eventsForDate(date) {
  const key = dateKey(date);
  return store
    .list('schedule')
    .filter((e) => (e.repeat === 'once' ? e.date === key : Number(e.day) === date.getDay()))
    .sort(byTime);
}

// HTML одной строки события
export function eventRow(e, { past = false, next = false } = {}) {
  const sub = e.repeat === 'once' && e.date ? `<div class="row-sub">Разовое · ${esc(formatShort(parseKey(e.date)))}</div>` : '';
  const time = e.time ? esc(e.time) : '<span class="muted small-text">время уточняется</span>';
  return `
    <div class="row${past ? ' past' : ''}${next ? ' next' : ''}" data-edit-event="${e.id}">
      <span class="dot dot-${esc(e.kind || 'other')}"></span>
      <div class="row-main"><div class="row-title">${esc(e.title)}</div>${sub}</div>
      <div class="row-time">${time}</div>
    </div>`;
}
