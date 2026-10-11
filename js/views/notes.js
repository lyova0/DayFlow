// Заметки: создание, редактирование, удаление.

import * as store from '../store.js';
import { pageHead, formSheet, ask, empty, toast } from '../ui.js';
import { esc, newId, formatShort } from '../utils.js';

function openNoteForm(note) {
  formSheet({
    title: note ? 'Заметка' : 'Новая заметка',
    values: note || {},
    fields: [
      { name: 'title', label: 'Заголовок', type: 'text' },
      { name: 'text', label: 'Текст', type: 'textarea', rows: 10 }
    ],
    onSubmit(data) {
      if (!data.title && !data.text) {
        toast('Заметка пустая');
        return false;
      }
      store.set('notes/' + (note ? note.id : newId()), {
        title: data.title,
        text: data.text,
        updated: Date.now()
      });
    },
    onDelete: note
      ? () => {
          if (!ask('Удалить заметку?')) return false;
          store.remove('notes/' + note.id);
        }
      : null
  });
}

export function render(root) {
  const notes = store.list('notes').sort((a, b) => (b.updated || 0) - (a.updated || 0));

  const cards = notes.length
    ? notes
        .map((n) => {
          const title = n.title || (n.text || '').split('\n')[0];
          const preview = n.title ? (n.text || '').replace(/\s+/g, ' ').slice(0, 90) : '';
          return `
      <section class="card">
        <div class="row" data-edit-note="${n.id}" style="border-top:0;padding:0">
          <div class="row-main">
            <div class="row-title">${esc(title)}</div>
            ${preview ? `<div class="row-sub">${esc(preview)}</div>` : ''}
            <div class="row-sub">${esc(formatShort(new Date(n.updated || Date.now())))}</div>
          </div>
        </div>
      </section>`;
        })
        .join('')
    : `<section class="card">${empty('Заметок пока нет')}</section>`;

  root.innerHTML = `${pageHead('Заметки', '<button class="btn small primary" data-add>+ Заметка</button>')}${cards}`;

  root.onclick = (e) => {
    if (e.target.closest('[data-add]')) { openNoteForm(null); return; }
    const edit = e.target.closest('[data-edit-note]');
    if (edit) {
      const note = store.list('notes').find((n) => n.id === edit.dataset.editNote);
      if (note) openNoteForm(note);
    }
  };
}
