// Небольшие вспомогательные функции: даты, экранирование, id.

export const DAYS = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
export const DAYS_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
// Порядок дней в неделе (в JS воскресенье = 0)
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

let counter = 0;
// Уникальный id для новых записей
export function newId() {
  counter += 1;
  return Date.now().toString(36) + counter.toString(36) + Math.random().toString(36).slice(2, 5);
}

// Защита от вставки HTML из пользовательского текста
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

const pad = (n) => String(n).padStart(2, '0');

// Дата -> строка "2026-10-11" (по местному времени)
export function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Строка "2026-10-11" -> Date
export function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d, n) {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() + n);
  return r;
}

// Понедельник той недели, в которую попадает дата
export function startOfWeek(d) {
  return addDays(d, -((d.getDay() + 6) % 7));
}

// "15:30" -> минуты от начала суток (или null, если времени нет)
export function timeToMin(t) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatLong(d) {
  return capitalize(new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }).format(d));
}

export function formatShort(d) {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(d).replace('.', '');
}

export function formatNumber(n) {
  return new Intl.NumberFormat('ru-RU').format(n);
}
