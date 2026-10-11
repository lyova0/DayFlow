# Dayflow

Личный планировщик: HTML + CSS + JavaScript (без фреймворков), Firebase Authentication и Realtime Database, PWA для iPhone.

## Запуск

Модули JavaScript не работают при открытии файла двойным кликом (`file://`). Нужен простой локальный сервер:

```
cd dayflow
python3 -m http.server 8080
```

Откройте http://localhost:8080. Подойдёт и расширение «Live Server» в VS Code.

Без настройки Firebase приложение работает в **локальном режиме**: данные хранятся в браузере.

## Структура

```
dayflow/
├── index.html              Каркас: контейнер экранов, нижняя навигация, подключение main.js
├── manifest.webmanifest    PWA: имя, иконки, режим standalone
├── sw.js                   Service worker: работа без сети
├── database.rules.json     Правила Firebase: каждый видит только свои данные
├── worker/                 Cloudflare Worker: безопасный «посредник» к Gemini (worker.js + README.md)
├── css/
│   └── styles.css          Все стили (светлая тема, карточки, нижняя навигация, формы)
├── icons/                  Иконки приложения (192, 512, apple-touch-icon, svg)
└── js/
    ├── main.js             Запуск, выбор режима (облако/локально), маршруты, перерисовка
    ├── config.js           ВАШИ данные Firebase (заглушки YOUR_...)
    ├── firebase.js         Загрузка SDK Firebase
    ├── session.js          Общее состояние: firebase, текущий пользователь
    ├── auth.js             Экран входа / регистрации
    ├── store.js            Хранилище: localStorage + синхронизация с Firebase
    ├── ai.js               Запрос ИИ-меню к вашему Worker (ключа Gemini в приложении нет)
    ├── defaults.js         Начальное расписание
    ├── schedule-data.js    Какие события выпадают на дату, строка события
    ├── utils.js            Даты, id, экранирование HTML
    ├── ui.js               Всплывающие сообщения, форма-«шторка» formSheet
    └── views/
        ├── home.js         Главная
        ├── schedule.js     Расписание
        ├── study.js        Учёба
        ├── food.js         Питание
        ├── more.js         Меню «Ещё»
        ├── gym.js          Зал
        ├── activity.js     Активность
        ├── notes.js        Заметки
        └── profile.js      Профиль
```

## Подключение Firebase

1. На https://console.firebase.google.com создайте проект.
2. **Authentication → Sign-in method** — включите «Email/Password».
3. **Realtime Database → Create database** (режим locked).
4. **Realtime Database → Rules** — вставьте содержимое `database.rules.json` и опубликуйте.
5. **Project settings → Your apps → Web (`</>`)** — скопируйте `firebaseConfig` в `js/config.js` вместо `YOUR_...`. Не забудьте `databaseURL`.
6. **Authentication → Settings → Authorized domains** — добавьте домен, где будет размещено приложение.

Данные хранятся в `users/{uid}/...`; правила разрешают чтение и запись только владельцу.

## Установка на iPhone

1. Разместите папку на любом HTTPS-хостинге (бесплатно: GitHub Pages, Firebase Hosting, Netlify).
2. Откройте адрес в Safari → «Поделиться» → «На экран Домой».

## Что пока не подключено

- Шаги из Apple Health: вводятся вручную (веб-приложение не имеет доступа к Health).
- Меню от ИИ работает только после настройки Worker с ключом Gemini — см. `worker/README.md`. Пока `aiEndpoint` в `js/config.js` не заполнен, план питания составляется вручную. Ключ Gemini в клиентском коде не хранится.

## Модель данных

| Путь | Содержимое |
|---|---|
| `schedule/{id}` | `title, kind, repeat (weekly/once), day, date, time` (длительность не хранится) |
| `tasks/{id}` | задачи с главной |
| `study/{id}` | задачи по математике и английскому |
| `fridge/{id}`, `mealPlan/{день}`, `meals/{дата}/{id}` | питание |
| `workouts/{id}/exercises/{id}/sets/{id}` | зал |
| `steps/{дата}` | шаги |
| `notes/{id}` | заметки |
| `profile`, `weekly/{понедельник недели}` | настройки и показатели |
