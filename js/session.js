// Общее состояние сеанса, которое читают разные модули.
// firebase — объект с auth/db (или null, если Firebase не настроен).
// user — вошедший пользователь (или null в локальном режиме).

export const session = {
  firebase: null,
  user: null,
  firebaseError: null
};
