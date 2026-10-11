// Зал: тренировки -> упражнения -> подходы (повторения и вес).

import * as store from '../store.js';
import { pageHead, formSheet, ask, empty } from '../ui.js';
import { esc, newId, dateKey, parseKey, formatShort, formatNumber } from '../utils.js';

let openId = null; // id открытой тренировки (null — показываем список)

const byCreated = (a, b) => (a.created || 0) - (b.created || 0);
const exercisesOf = (w) => Object.entries(w.exercises || {}).map(([id, x]) => ({ id, ...x })).sort(byCreated);
const setsOf = (x) => Object.entries(x.sets || {}).map(([id, s]) => ({ id, ...s })).sort(byCreated);
const setLabel = (s) => (s.weight != null ? `${s.reps} × ${formatNumber(s.weight)} кг` : `${s.reps} повт.`);

// ---------- Формы ----------

function openWorkoutForm(workout) {
  formSheet({
    title: workout ? 'Изменить тренировку' : 'Новая тренировка',
    values: workout || { title: 'Тренировка', date: dateKey(new Date()) },
    fields: [
      { name: 'title', label: 'Название', type: 'text', required: true },
      { name: 'date', label: 'Дата', type: 'date', required: true }
    ],
    onSubmit(data) {
      if (workout) {
        store.set(`workouts/${workout.id}/title`, data.title);
        store.set(`workouts/${workout.id}/date`, data.date);
      } else {
        const id = newId();
        openId = id; // сразу откроем созданную тренировку
        store.set('workouts/' + id, { title: data.title, date: data.date, created: Date.now() });
      }
    },
    onDelete: workout
      ? () => {
          if (!ask('Удалить тренировку целиком?')) return false;
          openId = null;
          store.remove('workouts/' + workout.id);
        }
      : null
  });
}

function openExerciseForm(workoutId, exercise) {
  formSheet({
    title: exercise ? 'Изменить упражнение' : 'Новое упражнение',
    values: exercise || {},
    fields: [{ name: 'name', label: 'Название упражнения', type: 'text', required: true }],
    onSubmit(data) {
      if (exercise) store.set(`workouts/${workoutId}/exercises/${exercise.id}/name`, data.name);
      else store.set(`workouts/${workoutId}/exercises/${newId()}`, { name: data.name, created: Date.now() });
    },
    onDelete: exercise
      ? () => {
          if (!ask('Удалить упражнение и все подходы?')) return false;
          store.remove(`workouts/${workoutId}/exercises/${exercise.id}`);
        }
      : null
  });
}

function openSetForm(workoutId, exerciseId, set) {
  formSheet({
    title: set ? 'Изменить подход' : 'Новый подход',
    values: set || {},
    fields: [
      { name: 'reps', label: 'Повторения', type: 'number', required: true, step: 1, min: 1 },
      { name: 'weight', label: 'Вес, кг (необязательно)', type: 'number', min: 0 }
    ],
    onSubmit(data) {
      const out = { reps: data.reps, created: set ? set.created || Date.now() : Date.now() };
      if (data.weight !== null) out.weight = data.weight;
      store.set(`workouts/${workoutId}/exercises/${exerciseId}/sets/${set ? set.id : newId()}`, out);
    },
    onDelete: set
      ? () => {
          if (!ask('Удалить подход?')) return false;
          store.remove(`workouts/${workoutId}/exercises/${exerciseId}/sets/${set.id}`);
        }
      : null
  });
}

// ---------- Экраны ----------

function renderList(root, workouts) {
  const sorted = [...workouts].sort((a, b) => (b.date || '').localeCompare(a.date || '') || byCreated(b, a));
  const cards = sorted.length
    ? sorted
        .map((w) => {
          const ex = exercisesOf(w);
          const sets = ex.reduce((n, x) => n + setsOf(x).length, 0);
          return `
      <section class="card">
        <div class="row" data-open="${w.id}" style="border-top:0;padding:0">
          <div class="row-main">
            <div class="row-title">${esc(w.title)}</div>
            <div class="row-sub">${esc(w.date ? formatShort(parseKey(w.date)) : '')} · ${ex.length} упр. · ${sets} подх.</div>
          </div>
          <span class="muted">›</span>
        </div>
      </section>`;
        })
        .join('')
    : `<section class="card">${empty('Тренировок пока нет. Нажмите «+ Тренировка».')}</section>`;

  root.innerHTML = `${pageHead('Зал', '<button class="btn small primary" data-new>+ Тренировка</button>')}${cards}`;
}

function renderDetail(root, w) {
  const exercises = exercisesOf(w);
  const cards = exercises.length
    ? exercises
        .map((x) => {
          const chips = setsOf(x)
            .map((s) => `<button class="chip" data-set="${s.id}" data-ex="${x.id}">${esc(setLabel(s))}</button>`)
            .join('');
          return `
      <section class="card">
        <div class="card-head"><h2>${esc(x.name)}</h2><button class="icon-btn quiet" data-edit-ex="${x.id}" aria-label="Изменить">✎</button></div>
        <div class="chips">${chips || '<span class="muted small-text">Подходов пока нет</span>'}</div>
        <button class="btn small" data-add-set="${x.id}">+ Подход</button>
      </section>`;
        })
        .join('')
    : `<section class="card">${empty('Добавьте первое упражнение')}</section>`;

  root.innerHTML = `
    <button class="btn ghost small" data-back>‹ Все тренировки</button>
    ${pageHead(w.title, '<button class="btn small" data-edit-workout>Изменить</button>')}
    <p class="muted" style="margin:-8px 0 14px">${esc(w.date ? formatShort(parseKey(w.date)) : '')}</p>
    ${cards}
    <button class="btn primary block" data-add-ex>+ Упражнение</button>`;
}

export function render(root) {
  const workouts = store.list('workouts');
  const current = openId ? workouts.find((w) => w.id === openId) : null;
  if (openId && !current) openId = null;

  if (current) renderDetail(root, current);
  else renderList(root, workouts);

  root.onclick = (e) => {
    const w = openId ? store.list('workouts').find((x) => x.id === openId) : null;

    if (e.target.closest('[data-new]')) { openWorkoutForm(null); return; }

    const open = e.target.closest('[data-open]');
    if (open) { openId = open.dataset.open; render(root); window.scrollTo(0, 0); return; }

    if (!w) return;

    if (e.target.closest('[data-back]')) { openId = null; render(root); return; }
    if (e.target.closest('[data-edit-workout]')) { openWorkoutForm(w); return; }
    if (e.target.closest('[data-add-ex]')) { openExerciseForm(w.id, null); return; }

    const editEx = e.target.closest('[data-edit-ex]');
    if (editEx) {
      const x = exercisesOf(w).find((i) => i.id === editEx.dataset.editEx);
      if (x) openExerciseForm(w.id, x);
      return;
    }

    const addSet = e.target.closest('[data-add-set]');
    if (addSet) { openSetForm(w.id, addSet.dataset.addSet, null); return; }

    const setBtn = e.target.closest('[data-set]');
    if (setBtn) {
      const x = exercisesOf(w).find((i) => i.id === setBtn.dataset.ex);
      const s = x && setsOf(x).find((i) => i.id === setBtn.dataset.set);
      if (s) openSetForm(w.id, x.id, s);
    }
  };
}
