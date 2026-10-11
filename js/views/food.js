// Питание: холодильник, недельный план с калориями и БЖУ, дневник приёмов пищи.
// План можно составить вручную или попросить ИИ (Gemini через ваш Worker, см. worker/README.md).
//
// Как хранится план: mealPlan/{день}/{приём} = название блюда,
// mealPlan/{день}/nutrition/{приём} = { kcal, protein, fat, carbs }.

import * as store from '../store.js';
import { pageHead, formSheet, openSheet, closeSheet, ask, empty, toast } from '../ui.js';
import { esc, newId, dateKey, DAYS, WEEK_ORDER } from '../utils.js';
import { generateMenu, isAiConfigured } from '../ai.js';

const MEALS = [
  { value: 'breakfast', label: 'Завтрак' },
  { value: 'lunch', label: 'Обед' },
  { value: 'dinner', label: 'Ужин' },
  { value: 'snack', label: 'Перекус' }
];
const mealLabel = (v) => (MEALS.find((m) => m.value === v) || {}).label || v;

const DEFAULT_LIMIT = 1600;
const calorieLimit = () => store.get('profile/calorieLimit', DEFAULT_LIMIT);

let tab = 'fridge'; // fridge | plan | log

// ---------- Калории и БЖУ ----------

function nutrText(n) {
  if (!n || n.kcal == null) return '';
  return `${n.kcal} ккал · Б ${n.protein ?? 0} · Ж ${n.fat ?? 0} · У ${n.carbs ?? 0}`;
}

// Сумма по списку записей { kcal, protein, fat, carbs }
function sumNutrition(list) {
  const t = { kcal: 0, protein: 0, fat: 0, carbs: 0, has: false };
  list.forEach((n) => {
    if (!n || n.kcal == null) return;
    t.kcal += n.kcal;
    t.protein += n.protein || 0;
    t.fat += n.fat || 0;
    t.carbs += n.carbs || 0;
    t.has = true;
  });
  return t;
}

function totalsLine(t, label = 'Итого') {
  if (!t.has) return '';
  const limit = calorieLimit();
  const over = t.kcal > limit;
  return `<div class="row-sub ${over ? 'overdue' : ''}" style="margin-top:6px"><b>${label}: ${t.kcal} из ${limit} ккал</b> · Б ${t.protein} · Ж ${t.fat} · У ${t.carbs}${over ? ' — больше лимита' : ''}</div>`;
}

// Строки блюд плана (с калориями, если они есть)
function planLines(plan) {
  const nutrition = plan.nutrition || {};
  return MEALS.filter((m) => plan[m.value])
    .map((m) => {
      const n = nutrText(nutrition[m.value]);
      return `<div class="row-sub"><b>${esc(m.label)}:</b> ${esc(plan[m.value])}${n ? `<br>${esc(n)}` : ''}</div>`;
    })
    .join('');
}

function planTotals(plan) {
  const nutrition = plan.nutrition || {};
  return sumNutrition(MEALS.filter((m) => plan[m.value]).map((m) => nutrition[m.value]));
}

// ---------- Формы ----------

function openFridgeForm(item) {
  formSheet({
    title: 'Продукт',
    values: item || {},
    fields: [
      { name: 'name', label: 'Название', type: 'text', required: true },
      { name: 'qty', label: 'Количество (например, 2 шт или 500 г)', type: 'text' }
    ],
    onSubmit(data) {
      store.set('fridge/' + (item ? item.id : newId()), {
        name: data.name,
        qty: data.qty || '',
        created: item ? item.created || Date.now() : Date.now()
      });
    },
    onDelete: item
      ? () => {
          if (!ask('Удалить продукт?')) return false;
          store.remove('fridge/' + item.id);
        }
      : null
  });
}

function openPlanForm(day) {
  formSheet({
    title: 'План: ' + DAYS[day],
    values: store.get('mealPlan/' + day, {}),
    fields: MEALS.map((m) => ({ name: m.value, label: m.label, type: 'text' })),
    onSubmit(data) {
      const old = store.get('mealPlan/' + day, {});
      const out = {};
      const nutrition = {};
      MEALS.forEach((m) => {
        if (!data[m.value]) return;
        out[m.value] = data[m.value];
        // Калории сохраняем, только если название блюда не менялось
        const n = old.nutrition && old.nutrition[m.value];
        if (n && old[m.value] === data[m.value]) nutrition[m.value] = n;
      });
      if (Object.keys(nutrition).length) out.nutrition = nutrition;
      store.set('mealPlan/' + day, Object.keys(out).length ? out : null);
    }
  });
}

