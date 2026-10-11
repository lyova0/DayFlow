// Экран входа (Email + пароль через Firebase Authentication).
// Есть режим «без входа» — данные тогда только на этом устройстве.

import { session } from './session.js';
import { esc } from './utils.js';

const root = document.getElementById('auth-root');

// main.js подставляет сюда функцию запуска локального режима
export const hooks = { onLocal() {} };

export function watch(callback) {
  const { auth, authApi } = session.firebase;
  authApi.onAuthStateChanged(auth, callback);
}

export function logout() {
  const { auth, authApi } = session.firebase;
  return authApi.signOut(auth);
}

export function hideAuth() {
  root.classList.remove('open');
  root.innerHTML = '';
}

function message(code) {
  const map = {
    'auth/invalid-credential': 'Неверный email или пароль.',
    'auth/wrong-password': 'Неверный email или пароль.',
    'auth/user-not-found': 'Неверный email или пароль.',
    'auth/invalid-email': 'Проверьте адрес почты.',
    'auth/email-already-in-use': 'Такой аккаунт уже есть — нажмите «Войти».',
    'auth/weak-password': 'Пароль слишком короткий (минимум 6 символов).',
    'auth/too-many-requests': 'Слишком много попыток. Попробуйте позже.',
    'auth/network-request-failed': 'Нет соединения с интернетом.',
    'auth/operation-not-allowed': 'В Firebase не включён вход по Email/паролю.'
  };
  return map[code] || 'Не получилось войти. Проверьте настройки Firebase.';
}

export function showAuth() {
  root.classList.add('open');
  root.innerHTML = `
    <div class="auth-card">
      <div class="logo">Dayflow</div>
      <p class="muted">Войдите, чтобы данные сохранялись в облаке и были доступны на всех ваших устройствах.</p>
      <form id="auth-form" novalidate>
        <label class="field"><span>Email</span>
          <input name="email" type="email" autocomplete="email" inputmode="email" required></label>
        <label class="field"><span>Пароль (минимум 6 символов)</span>
          <input name="password" type="password" autocomplete="current-password" minlength="6" required></label>
        <p class="error" id="auth-error" hidden></p>
        <button type="submit" class="btn primary block">Войти</button>
        <button type="button" class="btn block" id="auth-register">Создать аккаунт</button>
      </form>
      <button type="button" class="btn ghost block" id="auth-local">Продолжить без входа</button>
    </div>`;

  const form = root.querySelector('#auth-form');
  const errorEl = root.querySelector('#auth-error');

  async function run(action) {
    if (!form.reportValidity()) return;
    errorEl.hidden = true;
    const { auth, authApi } = session.firebase;
    const email = form.elements.email.value.trim();
    const password = form.elements.password.value;
    try {
      await action(authApi, auth, email, password);
      // Дальше сработает watch() и откроется приложение
    } catch (err) {
      errorEl.textContent = message(err.code);
      errorEl.hidden = false;
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    run((api, auth, email, pw) => api.signInWithEmailAndPassword(auth, email, pw));
  });

  root.querySelector('#auth-register').onclick = () =>
    run((api, auth, email, pw) => api.createUserWithEmailAndPassword(auth, email, pw));

  root.querySelector('#auth-local').onclick = () => {
    localStorage.setItem('dayflow:mode', 'local');
    hideAuth();
    hooks.onLocal();
  };
}
