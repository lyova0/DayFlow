// Общие элементы интерфейса: заголовок страницы, всплывающее сообщение,
// нижний лист с формой (formSheet).

import { esc } from './utils.js';

const sheetRoot = document.getElementById('sheet-root');
const toastEl = document.getElementById('toast');
let toastTimer = null;

export function toast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2400);
}

export function ask(message) {
  return window.confirm(message);
}

export function pageHead(title, actionHtml = '') {
  return `<header class="page-head"><h1>${esc(title)}</h1>${actionHtml}</header>`;
}

export function empty(text) {
  return `<p class="empty">${esc(text)}</p>`;
}

// ---------- Нижний лист ----------

export function openSheet(html, onMount) {
  sheetRoot.innerHTML = `<div class="backdrop"></div><div class="sheet" role="dialog" aria-modal="true"><div class="sheet-grip"></div>${html}</div>`;
  sheetRoot.classList.add('open');
  document.body.classList.add('no-scroll');
  sheetRoot.querySelector('.backdrop').onclick = closeSheet;
  if (onMount) onMount(sheetRoot.querySelector('.sheet'));
}

export function closeSheet() {
  sheetRoot.classList.remove('open');
  sheetRoot.innerHTML = '';
  document.body.classList.remove('no-scroll');
}

// ---------- Универсальная форма ----------
// fields: [{ name, label, type, required, options, placeholder, step, min, rows, showIf }]
// type: text | number | date | time | select | textarea
// showIf: { name: 'repeat', value: 'once' } — показать поле только при таком значении другого поля
// onSubmit(data) — вернуть false, чтобы не закрывать форму.
// onDelete() — если задан, появляется кнопка «Удалить».

function fieldHtml(f, value) {
  const v = value ?? f.default ?? '';
  const req = f.required ? 'required' : '';
  const ph = esc(f.placeholder || '');
  let input;

  if (f.type === 'textarea') {
    input = `<textarea name="${f.name}" rows="${f.rows || 5}" placeholder="${ph}" ${req}>${esc(v)}</textarea>`;
  } else if (f.type === 'select') {
    const opts = f.options
      .map((o) => `<option value="${esc(o.value)}" ${String(o.value) === String(v) ? 'selected' : ''}>${esc(o.label)}</option>`)
      .join('');
    input = `<select name="${f.name}">${opts}</select>`;
  } else if (f.type === 'number') {
    const min = f.min !== undefined ? `min="${f.min}"` : '';
    input = `<input name="${f.name}" type="number" inputmode="decimal" step="${f.step || 'any'}" ${min} value="${esc(v)}" placeholder="${ph}" ${req}>`;
  } else {
    input = `<input name="${f.name}" type="${f.type || 'text'}" value="${esc(v)}" placeholder="${ph}" autocomplete="off" ${req}>`;
  }

  const show = f.showIf ? ` data-show-if="${f.showIf.name}=${f.showIf.value}"` : '';
  return `<label class="field"${show}><span>${esc(f.label)}</span>${input}</label>`;
}

export function formSheet({ title, fields, values = {}, submitText = 'Сохранить', onSubmit, onDelete }) {
  const html = `
    <form class="sheet-form">
      <h2>${esc(title)}</h2>
      ${fields.map((f) => fieldHtml(f, values[f.name])).join('')}
      <div class="sheet-actions">
        <button type="submit" class="btn primary">${esc(submitText)}</button>
        ${onDelete ? '<button type="button" class="btn danger" data-delete>Удалить</button>' : ''}
        <button type="button" class="btn ghost" data-cancel>Отмена</button>
      </div>
    </form>`;

  openSheet(html, (sheet) => {
    const form = sheet.querySelector('form');

    // Показ/скрытие зависимых полей
    const applyVisibility = () => {
      form.querySelectorAll('[data-show-if]').forEach((label) => {
        const [name, expected] = label.dataset.showIf.split('=');
        const visible = form.elements[name] && form.elements[name].value === expected;
        label.hidden = !visible;
        label.querySelectorAll('input,select,textarea').forEach((c) => { c.disabled = !visible; });
      });
    };
    form.addEventListener('change', applyVisibility);
    applyVisibility();

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = {};
      for (const f of fields) {
        const el = form.elements[f.name];
        if (!el || el.disabled) continue;
        let v = el.value.trim();
        if (f.type === 'number') v = v === '' ? null : Number(v.replace(',', '.'));
        data[f.name] = v;
      }
      if (onSubmit(data) !== false) closeSheet();
    });

    form.querySelector('[data-cancel]').onclick = closeSheet;
    const del = form.querySelector('[data-delete]');
    if (del) del.onclick = () => { if (onDelete() !== false) closeSheet(); };

    const first = form.querySelector('input:not([disabled]),textarea,select');
    if (first && !values.title && first.type === 'text') setTimeout(() => first.focus(), 50);
  });
}