function openMealForm() {
  formSheet({
    title: 'Приём пищи',
    values: { type: 'lunch' },
    fields: [
      { name: 'type', label: 'Приём пищи', type: 'select', options: MEALS },
      { name: 'text', label: 'Что съели', type: 'text', required: true },
      { name: 'kcal', label: 'Калории, ккал (необязательно)', type: 'number', step: 1, min: 0 },
      { name: 'protein', label: 'Белки, г', type: 'number', min: 0 },
      { name: 'fat', label: 'Жиры, г', type: 'number', min: 0 },
      { name: 'carbs', label: 'Углеводы, г', type: 'number', min: 0 }
    ],
    onSubmit(data) {
      const out = { type: data.type, text: data.text, created: Date.now() };
      ['kcal', 'protein', 'fat', 'carbs'].forEach((k) => { if (data[k] !== null) out[k] = data[k]; });
      store.set(`meals/${dateKey(new Date())}/${newId()}`, out);
    }
  });
}

// ---------- Меню от ИИ ----------

function startAiMenu() {
  if (!isAiConfigured()) { toast('ИИ не подключён — см. worker/README.md'); return; }

  const products = store.list('fridge').map((i) => (i.qty ? `${i.name} (${i.qty})` : i.name));
  if (!products.length) { toast('Сначала добавьте продукты в холодильник'); return; }

  formSheet({
    title: 'Меню от ИИ',
    values: { scope: 'week' },
    submitText: 'Составить',
    fields: [
      {
        name: 'scope', label: 'На какой срок', type: 'select',
        options: [{ value: 'day', label: 'На сегодня' }, { value: 'week', label: 'На неделю' }]
      },
      { name: 'wishes', label: 'Пожелания (необязательно)', type: 'text', placeholder: 'например: без молока, быстро' }
    ],
    onSubmit(data) {
      // formSheet закроется сам, поэтому следующий шаг запускаем чуть позже
      setTimeout(() => runAiMenu(products, data.scope === 'day' ? 1 : 7, data.wishes), 0);
    }
  });
}

async function runAiMenu(products, days, wishes) {
  openSheet(`<h2>Составляю меню…</h2><p class="muted">Лимит: ${calorieLimit()} ккал в день. Это займёт несколько секунд.</p>`);
  try {
    const result = await generateMenu({ products, days, wishes, calorieLimit: calorieLimit() });
    showAiResult(result, days);
  } catch (err) {
    openSheet(
      `<h2>Не получилось</h2><p class="muted" style="margin-bottom:16px">${esc(err.message)}</p>
       <div class="sheet-actions"><button class="btn" data-close>Закрыть</button></div>`,
      (sheet) => { sheet.querySelector('[data-close]').onclick = closeSheet; }
    );
  }
}

// Ответ ИИ для одного дня -> формат плана
function planFromAi(d) {
  const out = {};
  const nutrition = {};
  MEALS.forEach((m) => {
    const x = d && d[m.value];
    if (x && x.name) {
      out[m.value] = x.name;
      nutrition[m.value] = { kcal: x.kcal, protein: x.protein, fat: x.fat, carbs: x.carbs };
    }
  });
  if (Object.keys(nutrition).length) out.nutrition = nutrition;
  return out;
}

function showAiResult(result, days) {
  const dows = days === 1 ? [new Date().getDay()] : WEEK_ORDER;
  const plans = dows.map((_, i) => planFromAi(result.days[i]));

  const preview = dows
    .map((dow, i) => `
      <div class="row"><div class="row-main">
        <div class="row-title">${DAYS[dow]}</div>
        ${planLines(plans[i])}
        ${totalsLine(planTotals(plans[i]))}
      </div></div>`)
    .join('');

  const shopping = result.shopping && result.shopping.length
    ? `<p style="margin-top:12px"><b>Докупить:</b> ${esc(result.shopping.join(', '))}</p>`
    : '';

  openSheet(
    `<h2>Меню готово</h2>
     ${preview}${shopping}
     <p class="muted small-text" style="margin:12px 0">Калории и БЖУ — приблизительная оценка ИИ. «Применить» заменит план на эти дни, потом его можно поправить вручную.</p>
     <div class="sheet-actions">
       <button class="btn primary" data-apply>Применить к плану</button>
       <button class="btn ghost" data-close>Закрыть</button>
     </div>`,
    (sheet) => {
      sheet.querySelector('[data-close]').onclick = closeSheet;
      sheet.querySelector('[data-apply]').onclick = () => {
        dows.forEach((dow, i) => {
          store.set('mealPlan/' + dow, Object.keys(plans[i]).length ? plans[i] : null);
        });
        closeSheet();
        toast('План обновлён');
      };
    }
  );
}

// ---------- Вкладки ----------

function fridgeTab() {
  const items = store.list('fridge').sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  const rows = items.length
    ? items
        .map(
          (i) => `
      <div class="row" data-edit="${i.id}">
        <div class="row-main"><div class="row-title">${esc(i.name)}</div>${i.qty ? `<div class="row-sub">${esc(i.qty)}</div>` : ''}</div>
        <button class="icon-btn quiet" data-del="${i.id}" aria-label="Удалить">✕</button>
      </div>`
        )
        .join('')
    : empty('В холодильнике пока пусто');

  return `
    <section class="card">
      <div class="card-head"><h2>Продукты</h2></div>
      ${rows}
      <form class="inline-form" data-form="fridge">
        <input type="text" name="name" placeholder="Добавить продукт" autocomplete="off" required>
        <button class="btn primary" aria-label="Добавить">+</button>
      </form>
    </section>`;
}

