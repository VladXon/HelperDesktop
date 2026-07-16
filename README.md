# HelperDesktop

Status: active development

## Что это

HelperDesktop — десктоп-приложение для персонального ассистента на базе Electron с интеграцией Telegram. Пользователь работает с заметками, пресетами приложений и настройками в React-клиенте, синхронизация с телефоном идёт через Telegram-бота, данные хранятся в SQLite под управлением Express-сервера с JWT-аутентификацией.

## Архитектура

```
┌─────────────────┐  HTTPS  ┌──────────────────┐  internal HTTP  ┌─────────────────┐
│  Electron client│ ──────> │ Express server   │ ──────────────> │ Telegram bot    │
│  (React 19)     │   WS    │ (Drizzle+SQLite) │   X-Bot-Secret  │ (GrammY)        │
└─────────────────┘         └──────────────────┘                 └─────────────────┘
```

Клиент общается с сервером по HTTPS и WebSocket. Сервер владеет базой данных и аутентификацией. Бот обращается к серверу по internal HTTP с заголовком `X-Bot-Secret` для обновления статусов связки и подтверждений.

## Структура

```
.
├── apps/
│   ├── server/          # Express + Drizzle ORM + SQLite
│   ├── bot/             # GrammY + Telegram Bot API
│   └── client/          # Electron + React 19 + Vite
├── packages/
│   └── shared/          # zod-схемы и общие типы
├── scripts/             # deploy.sh, backup.sh
├── ecosystem.config.js  # PM2
├── .github/workflows/   # CI/CD
└── docs/superpowers/    # спека и план
```

## Установка

```bash
pnpm install
pnpm --filter @helper/server db:migrate
cp apps/server/.env.example apps/server/.env
# отредактируйте .env (JWT_SECRET, BOT_SHARED_SECRET, BOT_USERNAME)
```

## Разработка

```bash
pnpm dev               # параллельно server + bot + client
pnpm dev:server        # только сервер
pnpm dev:bot           # только бот
pnpm dev:client        # только Electron-клиент
pnpm test              # все тесты (shared, server, bot)
pnpm typecheck         # типы по всем пакетам
pnpm lint              # линтеры
```

## Production

Сборка:

```bash
pnpm -r build
```

Переменные окружения (см. `apps/server/.env.example`):

- `NODE_ENV=production`
- `PORT=3001`
- `JWT_SECRET` — обязателен, минимум 32 символа
- `BOT_SHARED_SECRET` — обязателен, общий с ботом
- `DB_PATH` — путь к SQLite-файлу
- `BOT_USERNAME` — username бота без `@`
- `CORS_ORIGINS` — список origin через запятую

Деплой:

```bash
bash scripts/deploy.sh          # на сервер 178.172.137.167
pm2 start ecosystem.config.js   # первый запуск
pm2 save
pm2 startup
```

## Стек

- **Server**: Node.js 20, Express 4, Drizzle ORM, better-sqlite3, jsonwebtoken, helmet, express-rate-limit, zod, ws
- **Bot**: Node.js 20, GrammY, better-sqlite3, zod
- **Client**: Electron 33, React 19, Vite 5, Radix UI, TanStack Query, Tailwind CSS, react-markdown
- **Shared**: zod 4
- **Tooling**: pnpm 9 workspaces, TypeScript 5.8, Vitest 2, supertest, Playwright

## Лицензия

MIT
