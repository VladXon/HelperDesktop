# HelperDesktop — Design Spec

**Дата:** 2026-07-16
**Статус:** Утверждён (все секции согласованы с пользователем)
**Автор:** opencode (через сессию brainstorming)
**Целевая директория:** `D:\repos\ElectronHelper\` (новая кодовая база; legacy в `D:\repos\MyHelperElectron\`)

---

## 0. Контекст

HelperDesktop — десктопное приложение для управления заметками, пресетами запуска приложений и интеграцией с Telegram. Текущая (legacy) версия в `D:\repos\MyHelperElectron\` написана на Electron + React + Vite, Express + SQLite, GrammY. Legacy имеет проблемы:

- Drizzle установлен, но не используется (сырой SQL)
- Два источника правды для telegram-привязок (таблица + JSON-файл `bot-links.json`)
- Защищённые эндпоинты `/op`, `/email`, `/password` без авторизации
- Хардкод пути к БД в боте
- Сервер спавнит бота как child без обработки exit code
- 11 CSS-файлов по страницам, 833 строки в `notes.css`
- Нет Markdown-рендера (хотя README обещает)
- `/login` отдаёт 404 для несуществующего юзера (leak информации)
- Нефункциональные UI-элементы (кнопка «New Project», захардкоженный CPU/RAM)

Эта спецификация описывает полностью переписанную версию с теми же возможностями, но с чистой архитектурой, типизацией и безопасностью.

---

## 1. Цели и принципы

### 1.1 Функциональные цели
- Все возможности legacy, **плюс**:
  - **QR-логин через Telegram** (новая фича): если Telegram привязан, вход в приложение через сканирование QR телеграм-ботом
  - **Inline-кнопки в Telegram-боте** для удобной навигации
  - **Markdown-рендер** в заметках
  - **Синхронизация пресетов через сервер** (в legacy — только локально)
  - **AI-инспектор** (dev-only) — копирование markdown-промта для AI по любому компоненту
- **Без** legacy-проблем (см. §0)

### 1.2 Не-цели (out of scope для MVP)
- 2FA / TOTP
- Совместное редактирование заметок в реальном времени
- End-to-end шифрование
- Мобильное приложение
- Self-hosted вариант дистрибуции (только деплой на выделенный сервер)

### 1.3 Принципы
- **Изоляция кода**: каждый workspace — самодостаточен; `packages/shared` содержит только типы/zod-схемы/константы
- **Изоляция CSS**: Tailwind utility classes; shadcn/ui компоненты в `components/ui/`; фичи в `features/*/` со своими компонентами
- **Типобезопасность end-to-end**: zod-схемы в shared, валидация на сервере, автовывод типов на клиенте
- **Single source of truth**: одно хранилище для каждой сущности (DB для telegram-привязок, без JSON-файлов)
- **YAGNI**: не добавляем функции «на будущее»
- **Fail-fast**: критичные конфиги (BOT_SHARED_SECRET, JWT_SECRET) обязательны в проде, иначе сервер не стартует

---

## 2. Архитектура

### 2.1 Высокоуровневая схема

```
┌─────────────────────────────────────────────────────────────┐
│  Electron Client (apps/client)                              │
│  - React 19 + Vite + Tailwind + shadcn/ui (Radix)          │
│  - TanStack Query для server state                         │
│  - IPC: main ↔ renderer через contextBridge                │
│  - safeStorage для шифрования токенов на диске              │
└──────────┬──────────────────────────────────────────────────┘
           │ HTTPS REST + WebSocket
           ▼
┌─────────────────────────────────────────────────────────────┐
│  Express Server (apps/server) — на 178.172.137.167         │
│  - Drizzle ORM + better-sqlite3 (WAL)                      │
│  - JWT (HS256) + scrypt + rate-limit + helmet + zod        │
│  - При старте спавнит бота как child_process (BotManager)  │
└──────────┬──────────────────────────────────────────────────┘
           │ shared SQLite file
           ▼
┌─────────────────────────────────────────────────────────────┐
│  Telegram Bot (apps/bot) — child of server                  │
│  - GrammY + inline keyboards                                │
│  - Поллеры напоминаний и уведомлений (каждые 30с)          │
│  - HTTP к серверу: /api/internal/bot/* (X-Bot-Secret)      │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Репозиторий (pnpm-workspace monorepo)

```
HelperDesktop/
├── .github/workflows/        # CI (GitHub Actions)
├── .gitignore
├── .nvmrc                    # node 20
├── .env.example
├── README.md
├── SECURITY.md               # threat model, контакты для репортов
├── RUNBOOK.md                # что делать при падениях
├── DEPLOY.md                 # шаги деплоя
├── package.json              # workspace root + scripts
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── tsconfig.base.json
├── ecosystem.config.js       # PM2
├── scripts/
│   ├── dev.sh
│   ├── deploy.sh
│   └── backup.sh
├── apps/
│   ├── client/               # Electron + Vite + React + Tailwind + shadcn/ui
│   ├── server/               # Express + Drizzle + better-sqlite3
│   └── bot/                  # GrammY
├── packages/
│   └── shared/               # типы, zod-схемы, константы
└── docs/
    └── superpowers/
        ├── specs/            # design docs (этот файл)
        └── plans/            # implementation plans
```

**Правила изоляции:**
- `apps/*` не импортируют друг друга; только через `packages/shared`
- `packages/shared` не содержит бизнес-логику — только типы, схемы, константы
- Внутри `apps/client`: `features/*` не импортируют друг друга напрямую (только через `index.ts` public surface)
- `components/ui/` (shadcn) и `features/*` строго разделены

### 2.3 Workspace scripts (из корня)

| Скрипт | Что делает |
|---|---|
| `pnpm install` | Установить зависимости всех пакетов |
| `pnpm dev` | Параллельно: `dev:server` + `dev:bot` + `dev:client` |
| `pnpm dev:server` | `tsx watch` для `apps/server` |
| `pnpm dev:bot` | `tsx watch` для `apps/bot` |
| `pnpm dev:client` | `electron-forge start` для `apps/client` |
| `pnpm build` | `pnpm -r build` (server, bot, client) |
| `pnpm --filter @helper/server build` | Только server (tsc → dist/) |
| `pnpm --filter @helper/client package` | electron-forge make (squirrel/zip/deb/rpm) |
| `pnpm --filter @helper/server db:generate` | drizzle-kit generate |
| `pnpm --filter @helper/server db:migrate` | Применить миграции |
| `pnpm lint` | ESLint во всех пакетах |
| `pnpm typecheck` | tsc --noEmit во всех пакетах |
| `pnpm test` | Vitest во всех пакетах |
| `pnpm test:e2e` | Playwright e2e |

---

## 3. Технологический стек

| Слой | Технологии |
|---|---|
| **Workspace** | pnpm 9, Node 20, TypeScript 5.8 (strict) |
| **Server** | Express 4, Drizzle ORM 0.45+, better-sqlite3 11, zod 4, jsonwebtoken 9, helmet 8, cors, express-rate-limit, ws 8 |
| **Bot** | GrammY 1.34+, undici (HTTP) |
| **Client build** | Electron 43, electron-forge 7, Vite 5, @vitejs/plugin-react |
| **Client UI** | React 19, Tailwind CSS 3, shadcn/ui (на Radix), class-variance-authority, tailwind-merge, framer-motion 12 |
| **Client state** | TanStack Query 5, React Context (auth, theme) |
| **Client icons** | @phosphor-icons/react |
| **Client utilities** | react-markdown, remark-gfm, rehype-sanitize, @uiw/react-codemirror (для markdown-редактора), qrcode |
| **Client desktop** | electron-squirrel-startup, safeStorage, ws (client) |
| **Tests** | Vitest 4, supertest, @playwright/test 1.61 |
| **Process supervisor** | PM2 |
| **Reverse proxy** | nginx + Let's Encrypt |
| **CI** | GitHub Actions |

**Обоснование ключевых выборов:**
- **Drizzle** вместо Prisma: уже был в legacy как зависимость, лёгкий, type-safe, миграции через drizzle-kit. Для SQLite + 5 таблиц — идеален.
- **shadcn/ui** вместо MUI/Mantine: компоненты копируются в проект (owned code), нет рантайм-зависимости, легко кастомизировать тему.
- **pnpm workspaces** вместо Turborepo: для 4 пакетов Turborepo — overkill; pnpm scripts + параллельный запуск достаточно.
- **GrammY** остаётся (был в legacy, работает хорошо).

---

## 4. Модель данных (Drizzle schema)

Файл: `apps/server/src/db/schema.ts` (генерируется руками, типы — автовыводятся).

```ts
// users
{
  id: integer (PK, autoincrement),
  login: text (unique, not null),
  name: text (not null, default ''),
  email: text (not null, default ''),
  password: text (not null),  // формат: scrypt:N:r:p:salt:hash
  is_dev: integer (not null, default 0),  // 0|1
  created_at: text (default: datetime('now'))
}

// sessions
{
  id: integer (PK, autoincrement),
  user_id: integer (FK → users.id, on delete cascade),
  token: text (unique, not null),
  refresh_token: text (unique, not null),
  refresh_token_used_at: text (nullable),  // для rotation
  device_id: text (nullable),  // X-Device-Id с клиента
  ip: text (nullable),
  user_agent: text (nullable),
  expires_at: text (not null),
  created_at: text
}

// telegram_links (1:1 — один telegram_id на одного юзера)
{
  user_id: integer (PK, FK → users.id, on delete cascade),
  telegram_id: integer (unique, not null),
  linked_at: text (default: datetime('now'))
}

// telegram_actions (заменяет pending_telegram_links)
{
  token: text (PK),  // crypto-random 32 байта base64url
  action: text (not null, check: 'link_code' | 'qr_login'),
  user_id: integer (nullable, FK → users.id),  // NULL для qr_login (резолвится через telegram_id)
  telegram_id: integer (nullable),
  status: text (not null, default 'pending', check: 'pending'|'approved'|'expired'),
  expires_at: integer (not null),  // ms epoch
  created_at: text
}

// notes
{
  id: integer (PK, autoincrement),
  user_id: integer (FK → users.id, on delete cascade),
  title: text (not null, default ''),
  body: text (not null, default ''),  // markdown
  tags: text (not null, default '[]'),  // JSON array
  pinned: integer (not null, default 0),
  completed: integer (not null, default 0),
  reminder_at: integer (nullable),  // ms epoch
  notify_telegram: integer (not null, default 0),
  telegram_notified: integer (not null, default 0),
  created_at: text,
  updated_at: text
}

// presets (synced via server)
{
  id: integer (PK, autoincrement),
  user_id: integer (FK → users.id, on delete cascade),
  name: text (not null),
  icon: text (not null, default ''),  // Phosphor icon name | emoji
  apps: text (not null, default '[]'),  // JSON [{name, path, runAsAdmin}]
  pinned: integer (not null, default 0),
  created_at: text,
  updated_at: text
}

// settings (typed, заменяет generic data table)
{
  user_id: integer (FK → users.id, on delete cascade),
  key: text (not null),
  value: text (not null),  // JSON-string
  updated_at: text,
  PRIMARY KEY: (user_id, key)
}

// audit_log
{
  id: integer (PK, autoincrement),
  user_id: integer (nullable, FK → users.id),
  action: text (not null),  // login, logout, refresh, password_change, email_change, telegram_link, telegram_unlink, dev_op, dev_restart, login_failed, account_locked
  ip: text (nullable),
  user_agent: text (nullable),
  metadata: text (nullable),  // JSON
  created_at: text
}

// login_attempts (для rate-limit и lockout)
{
  id: integer (PK, autoincrement),
  ip: text (not null),
  login: text (not null),
  success: integer (not null),  // 0|1
  created_at: text
}
```

**Индексы:**
- `idx_sessions_token` на `sessions(token)`
- `idx_sessions_refresh_token` на `sessions(refresh_token)`
- `idx_sessions_user_id` на `sessions(user_id)`
- `idx_telegram_actions_expires` на `telegram_actions(expires_at)` WHERE status='pending'
- `idx_notes_user_id` на `notes(user_id)`
- `idx_notes_reminder` на `notes(user_id, reminder_at)` WHERE reminder_at IS NOT NULL AND completed=0
- `idx_notes_notify` на `notes(user_id, telegram_notified)` WHERE notify_telegram=1 AND telegram_notified=0
- `idx_presets_user_id` на `presets(user_id)`
- `idx_audit_log_user_id` на `audit_log(user_id, created_at)`
- `idx_login_attempts_created` на `login_attempts(created_at)`

**Миграции:** drizzle-kit versioned, forward-only. Генерируются через `pnpm db:generate`, применяются через `pnpm db:migrate`.

---

## 5. API

Все эндпоинты под `/api/*`. JSON. Авторизация — `Authorization: Bearer <jwt>`.

### 5.1 Auth (публичные + защищённые)

| Метод | Путь | Auth | Описание |
|---|---|---|---|
| GET | `/api/health` | — | `{ status, timestamp, version, db: 'ok'|'down' }` |
| POST | `/api/auth/register` | — | `{ login, password, name? }`. Если существует — проверяет пароль, возвращает существующего (200) или 401. Иначе создаёт (201). **Всегда 401** на неверный пароль, **не** 404. |
| POST | `/api/auth/login` | — | `{ login, password }` → `user` (200) или 401. |
| POST | `/api/auth/token` | — | `{ login, password }` → `{ token, refreshToken, expiresIn, user }` или 401. |
| POST | `/api/auth/refresh` | — | `{ refreshToken }` → новые токены. **Refresh rotation**: старый refresh становится `used`, новый создаётся. Повторное использование used refresh → revoke всех сессий юзера, audit log `token_reuse_detected`. |
| POST | `/api/auth/logout` | Bearer | Удалить текущую сессию. |
| GET | `/api/auth/me` | Bearer | Текущий `user`. |
| PUT | `/api/auth/email` | Bearer | `{ email, currentPassword }` → `user`. Требует `currentPassword` (verifyPassword). |
| PUT | `/api/auth/password` | Bearer | `{ currentPassword, newPassword }` → ok. **Удаляет все другие сессии** юзера, оставляет только текущую. Audit log. |

### 5.2 Telegram (смешанные)

| Метод | Путь | Auth | Описание |
|---|---|---|---|
| GET | `/api/telegram/status` | Bearer | `{ linked: boolean, telegramId?: number }` |
| POST | `/api/telegram/link/code` | Bearer | Создаёт `telegram_actions` с `action='link_code'`, `user_id` (текущий юзер), `expires_at = now + 5min`. Возвращает `{ code, expiresIn }`. |
| GET | `/api/telegram/link/check?code=…` | Bearer | Возвращает `{ status: 'pending'\|'linked'\|'expired'\|'not_found', login?: string }`. |
| POST | `/api/telegram/unlink` | Bearer | Удаляет `telegram_links`. Audit log. |
| POST | `/api/telegram/qr/login/request` | — | Создаёт `telegram_actions` с `action='qr_login'`, `user_id=NULL`, `expires_at = now + 5min`. Возвращает `{ token, deepLink, expiresIn }`. DeepLink формата `https://t.me/<bot_username>?start=login_<token>`. |
| GET | `/api/telegram/qr/login/check?token=…` | — | Возвращает `{ status: 'pending'\|'approved'\|'expired'\|'not_found', session?: { token, refreshToken, expiresIn, user } }`. |

### 5.3 Notes (защищённые, Bearer)

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/notes` | Все заметки юзера. Сортировка: `pinned DESC, created_at DESC`. |
| POST | `/api/notes` | Создать. Zod валидация. |
| PUT | `/api/notes/:id` | Частичное обновление. Проверка `note.user_id === req.user.id`. |
| DELETE | `/api/notes/:id` | Удалить. |
| PATCH | `/api/notes/:id/toggle` | `{ field: 'pinned'\|'completed' }` → переключить boolean. |

### 5.4 Presets (защищённые, Bearer)

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/presets` | Все пресеты юзера. Сортировка: `pinned DESC, created_at DESC`. |
| POST | `/api/presets` | Создать. |
| PUT | `/api/presets/:id` | Обновить. |
| DELETE | `/api/presets/:id` | Удалить. |
| PATCH | `/api/presets/:id/toggle-pin` | Pin/unpin. |

### 5.5 Settings (защищённые, Bearer)

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/settings` | `{ [key]: value }` для текущего юзера. |
| GET | `/api/settings/:key` | Одна настройка. |
| PUT | `/api/settings/:key` | `{ value }` → ok. |
| POST | `/api/settings/batch` | `{ data: { [key]: value } }` → ok. Транзакция. |

Известные ключи настроек:
- `theme.bg-primary`, `theme.bg-secondary`, `theme.bg-sidebar`
- `theme.text-primary`, `theme.text-secondary`, `theme.text-muted`
- `theme.primary`, `theme.primary-container`
- `theme.accent`, `theme.accent-hover`
- `theme.border`
- `telegram.last-notified-login` (для отслеживания)

### 5.6 Dev (защищённые, Bearer + requireDev)

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/dev/serverinfo` | `{ uptime, memory, version, users_count, sessions_count, notes_count, presets_count, bot_status }` |
| POST | `/api/dev/restart` | `pm2 reload helperdesktop-server`. Audit log. |
| POST | `/api/dev/op` | `{ login }` → делает юзера dev. Audit log. |

### 5.7 Internal (X-Bot-Secret)

| Метод | Путь | Описание |
|---|---|---|
| POST | `/api/internal/bot/qr-login-approve` | `{ token, telegramId, idempotencyKey? }`. Резолвит `user_id` через `telegram_links(telegram_id)`, сверяет, создаёт новую `sessions`, помечает `telegram_actions.status='approved'`. Возвращает `{ session }`. Идемпотентность: если `idempotencyKey` уже был — возврат предыдущего результата. |
| POST | `/api/internal/bot/link-by-code` | `{ code, telegramId, idempotencyKey? }`. Резолвит `user_id` по `telegram_actions.code`, создаёт `telegram_links`, помечает status='approved'. Возвращает `{ user_id, login }`. |
| GET | `/api/internal/bot/user-by-telegram-id?telegramId=…` | Возвращает `{ user_id, login, is_dev }` или 404. |
| POST | `/api/internal/bot/unlink-by-telegram-id` | `{ telegramId }`. Удаляет `telegram_links` по telegram_id. Audit log `telegram_unlink` (actor=bot). |

### 5.8 WebSocket

- `WS /ws` — без auth, только health-пинги от сервера каждые 10с: `{ type: 'health', timestamp, uptime }`. На connect: `{ type: 'connected' }`.

---

## 6. Telegram-бот

### 6.1 Конфигурация

- Токен: `BOT_TOKEN` env или `apps/bot/bot-config.json` (как в legacy)
- `SERVER_URL` env (default `http://localhost:3001`) — куда ходит за internal API
- Запускается через `BotManager` (в server) при старте сервера
- На каждом запросе к серверу — `X-Bot-Secret: <BOT_SHARED_SECRET>`

### 6.2 Команды

| Команда | Поведение | Inline-кнопки после ответа |
|---|---|---|
| `/start [payload]` | Если payload есть — обработка link_code (`link_<code>`) или qr_login (`login_<token>`). Иначе — главное меню. | `Привязать аккаунт` / `Войти через QR` / `Профиль` / `Статус сервера` / `Мой ID` / `Помощь` / `Отвязаться` |
| `/link` | Бот переходит в режим `awaiting_link_code`, просит ввести код. После получения — вызывает `/api/internal/bot/link-by-code`. | `Привязано` → меню |
| `/me` | Резолвит юзера через `user-by-telegram-id`. Выводит login, name, is_dev, дату привязки. Если не привязан — сообщает и предлагает `/link`. | `Отвязать` / `Обновить` |
| `/status` | `GET /api/health`. Возвращает текст «Сервер доступен» или «Сервер недоступен» + version/uptime. | `Перепроверить` |
| `/id` | Возвращает Telegram ID. | — |
| `/logout` | Вызывает `/api/internal/bot/unlink-by-telegram-id` (X-Bot-Secret) — сервер удаляет `telegram_links`. Бот **не** открывает БД напрямую (правило из §6.7). | `Отвязано` / `Отмена` |
| `/help` | Список команд с описаниями. | Меню |

**Главное меню** (одна inline-клавиатура):
```
[Привязать аккаунт] [Войти через QR]
[Профиль]          [Статус сервера]
[Мой ID]            [Помощь]
[Отвязаться]
```

### 6.3 Тон и стиль

- Без эмодзи в сообщениях (по требованию пользователя)
- Inline-кнопки — текстовые лейблы, без иконок
- Официальный тон: «Аккаунт привязан», «Сервер доступен», «Сессия завершена по таймауту»

### 6.4 Поллеры (запускаются как setInterval в отдельных async-функциях)

**Reminders (каждые 30с):**
```ts
SELECT n.*, u.login
FROM notes n
JOIN telegram_links t ON t.user_id = n.user_id
JOIN users u ON u.id = n.user_id
WHERE n.reminder_at IS NOT NULL
  AND n.reminder_at <= ?
  AND n.completed = 0
  AND t.telegram_id IS NOT NULL
```
- Если `notify_telegram = 1`: шлёт «Напоминание: {title}\n\n{body_preview}\n\n[Открыть]» (кнопка с deep-link `helperdesktop://note/<id>`)
- Очищает `reminder_at = NULL` после отправки (одноразовое)

**Notifications (каждые 30с):**
```ts
SELECT n.*, u.login
FROM notes n
JOIN telegram_links t ON t.user_id = n.user_id
WHERE n.notify_telegram = 1
  AND n.telegram_notified = 0
  AND t.telegram_id IS NOT NULL
```
- Шлёт «{title}\n\n{body_preview}\n\n[Открыть] [Отметить прочитанным]»
- Ставит `telegram_notified = 1`

### 6.5 Flow: Привязка через код (link_code)

```
1. Юзер в приложении: Settings → Telegram → "Привязать" → таб "Код"
2. App → POST /api/telegram/link/code (Bearer) → { code: "X7K9P2", expiresIn: 300 }
3. App показывает code, кнопка "Скопировать"
4. Юзер в Telegram: /link
5. Бот: "Введите код привязки" (ожидание input)
6. Юзер: "X7K9P2"
7. Бот → POST /api/internal/bot/link-by-code { code, telegramId, idempotencyKey: uuid }
   Сервер: валидирует, создаёт telegram_links, action.status='approved'
   Возвращает { user_id, login }
8. Бот: "Аккаунт привязан: {login}" + inline-меню
9. App параллельно: GET /api/telegram/link/check?code=X7K9P2 (poll каждые 2с)
   → { status: 'linked' } → закрывает модалку, обновляет UI
```

### 6.6 Flow: QR-логин в приложение (qr_login, НОВАЯ ФИЧА)

```
1. Юзер в приложении: экран логина → кнопка "Войти через Telegram"
2. App → POST /api/telegram/qr/login/request → { token, deepLink, expiresIn: 300 }
   Сервер создаёт telegram_actions { action='qr_login', token, user_id=NULL, telegram_id=NULL }
3. App показывает QR (qrcode.toDataURL от deepLink) + текст "Отсканируйте QR в Telegram"
4. Юзер сканирует в Telegram на телефоне
5. Бот: /start login_<token>
6. Бот парсит payload → token
7. Бот → GET /api/internal/bot/user-by-telegram-id?telegramId=<tg_id>
   → 404: бот "Сначала привяжите аккаунт через /link"
   → 200: { user_id, login }
8. Бот → POST /api/internal/bot/qr-login-approve { token, telegramId, userId, idempotencyKey }
   Сервер:
     a. Находит telegram_actions по token
     b. Валидирует: status='pending', not expired
     c. Находит telegram_links(telegram_id) → проверяет, что user_id совпадает с переданным (анти-spoof)
     d. Создаёт sessions (token, refresh_token, expires_at, ip, user_agent)
     e. Помечает telegram_actions.status='approved'
     f. Возвращает { session }
9. Бот: "Вход выполнен на устройстве {device_name}" + inline-меню
10. App параллельно (poll каждые 2с): GET /api/telegram/qr/login/check?token=…
    → { status: 'pending' } → продолжаем
    → { status: 'approved', session: {...} } → App сохраняет токены, переходит в MainApp
    → { status: 'expired' } → "Время истекло, попробуйте снова"
    → { status: 'not_found' } → ошибка
```

**Защита QR-логина от spoof'а:**
- `telegram_actions.user_id` не заполняется при создании (юзер ещё не залогинен)
- На шаге 8 сервер сам резолвит `user_id` через `telegram_links(telegram_id)`, сверяет с переданным ботом
- Если telegram_id не привязан ни к одному юзеру → отказ

### 6.7 Обработка ошибок и retry

- HTTP-вызовы к серверу — через Circuit Breaker (5 failed → pause 1 min) + Exponential Backoff (3 попытки, 1с/3с/9с)
- Если `SERVER_URL` недоступен при старте бота — бот логирует ошибку, выходит; BotManager рестартует
- `X-Bot-Secret` mismatch → 401, бот логирует security-событие, не падает

---

## 7. Клиент (Electron + React)

### 7.1 Структура `apps/client/src/`

```
main/                              # Главный процесс Electron
├── index.ts                       # bootstrap: app, окно, IPC-регистрация, WS
├── preload.ts                     # contextBridge → window.api
├── ipc/
│   ├── auth.ts                    # auth:* (login, save-token, list-accounts, switch, remove, change-password, set-email, get-me)
│   ├── notes.ts                   # notes:*
│   ├── presets.ts                 # presets:*
│   ├── settings.ts                # settings:*
│   ├── telegram.ts                # telegram:*
│   ├── server.ts                  # server:* (get-url, set-url, test, onHealth)
│   ├── dialog.ts                  # dialog:open-file
│   └── window.ts                  # window-min/max/close, deep-link
└── utils/
    ├── safe-storage.ts            # обёртка над Electron safeStorage, версионирование auth.json
    ├── http-client.ts             # fetch + Bearer + auto-refresh + device-id
    └── path-validation.ts         # защита от path-traversal при dialog.showOpenDialog

renderer/                          # React 19
├── main.tsx                       # bootstrap: providers → App
├── App.tsx                        # условный рендеринг: LoginScreen | MainApp
├── styles/
│   └── globals.css                # ТОЛЬКО @tailwind directives + :root CSS-переменные темы
├── components/
│   └── ui/                        # shadcn/ui: button, dialog, input, label, switch, tabs, accordion, dropdown-menu, toast, tooltip, popover, calendar, command, scroll-area, separator, badge, card, sheet, alert-dialog
├── features/                      # изолированные фичи (каждая самодостаточна)
│   ├── auth/
│   │   ├── components/ (LoginScreen, PasswordForm, QrLoginPanel, AccountSwitcher, PasswordChangeDialog, EmailChangeDialog)
│   │   ├── hooks/ (useAuth, useAccounts, useQrLogin, usePasswordChange, useEmailChange)
│   │   ├── api.ts
│   │   ├── types.ts
│   │   └── index.ts
│   ├── notes/
│   │   ├── components/ (NotesPage, NoteCard, NoteEditDialog, MarkdownEditor, MarkdownView, TagInput, ReminderPicker)
│   │   ├── hooks/ (useNotes, useCreateNote, useUpdateNote, useDeleteNote, useToggleNote)
│   │   ├── api.ts
│   │   ├── types.ts
│   │   └── index.ts
│   ├── presets/
│   │   ├── components/ (PresetsPage, PresetCard, PresetEditDialog, AppRow)
│   │   ├── hooks/ (usePresets, useCreatePreset, useUpdatePreset, useDeletePreset, useTogglePin, useLaunchPreset)
│   │   ├── api.ts
│   │   ├── types.ts
│   │   └── index.ts
│   ├── settings/
│   │   ├── components/ (SettingsPage, AccountSection, TelegramSection, ThemeSection [dev], DevSection [dev])
│   │   ├── hooks/ (useSettings, useTheme, useDevServer, useDevCommands)
│   │   ├── api.ts
│   │   ├── types.ts
│   │   └── index.ts
│   ├── layout/
│   │   ├── components/ (Titlebar, Sidebar, ServerStatusBadge, UserMenu)
│   │   └── index.ts
│   └── ai-inspector/              # dev-only, см. §7.6
│       ├── components/ (AiInspectorToggle, AiInspectorOverlay)
│       ├── hooks/ (useAiInspector)
│       ├── prompt-formatter.ts    # форматирует markdown-промт
│       └── index.ts
├── lib/
│   ├── api-client.ts              # HTTP-обёртка с auto-refresh, X-Device-Id
│   ├── query-client.ts            # TanStack Query конфиг (staleTime, retry, devtools в dev)
│   ├── ws.ts                      # WebSocket подключение к /ws, событие onHealth
│   ├── hotkeys.ts                 # регистрация глобальных хоткеев через react-hotkeys-hook
│   ├── theme.ts                   # применение CSS-переменных на :root
│   └── deep-link.ts               # helperdesktop:// обработчик
├── providers/
│   ├── QueryProvider.tsx
│   ├── HotkeyProvider.tsx
│   └── ThemeProvider.tsx
└── types/
    └── window.d.ts                # типы window.api
```

**Правила:**
- `features/*` не импортируют друг друга; общение через window.api и React Query
- `components/ui/` — только shadcn-компоненты, без изменений
- Стили: только Tailwind classes в JSX + `globals.css` (только Tailwind directives + CSS-переменные)
- Никаких per-page CSS-файлов (как в legacy)

### 7.2 IPC API (через `window.api.*`)

```ts
window.api = {
  auth: {
    login: (login, password) => Promise<TokenData>,
    saveToken: (login, tokenData) => Promise<void>,
    logout: () => Promise<void>,
    listAccounts: () => Promise<AccountInfo[]>,
    switchAccount: (login) => Promise<TokenData>,
    removeAccount: (login) => Promise<void>,
    changePassword: (current, next) => Promise<void>,
    setEmail: (email, currentPassword) => Promise<void>,
    getMe: () => Promise<User>,
  },
  notes: {
    getAll: () => Promise<Note[]>,
    create: (input) => Promise<Note>,
    update: (id, input) => Promise<Note>,
    remove: (id) => Promise<void>,
    toggle: (id, field) => Promise<Note>,
  },
  presets: {
    getAll: () => Promise<Preset[]>,
    save: (preset) => Promise<Preset>,
    delete: (id) => Promise<void>,
    launch: (id) => Promise<void>,
    togglePin: (id) => Promise<Preset>,
  },
  settings: {
    getAll: () => Promise<Record<string, unknown>>,
    get: (key) => Promise<unknown>,
    set: (key, value) => Promise<void>,
    setMany: (data) => Promise<void>,
  },
  telegram: {
    status: () => Promise<TelegramStatus>,
    linkCode: () => Promise<{ code: string, expiresIn: number }>,
    linkCheck: (code) => Promise<LinkStatus>,
    qrLoginRequest: () => Promise<{ token: string, deepLink: string, expiresIn: number }>,
    qrLoginCheck: (token) => Promise<QrLoginStatus>,
    unlink: () => Promise<void>,
  },
  server: {
    getUrl: () => Promise<string>,
    setUrl: (url) => Promise<void>,
    test: () => Promise<HealthStatus>,
    onHealth: (callback) => () => void,  // unsubscribe
  },
  dialog: {
    openFile: (filters) => Promise<string | null>,
  },
  window: {
    minimize: () => void,
    maximizeToggle: () => void,
    close: () => void,
    isMaximized: () => Promise<boolean>,
    onMaximizedChanged: (callback) => () => void,
  },
  deepLink: {
    onNote: (callback) => () => void,  // callback(id: number)
  },
}
```

Все запросы из renderer → IPC → `apiFetch()` в main → `fetch(SERVER_URL + path, { Authorization: Bearer })` с **auto-refresh токена** при 401 и заголовком `X-Device-Id: <uuid>` (генерится при первой установке, хранится в `userData/device.json`).

### 7.3 Экраны (роутинг через state, без react-router)

**`LoginScreen`** (если `!auth.user`):
- Layout: левая колонка (логотип, название, версия) + правая колонка (формы)
- Правая колонка:
  - `PasswordForm` — поля `login + password`, кнопка "Войти" (или "Создать аккаунт" если логин свободен)
  - `AccountSwitcher` — если есть сохранённые аккаунты: dropdown для выбора
  - `QrLoginPanel` — кнопка "Войти через Telegram" → разворачивается QR + polling
- При успехе → переход в `MainApp`

**`MainApp`** (если `auth.user`):
- `Titlebar` (48px, draggable, custom): бренд, `ServerStatusBadge`, `UserMenu`, `[AiInspectorToggle]` (dev), кнопки окна
- `Sidebar` (240px): `Заметки / Пресеты / Настройки`, внизу — `ServerStatusBadge` + `UserMenu`
- Content area: текущая страница (NotesPage | PresetsPage | SettingsPage)
- `CommandPalette` — overlay по Ctrl+K (поверх всего)

### 7.4 Страницы

**NotesPage:**
- Search bar
- Секции: `Закреплённые` / `Активные` / `Завершённые`
- Карточки `NoteCard`: чекбокс complete, заголовок, body (MarkdownView, обрезанный до 200 символов), теги, иконка reminder, индикатор `notify_telegram` (✈ — это Phosphor иконка в карточке, не в боте), кнопки `pin / edit / delete`
- Кнопка `+ Новая заметка` (или `Ctrl+N`)

**PresetsPage:**
- Search bar
- Секции: `Закреплённые` / `Все`
- Карточки `PresetCard`: иконка, название, apps, кнопки `pin / launch / edit / delete`
- Кнопка `+ Новый пресет` (или `Ctrl+P`)

**SettingsPage** (accordion):
1. **Аккаунт** — login (read-only), email (смена через EmailChangeDialog), кнопка "Сменить пароль" → PasswordChangeDialog
2. **Telegram** — статус привязки, telegram_id, кнопки "Привязать" (открывает TelegramSection dialog) / "Отвязать"
3. **Оформление** (только `is_dev`) — 11 color-picker'ов для CSS-переменных, "Сохранить" / "Сбросить"
4. **Сервер** (только `is_dev`) — input `SERVER_URL`, кнопки "Применить" / "Проверить"; ниже — `ServerConsole` (textarea + input команд `/serverinfo`, `/restart`, `/op <login>`)

### 7.5 Состояние

- **Auth state** — React Context (`AuthProvider`): `user`, `tokens`, `activeAccount`, `listAccounts`, `isAuthenticated`
- **Server data** (notes, presets, settings, telegram status) — TanStack Query с optimistic updates
- **Theme** — React Context + CSS-переменные на `:root` через `document.documentElement.style.setProperty()`
- **Command palette** — локальный state в `features/command-palette/` (или в `features/layout/`), реестр команд собирается из фичей
- **UI state** (открытые модалки, активная страница) — локальный state в фичах

### 7.6 AI-инспектор (dev-only, новая фича)

**Расположение:** `Titlebar` для dev-юзеров (toggle `AiInspectorToggle`).

**Поведение:**
- Toggle хранится в `localStorage` (не в server state) — дев-настройка
- При включении:
  - При `mouseover` на любом React-элементе — подсветка бирюзовой обводкой (1px dashed), tooltip с именем компонента и файлом
  - При `click` — копирует в буфер обмена Markdown-промт:

  ```markdown
  # Fix request

  ## Component
  - **Name:** NoteCard
  - **File:** apps/client/src/features/notes/components/NoteCard.tsx
  - **Line:** 42

  ## Props
  ```ts
  {
    note: { id: 5, title: "Test", pinned: false, ... },
    onToggle: fn,
    onEdit: fn
  }
  ```

  ## State (from hooks)
  - isEditing: false
  - isHover: true

  ## Issue
  <!-- Опиши что исправить -->
  ```

- Промт содержит заглушку `<!-- Опиши что исправить -->` — пользователь дописывает в редакторе и вставляет в LLM
- Реализация: React DevTools API (`@react-devtools/extension`) или собственный fiber-walker через `__reactFiber$<id>` — финальный выбор на этапе плана

### 7.7 Multi-account

`userData/auth.json` (зашифрованный `safeStorage`):
```ts
{
  version: 1,
  activeAccount: string,
  accounts: {
    [login: string]: {
      login: string,
      password: string,        // для re-auth при expired refresh
      token: string,
      refreshToken: string,
      userId: number,
      lastUsedAt: number,
    }
  }
}
```

`userData/device.json` (не шифрованный):
```ts
{ deviceId: string }  // UUID v4, генерится при первой установке
```

На LoginScreen: если есть сохранённые аккаунты — показываем `AccountSwitcher`. При логине — запись в `accounts[login]`, обновление `activeAccount`. Remove — очистка записи.

### 7.8 Markdown в заметках

- `react-markdown` + `remark-gfm` (GFM tables, task lists, strikethrough)
- `rehype-sanitize` (allowed tags whitelist) — защита от XSS
- `MarkdownEditor` — Codemirror с markdown-режимом, live preview tab (split view)
- `MarkdownView` — рендер в read-only (карточка заметки), обрезание до N символов для превью

### 7.9 Глобальные хоткеи

| Хоткей | Действие |
|---|---|
| `Ctrl+K` / `Cmd+K` | Открыть command palette |
| `Esc` | Закрыть верхний модал/dialog |
| `Ctrl+N` | Новая заметка (на странице заметок) |
| `Ctrl+P` | Новый пресет (на странице пресетов) |
| `Ctrl+,` | Открыть настройки |
| `Ctrl+Shift+I` / `Cmd+Option+I` | DevTools (Electron-фича, всегда работает) |

### 7.10 Тема и кастомизация (dev-only)

**Tailwind config** использует CSS-переменные:
```css
:root {
  --bg-primary: #08080a;
  --bg-secondary: #14141a;
  --bg-sidebar: rgba(8, 8, 10, 0.92);
  --text-primary: #ffffff;
  --text-secondary: #cbc3d7;
  --text-muted: #958ea0;
  --primary: #d0bcff;
  --primary-container: #a078ff;
  --accent: #d0bcff;
  --accent-hover: #b49aff;
  --border: rgba(255, 255, 255, 0.08);
}
```

`ThemeProvider`:
- `useEffect` при mount и при изменении user.settings: читает `theme.*` ключи → применяет на `document.documentElement.style.setProperty()`
- 11 токенов редактируются через color-picker'ы в `Settings → Оформление`
- "Сохранить" → `POST /api/settings/batch` с дельтой
- "Сбросить" → восстановить дефолты из CSS

### 7.11 Главный процесс (Electron main)

- `app.setAsDefaultProtocolClient('helperdesktop')` — deep-link
- `BrowserWindow` с `frame: false`, `minWidth: 800`, `minHeight: 500`, `webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, preload: ... }`
- Регистрирует IPC обработчики (см. §7.2)
- WS-клиент к `SERVER_URL/ws` с auto-reconnect (5с), события `server:health` в renderer
- Fuses: `EnableCookieEncryption: true`, `OnlyLoadAppFromAsar: true`, `EnableEmbeddedAsarIntegrityValidation: true`
- ASAR включён
- Squirrel installer hook для Windows
- Makers: Squirrel (Windows), ZIP (mac), DEB/RPM (Linux)

---

## 8. Безопасность

### 8.1 Что починено против legacy

| Проблема legacy | Решение |
|---|---|
| `/api/auth/op` без auth | За `Bearer` + `requireDev` |
| `/api/auth/email`, `/api/auth/password` без auth | За `Bearer` + `verifyPassword(currentPassword)` |
| `/api/auth/login` отдаёт 404 для несуществующего логина | Всегда 401 с тем же текстом «Invalid credentials» |
| `bot-links.json` — два источника правды | Только `telegram_links` таблица. Бот ходит через `/api/internal/bot/*` |
| Хардкод пути `../../HelperDesktop.server/helperdesktop.db` в боте | Бот не открывает БД напрямую (или открывает только для чтения `/logout`, см. план) |
| Drizzle установлен, но не используется | Drizzle по назначению: schema, queries, миграции |
| CSP только в prod | CSP в dev и prod (в dev `unsafe-eval` для Vite HMR) |
| `data` таблица без типизации | `settings` с zod-валидацией по известным ключам |
| Пароли в разных форматах | Единый формат `scrypt:N:r:p:salt:hash` (N=16384, r=8, p=1) |
| `safeStorage` без версионирования | `auth.json` с `version: 1`, миграция при апгрейде |
| WS broadcast не используется | Удалён; только health-пинги |
| Bot exit code не обрабатывался | BotManager логирует, шлёт alert, auto-restart с backoff |
| `/restart` без проверок | `requireDev` + `NODE_ENV=production` check, graceful shutdown |

### 8.2 Усиление защиты

**Auth & tokens:**
- **Refresh token rotation**: каждый refresh создаёт новую пару, старый получает `refresh_token_used_at`. **Повторное использование** used refresh → revoke всех сессий юзера + audit log `token_reuse_detected` + уведомление в Telegram
- **Account lockout**: 5 failed login за 15 мин с одного IP+login → блокировка на 30 мин. Хранится в `login_attempts`. `requireAuth`/auth endpoints проверяют
- **Password policy** (zod): минимум 8 символов, заглавная + строчная + цифра
- **Session invalidation на password change**: смена пароля удаляет все другие сессии юзера, оставляет текущую
- **Audit log** (таблица `audit_log`): логируем все sensitive operations
- **Notification on new login**: если `device_id` неизвестен для юзера → уведомление в Telegram (если привязан): «Новый вход с устройства {device_name} в {timestamp}»
- **Constant-time comparison**: `crypto.timingSafeEqual` для токенов, паролей, secret
- **HTTPS-only в проде**: за nginx с Let's Encrypt, `helmet.hsts({ maxAge: 31536000, includeSubDomains: true, preload: true })`
- **No CORS credentials**: только Bearer — CSRF невозможен по дизайну

**Bot↔Server:**
- **Circuit breaker**: 5 failed requests подряд → pause 1 мин
- **Retry with exponential backoff**: 3 попытки, 1с/3с/9с
- **Idempotency keys**: для `link-by-code`, `qr-login-approve` — если бот ретраит, сервер не создаст дубль
- **BOT_SHARED_SECRET**: 32+ байта, env, обязателен в prod (fail-fast)

**Anti-DoS:**
- Per-IP rate-limit (дополнительно к глобальному): `/api/auth/*` — 5/мин на IP
- Per-user rate-limit: `/api/notes`, `/api/presets` — 60/мин на userId
- Request body size: `1mb`

### 8.3 Middleware (порядок `app.use`)

```
1. helmet (CSP, HSTS, frameguard, noSniff)
2. cors (whitelist из env CORS_ORIGINS)
3. express.json({ limit: '1mb' })
4. requestId + requestLogger (с маскированием password/token/refreshToken)
5. rateLimit (100/мин prod, 1000/мин dev) — глобальный
6. routes:
   - /api/auth/login, /api/auth/register, /api/auth/refresh
     → дополнительно auth rate-limit (5/мин per IP)
   - /api/telegram/qr/login/* — без requireAuth
   - /api/internal/* — requireBotSecret (X-Bot-Secret)
   - /api/dev/* — requireAuth + requireDev
   - /api/auth/email, /api/auth/password — requireAuth
   - всё остальное /api/* — requireAuth
7. 404 handler
8. error handler (логирует через logger.error с requestId, отдаёт { error, requestId })
```

### 8.4 Логирование

- Уровни: `trace / debug / info / warn / error / fatal`
- Файлы: `logs/app-YYYY-MM-DD.log` (всё), `logs/error-YYYY-MM-DD.log` (error/fatal)
- В dev — цветной вывод в консоль; в prod — JSON
- Request ID через `AsyncLocalStorage`-style стек
- Helpers: `request`, `requestError`, `startup`, `shutdown`, `db`, `auth`, `security`, `websocket`, `bot`, `performance`
- `maskSensitive(data, keys)` — маскирует значения по списку ключей

---

## 9. Надёжность

- **DB backup**: cron-таск каждый день в 03:00 — `sqlite3 .backup /var/backups/helperdesktop-YYYY-MM-DD.db`. Retention 7 дней
- **Cleanup job** (каждый час, встроен в server):
  - `DELETE FROM telegram_actions WHERE expires_at < ? AND status = 'pending'`
  - `DELETE FROM sessions WHERE expires_at < ?`
  - `DELETE FROM login_attempts WHERE created_at < datetime('now', '-1 day')`
  - `DELETE FROM audit_log WHERE created_at < datetime('now', '-90 days')` (retention 90 дней)
- **Health check depth**:
  - `/api/health` (public) — пингует БД (`SELECT 1`), возвращает 503 если недоступна
  - `/api/internal/health/deep` (X-Bot-Secret) — пингует бота (через BotManager.getStatus())
- **Graceful shutdown**:
  - SIGTERM → перестать принимать connections → finish in-flight requests (10с) → закрыть БД → `process.exit(0)`
  - Если 10с истекли — `process.exit(1)`
- **Bot auto-restart**: BotManager при exit code !== 0 — рестарт с backoff (1с, 5с, 30с, 1м, 5м). После 5 рестартов за 10 мин — stop + alert в лог
- **Process supervision**: PM2 ecosystem file (см. §10)
- **Schema versioning**: drizzle-kit versioned migrations, forward-only

---

## 10. Сборка и деплой

### 10.1 Dev-режим

```bash
# Установка
git clone <repo>
cd HelperDesktop
pnpm install

# Env
cp .env.example .env
# Заполнить: SERVER_PORT, JWT_SECRET, BOT_SHARED_SECRET, BOT_TOKEN, BOT_USERNAME

# Миграции (один раз)
pnpm --filter @helper/server db:migrate

# Запуск
pnpm dev              # server + bot + client параллельно
pnpm dev:server       # отдельно сервер
pnpm dev:bot          # отдельно бот
pnpm dev:client       # отдельно клиент (Electron)
```

### 10.2 Env-переменные

```bash
# Server
NODE_ENV=development
SERVER_PORT=3001
JWT_SECRET=                       # обязателен в prod, в dev генерится автоматически с warning
BOT_SHARED_SECRET=                # обязателен в prod
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
LOG_LEVEL=debug

# Bot
BOT_TOKEN=                        # или из bot-config.json (как в legacy)
BOT_USERNAME=HelperDesktopBot
SERVER_URL=http://localhost:3001  # куда бот ходит за internal API

# Client (compile-time, через Vite)
VITE_DEFAULT_SERVER_URL=http://localhost:3001
```

### 10.3 Прод-сборка

```bash
pnpm --filter @helper/server build       # tsc → apps/server/dist/
pnpm --filter @helper/server db:generate # drizzle-kit generate → apps/server/drizzle/
pnpm --filter @helper/bot build          # tsc → apps/bot/dist/
pnpm --filter @helper/client package     # electron-forge make → out/make/
# → .exe (Squirrel, win), .zip (mac), .deb/.rpm (linux)
```

### 10.4 Деплой на 178.172.137.167

`scripts/deploy.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail
SERVER="root@178.172.137.167"
PATH="/opt/helperdesktop"
ssh "$SERVER" << EOF
  set -e
  cd $PATH
  git pull origin main
  pnpm install --frozen-lockfile
  pnpm --filter @helper/server db:migrate
  pnpm --filter @helper/server build
  pnpm --filter @helper/bot build
  pm2 reload ecosystem.config.js
  pm2 logs --lines 20
EOF
```

### 10.5 PM2 ecosystem

`ecosystem.config.js`:
```js
module.exports = {
  apps: [
    {
      name: 'helperdesktop-server',
      script: 'apps/server/dist/index.js',
      cwd: '/opt/helperdesktop',
      instances: 1,
      max_memory_restart: '512M',
      env: { NODE_ENV: 'production' },
      error_file: 'logs/server-error.log',
      out_file: 'logs/server-out.log',
      time: true,
    },
  ],
};
```

### 10.6 Reverse proxy (nginx)

```nginx
server {
  listen 443 ssl http2;
  server_name helper.example.com;
  # certs via Let's Encrypt (certbot)

  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location /ws {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

### 10.7 Backup (cron)

```cron
# Каждый день в 03:00 — бэкап БД
0 3 * * * cd /opt/helperdesktop && sqlite3 apps/server/helperdesktop.db ".backup /var/backups/helperdesktop-$(date +\%F).db"
# Удаление бэкапов старше 7 дней
0 4 * * * find /var/backups -name "helperdesktop-*.db" -mtime +7 -delete
```

### 10.8 CI/CD (GitHub Actions)

`.github/workflows/ci.yml`:
- **lint-and-typecheck** job: `pnpm install` → `pnpm lint` → `pnpm typecheck` (на каждый PR)
- **test** job: `pnpm test` (Vitest) + `pnpm test:e2e` (Playwright) — на каждый PR
- **build** job: `pnpm build` всех apps — на push в main

`.github/workflows/deploy.yml`:
- **deploy** job: на tag `v*` — checkout → setup node → `bash scripts/deploy.sh`

**Coverage threshold:** 70% для server, 50% для client/bot

---

## 11. Тестирование

| Тип | Инструмент | Scope |
|---|---|---|
| **Unit** | Vitest | Пароли (scrypt verifyPassword), zod-схемы, helpers, prompt-formatter (AI inspector) |
| **Integration** | Vitest + Supertest | API endpoints с in-memory SQLite, auth flow, telegram actions flow, refresh rotation, lockout |
| **E2E (server)** | Vitest | Register → login → CRUD notes → webhook от бота (полный flow) |
| **E2E (client)** | Playwright | Login screen → MainApp → создать заметку → выйти → войти через QR (mock бота) |
| **Bot unit** | Vitest | Команды, payload-парсинг, поллеры (с mock БД) |

**Mocking:** Бот в e2e тестах заменяется на HTTP-моки (через MSW или вручную). БД в integration — in-memory SQLite.

**Fixtures:** `apps/server/src/__fixtures__/` — примеры юзеров, заметок, пресетов для тестов.

---

## 12. Документация (в репозитории)

| Файл | Содержание |
|---|---|
| `README.md` | Quickstart, env, scripts, структура |
| `SECURITY.md` | Threat model, как репортить уязвимости, security policy |
| `RUNBOOK.md` | Что делать при падениях (server/bot/БД), как восстановить из backup, как сделать юзера dev через БД |
| `DEPLOY.md` | Шаги деплоя, накатка миграций, откат версии, проверка работоспособности |
| `docs/superpowers/specs/2026-07-16-helperdesktop-design.md` | Этот файл |
| `docs/superpowers/plans/<date>-helperdesktop-impl.md` | Implementation plan (создаётся через writing-plans skill) |

---

## 13. Открытые вопросы

Эти вопросы решаются на этапе написания implementation plan:

1. **Бот → `/logout`**: ✅ решено — только через `/api/internal/bot/unlink-by-telegram-id`. Бот не открывает БД напрямую (правило §6.7). Endpoint добавляется в §5.7.
2. **AI-инспектор**: React DevTools API vs собственный fiber-walker? — **на плане** (проверить стабильность обоих)
3. **Server URL в dev-режиме клиента**: hardcode в `VITE_DEFAULT_SERVER_URL` или первый запуск показывает input? — **на плане** (предлагаю: hardcode + Settings позволяет сменить, как в legacy)
4. **Token revocation при password change**: revoke всех кроме текущей или всех включая текущую? — **решено: все кроме текущей** (юзер не должен логиниться заново после смены пароля)
5. **Drizzle migrations в dev при изменении schema**: autogen + auto-apply или требовать ручного `db:migrate`? — **на плане** (предлагаю: auto-apply в dev, ручной в prod)

---

## 14. История решений

| Решение | Альтернативы | Почему выбрано |
|---|---|---|
| pnpm workspaces | npm workspaces, Turborepo, Nx | pnpm — стандарт для современных monorepo; Turborepo overkill для 4 пакетов |
| Drizzle | Prisma, Kysely, сырой SQL | Уже был в legacy, type-safe, лёгкий, миграции из коробки |
| Tailwind + shadcn/ui | MUI, Chakra, vanilla CSS | Копируемые компоненты (owned code), легко кастомизировать тему, нет рантайм-зависимости |
| Inline keyboards в боте | Только текст | UX — пользователь явно просил |
| QR-логин как новая фича | Только пароль | Пользователь явно просил |
| Refresh token rotation | Просто long-lived refresh | Безопасность — защита от утечки |
| Server-spawns-bot | Отдельный PM2 процесс для бота | Упрощает deployment, гарантирует доступ к БД; минус — tight coupling (acceptable) |
| Account lockout | Нет | Защита от brute-force |
| Audit log | Нет | Compliance / debugging |
| Без эмодзи в боте | С эмодзи | Пользователь явно просил «более официально» |
| Глобальный WebSocket broadcast удалён | Оставить для realtime sync | YAGNI — пока не нужен, добавим позже |
| Нет react-router | react-router, TanStack Router | Один state в App.tsx достаточно для 3 страниц |
| Server-relative auth через Bearer | Cookies + CSRF | Bearer — нативно для desktop SPA, CSRF невозможен |

---

## 15. Acceptance criteria

Спека считается реализованной, когда:

- [ ] `pnpm install && pnpm db:migrate && pnpm dev` запускает server + bot + client без ошибок
- [ ] Регистрация, логин, refresh, logout работают end-to-end
- [ ] 5 неудачных логинов подряд → account lockout на 30 мин
- [ ] Смена пароля → revoke всех других сессий
- [ ] Повторное использование used refresh → revoke всех сессий + audit log
- [ ] Создание/редактирование/удаление заметок и пресетов работает
- [ ] Markdown рендерится в карточках заметок
- [ ] Reminder в заметке → через 30с после времени → уведомление в Telegram
- [ ] Привязка Telegram через код: `POST /api/telegram/link/code` → код виден в приложении → `/link` в боте → `linked`
- [ ] QR-логин: `POST /api/telegram/qr/login/request` → QR виден → сканирование в Telegram → auto-login
- [ ] Бот не принимает `X-Bot-Secret` с неверным значением (401)
- [ ] `/api/dev/*` возвращает 403 для не-dev юзеров
- [ ] `/api/auth/login` для несуществующего юзера возвращает 401 (не 404)
- [ ] `/api/auth/op` без Bearer возвращает 401
- [ ] При смене server URL в dev-режиме — клиент переключается
- [ ] `Ctrl+K` открывает command palette с поиском по заметкам/пресетам/страницам
- [ ] AI-инспектор (dev) копирует корректный markdown-промт с props/state
- [ ] Multi-account: переключение между аккаунтами работает без рестарта
- [ ] Cleanup job каждый час удаляет expired sessions/actions/attempts
- [ ] Бот auto-restart с backoff при crash
- [ ] `pnpm test` проходит все unit/integration тесты
- [ ] `pnpm test:e2e` проходит Playwright e2e
- [ ] `pnpm build` собирает все apps
- [ ] `pnpm --filter @helper/client package` создаёт .exe/.zip/.deb
- [ ] Деплой `bash scripts/deploy.sh` на 178.172.137.167 работает end-to-end
- [ ] Backup cron создаёт `helperdesktop-YYYY-MM-DD.db` каждый день
- [ ] Coverage: ≥70% для server, ≥50% для client/bot

---

**Конец спеки.** Дальше — `writing-plans` skill для создания implementation plan.
