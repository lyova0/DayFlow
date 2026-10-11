// Запрос ИИ-меню. Приложение НЕ знает ключ Gemini:
// оно обращается к вашему Worker (см. worker/README.md), а тот — к Gemini.

import { aiEndpoint, isAiConfigured } from './config.js';
import { session } from './session.js';

export { isAiConfigured };

// products: массив строк, days: 1 или 7, wishes: текст (необязательно),
// calorieLimit: максимум ккал в день.
// Возвращает { days: [{ breakfast: {name, kcal, protein, fat, carbs}, lunch, dinner, snack }], shopping: [строки] }
export async function generateMenu({ products, days, wishes, calorieLimit }) {
  if (!isAiConfigured()) throw new Error('ИИ не подключён — см. worker/README.md');
  if (!session.user) throw new Error('Войдите в аккаунт, чтобы пользоваться ИИ');

  const token = await session.user.getIdToken();
  let res;
  try {
    res = await fetch(aiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ products, days, wishes, calorieLimit })
    });
  } catch {
    throw new Error('Нет соединения с сервером ИИ');
  }

  let data = null;
  try { data = await res.json(); } catch { /* ответ не JSON */ }
  if (!res.ok) throw new Error((data && data.error) || `Ошибка ИИ (${res.status})`);
  return data;
}