function planTab() {
  const cards = WEEK_ORDER.map((day) => {
    const plan = store.get('mealPlan/' + day, {});
    const lines = planLines(plan);
    return `
      <section class="card" data-plan="${day}" style="cursor:pointer">
        <div class="card-head"><h2>${DAYS[day]}</h2><span class="tag">Изменить</span></div>
        ${lines ? lines + totalsLine(planTotals(plan)) : '<p class="muted">Не заполнено</p>'}
      </section>`;
  });
  return `
    <section class="card">
      <div class="card-head"><h2>Меню от ИИ</h2></div>
      <p class="muted small-text" style="margin-bottom:10px">Составит меню из продуктов в холодильнике с калориями и БЖУ, в пределах ${calorieLimit()} ккал в день (лимит меняется в профиле). ${isAiConfigured() ? 'Нужен вход в аккаунт.' : 'Сейчас ИИ не подключён (см. worker/README.md) — план можно заполнять вручную.'}</p>
      <button class="btn primary block" data-ai-menu style="margin-top:0">Составить меню</button>
    </section>
    ${cards.join('')}`;
}

function logTab() {
  const today = dateKey(new Date());
  const meals = store.list('meals/' + today).sort((a, b) => (a.created || 0) - (b.created || 0));
  const plan = store.get('mealPlan/' + new Date().getDay(), {});
  const planBlock = planLines(plan);

  const eaten = sumNutrition(meals);
  const limit = calorieLimit();
  const pct = Math.min(100, Math.round((eaten.kcal / limit) * 100));
  const over = eaten.kcal > limit;

  const rows = meals.length
    ? meals
        .map((m) => {
          const n = nutrText(m);
          return `
      <div class="row">
        <div class="row-main"><div class="row-title">${esc(m.text)}</div><div class="row-sub">${esc(mealLabel(m.type))}${n ? ' · ' + esc(n) : ''}</div></div>
        <button class="icon-btn quiet" data-del-meal="${m.id}" aria-label="Удалить">✕</button>
      </div>`;
        })
        .join('')
    : empty('Сегодня ещё ничего не записано');

  return `
    <section class="card">
      <div class="muted small-text">Калории за сегодня</div>
      <div class="big-number${over ? ' overdue' : ''}">${eaten.kcal}<span class="muted" style="font-size:18px;font-weight:500"> / ${limit} ккал</span></div>
      <div class="progress"><i style="width:${pct}%${over ? ';background:var(--danger)' : ''}"></i></div>
      <div class="muted small-text">Б ${eaten.protein} · Ж ${eaten.fat} · У ${eaten.carbs} (считаются только записи с указанными калориями)</div>
    </section>
    ${planBlock ? `<section class="card"><div class="card-head"><h2>План на сегодня</h2></div>${planBlock}${totalsLine(planTotals(plan))}</section>` : ''}
    <section class="card">
      <div class="card-head"><h2>Съедено сегодня</h2><button class="btn small primary" data-add-meal>+ Запись</button></div>
      ${rows}
    </section>`;
}

export function render(root) {
  const tabs = [
    { value: 'fridge', label: 'Холодильник' },
    { value: 'plan', label: 'План' },
    { value: 'log', label: 'Сегодня' }
  ];
  const seg = tabs
    .map((t) => `<button data-tab="${t.value}" class="${tab === t.value ? 'active' : ''}">${t.label}</button>`)
    .join('');
  const body = tab === 'fridge' ? fridgeTab() : tab === 'plan' ? planTab() : logTab();

  root.innerHTML = `${pageHead('Питание')}<div class="segmented">${seg}</div>${body}`;

  root.onclick = (e) => {
    const t = e.target.closest('[data-tab]');
    if (t) { tab = t.dataset.tab; render(root); return; }

    const del = e.target.closest('[data-del]');
    if (del) { e.stopPropagation(); store.remove('fridge/' + del.dataset.del); return; }

    const edit = e.target.closest('[data-edit]');
    if (edit) {
      const item = store.list('fridge').find((i) => i.id === edit.dataset.edit);
      if (item) openFridgeForm(item);
      return;
    }

    if (e.target.closest('[data-ai-menu]')) { startAiMenu(); return; }

    const plan = e.target.closest('[data-plan]');
    if (plan) { openPlanForm(Number(plan.dataset.plan)); return; }

    if (e.target.closest('[data-add-meal]')) { openMealForm(); return; }

    const delMeal = e.target.closest('[data-del-meal]');
    if (delMeal) store.remove(`meals/${dateKey(new Date())}/${delMeal.dataset.delMeal}`);
  };

  root.onsubmit = (e) => {
    if (e.target.dataset.form !== 'fridge') return;
    e.preventDefault();
    const name = e.target.elements.name.value.trim();
    if (!name) return;
    store.set('fridge/' + newId(), { name, qty: '', created: Date.now() });
    toast('Добавлено');
  };
}
