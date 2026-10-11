// Раздел «Ещё»: ссылки на Зал, Активность, Заметки и Профиль.

import { pageHead } from '../ui.js';

export function render(root) {
  root.innerHTML = `
    ${pageHead('Ещё')}
    <div class="menu-list">
      <a href="#/gym"><span class="emoji">🏋️</span><div><b>Зал</b><span class="sub">Тренировки, упражнения, подходы</span></div></a>
      <a href="#/activity"><span class="emoji">👟</span><div><b>Активность</b><span class="sub">Шаги и история</span></div></a>
      <a href="#/notes"><span class="emoji">📝</span><div><b>Заметки</b><span class="sub">Создание и редактирование</span></div></a>
      <a href="#/profile"><span class="emoji">👤</span><div><b>Профиль</b><span class="sub">Настройки и показатели недели</span></div></a>
    </div>`;
}
