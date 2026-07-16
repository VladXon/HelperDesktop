# HelperDesktop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Полностью переписать HelperDesktop с нуля как pnpm-workspace monorepo: Electron-клиент, Express-сервер (Drizzle + SQLite), Telegram-бот (GrammY) с QR-логином, inline-кнопками, Markdown в заметках и AI-инспектором.

**Architecture:** 3-звенная (Electron -> Express -> Bot), pnpm-workspace, single source of truth в SQLite, бот общается с сервером через internal HTTP (X-Bot-Secret), читает БД read-only только для pollers (reminders/notifications).

**Tech Stack:** Node 20, TypeScript 5.8 strict, pnpm 9, React 19, Vite 5, Electron 43, Express 4, Drizzle ORM 0.45, better-sqlite3, GrammY 1.34, Tailwind 3, shadcn/ui (Radix), TanStack Query 5, zod 4, helmet, Vitest, Playwright, PM2.

**Spec:** `docs/superpowers/specs/2026-07-16-helperdesktop-design.md` — открывать параллельно для деталей API/схем.

---

## Global Constraints

- Node 20.x, pnpm 9.x, TypeScript 5.8 strict
- pnpm-workspace: `apps/*` + `packages/*`
- Импорты только через workspace aliases: `@helper/shared`, `@helper/client`, `@helper/server`, `@helper/bot`
- Между `apps/*` — НИКАКИХ прямых импортов, только через `@helper/shared`
- CSS: только Tailwind utility classes в JSX + `globals.css` (только Tailwind directives + CSS-переменные)
- shadcn/ui: `apps/client/src/components/ui/`, копируются через `npx shadcn@latest add ...`
- В боте: никаких эмодзи, официальный тон
- Без комментариев в коде (если явно не попросят)
- scrypt: N=16384, r=8, p=1, формат `scrypt:N:r:p:salt:hash`
- JWT: HS256, `JWT_EXPIRES_IN=24h`, `REFRESH_EXPIRES_IN=7d`
- Refresh token rotation (одноразовый, повтор -> revoke всех сессий)
- Account lockout: 5 failed / 15 мин -> 30 мин блокировка
- Rate limit: 100/мин prod, 1000/мин dev глобально; 5/мин per IP на auth
- CSP: helmet в dev и prod (в dev `unsafe-eval` для Vite)
- TDD: тест ДО реализации, проверить fail, потом реализация, проверить pass
- Частые коммиты conventional commits

---

## File Structure

```
HelperDesktop/
  package.json, pnpm-workspace.yaml, tsconfig.base.json, .nvmrc, .gitignore, .env.example
  .github/workflows/{ci,deploy}.yml
  ecosystem.config.js (PM2)
  scripts/{dev,deploy,backup}.sh
  README.md, SECURITY.md, RUNBOOK.md, DEPLOY.md
  apps/
    client/   # Electron + Vite + React + Tailwind + shadcn/ui
    server/   # Express + Drizzle + better-sqlite3
    bot/      # GrammY
  packages/
    shared/   # типы + zod-схемы
```

---

# Phase 1: Foundation

## Task 1.1: Init pnpm workspace

Files: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.nvmrc`, `.gitignore`

- [ ] Step 1: `.nvmrc` -> `20`
- [ ] Step 2: `.gitignore` (см. спеку §0 — node_modules, dist, *.db, *.log, .env, coverage, и т.д.)
- [ ] Step 3: `tsconfig.base.json` со strict, noUncheckedIndexedAccess, ES2022, module ESNext, moduleResolution Bundler
- [ ] Step 4: `pnpm-workspace.yaml` -> `packages: [apps/*, packages/*]`
- [ ] Step 5: root `package.json` (private, type module, scripts: dev/build/lint/typecheck/test/test:e2e, devDeps: concurrently, typescript)
- [ ] Step 6: `npm i -g pnpm@9 && pnpm install`
- [ ] Step 7: `git init && git add . && git commit -m "chore: init pnpm workspace with TypeScript base config"`

## Task 1.2: packages/shared (types + zod)

Files: `packages/shared/{package.json, tsconfig.json, vitest.config.ts}` + `src/{index.ts, types/{user,note,preset,telegram,settings}.ts, schemas/{auth,note,preset,setting,telegram,dev,internal}.ts, __tests__/schemas.test.ts}`

- [ ] Step 1-3: package.json (`@helper/shared`, zod dep, vitest devDep), tsconfig.json (extends base, declaration, outDir dist), vitest.config.ts
- [ ] Step 4: `src/types/user.ts` — User, TokenData, AccountInfo (см. спеку §0)
- [ ] Step 5: `src/types/note.ts` — Note (полный интерфейс по спеке §0)
- [ ] Step 6: `src/types/preset.ts` — PresetApp, Preset
- [ ] Step 7: `src/types/telegram.ts` — TelegramStatus, LinkCodeResponse, LinkStatus (union), QrLoginRequest, QrLoginStatus (union)
- [ ] Step 8: `src/types/settings.ts` — THEME_TOKEN_KEYS (const tuple 11 ключей), ThemeTokenKey, ThemeTokens
- [ ] Step 9: `src/schemas/auth.ts` — loginSchema (login regex `/^[a-zA-Z0-9_-]+$/` 3-64, password 1-256), registerSchema (=loginSchema + name optional), passwordPolicySchema (min 8 + uppercase + lowercase + digit), refreshSchema, changeEmailSchema, changePasswordSchema. Zod v4.
- [ ] Step 10: `src/schemas/note.ts` — noteCreateSchema (title max 200, body max 10000, tags array max 10, reminder_at int nullable, notify_telegram bool, все с default), noteUpdateSchema (partial), noteToggleSchema (field enum pinned|completed)
- [ ] Step 11: `src/schemas/preset.ts` — presetAppSchema, presetCreateSchema (name 1-128, icon max 32, apps array max 32), presetUpdateSchema
- [ ] Step 12: `src/schemas/setting.ts` — settingValueSchema (z.unknown), settingSetSchema, settingBatchSchema
- [ ] Step 13: `src/schemas/telegram.ts` — telegramStatusSchema, telegramLinkCodeResponseSchema, telegramLinkCheckResponseSchema (discriminated union), telegramQrLoginRequestSchema, telegramQrLoginCheckResponseSchema (discriminated union со session payload)
- [ ] Step 14: `src/schemas/dev.ts` — opSchema, commandSchema
- [ ] Step 15: `src/schemas/internal.ts` — botQrLoginApproveSchema, botLinkByCodeSchema, botUnlinkByTelegramIdSchema (telegramId positive int)
- [ ] Step 16: `src/index.ts` — re-export всего
- [ ] Step 17: `src/__tests__/schemas.test.ts` — тесты для loginSchema (accept valid, reject invalid chars), passwordPolicySchema (accept strong, reject short, reject no digit), noteCreateSchema (defaults, max length), presetCreateSchema (apps validation), botQrLoginApproveSchema (positive telegramId)
- [ ] Step 18: `pnpm install && pnpm build && pnpm test` — all PASS
- [ ] Step 19: commit

## Task 1.3: apps/server skeleton + health

Files: `apps/server/{package.json, tsconfig.json, vitest.config.ts, .env.example}` + `src/{index.ts, config.ts, utils/logger.ts}`

- [ ] Step 1: `package.json` (`@helper/server`, deps: @helper/shared, better-sqlite3, cors, drizzle-orm, express, express-rate-limit, helmet, jsonwebtoken, ws, zod; devDeps: types, drizzle-kit, supertest, tsx, vitest)
- [ ] Step 2: `tsconfig.json` (extends base, outDir dist, types: node)
- [ ] Step 3: `vitest.config.ts` (pool forks, fileParallelism false)
- [ ] Step 4: `src/config.ts` — config object (nodeEnv, isProd, port, jwtSecret auto-gen with warning, botSharedSecret requiredInProd, botUsername, corsOrigins, logLevel, dbPath, botPath, version), SCRYPT_PARAMS export
- [ ] Step 5: `src/utils/logger.ts` — Logger class с LEVELS, mask() для SENSITIVE_KEYS (password/token/etc), format() (colored dev / JSON prod), requestIdStack, file rotation в prod (logs/app-YYYY-MM-DD.log), helpers startup/shutdown/db/auth/security/ws/bot
- [ ] Step 6: `src/index.ts` — express app, helmet (CSP в prod, HSTS в prod), cors (whitelist prod / * dev), express.json 1mb, GET /api/health, listen + shutdown handler (SIGTERM/SIGINT, 10s timeout)
- [ ] Step 7: `.env.example`
- [ ] Step 8: `pnpm install`, `pnpm dev` в одном терминале, `curl /api/health` в другом — должен вернуть ok
- [ ] Step 9: commit

## Task 1.4: Drizzle schema + migrations

Files: `apps/server/drizzle.config.ts` + `src/db/{schema.ts, index.ts, migrate.ts, migrations/*}` + `src/__tests__/db.test.ts`

- [ ] Step 1: `drizzle.config.ts` (schema, out migrations, dialect sqlite, dbCredentials.url from DB_PATH env)
- [ ] Step 2: `src/db/schema.ts` — все таблицы: users, sessions, telegramLinks, telegramActions, notes, presets, settings, auditLog, loginAttempts. С foreign keys (onDelete cascade), индексами (idx_sessions_token, idx_sessions_refresh_token, idx_sessions_user_id, idx_telegram_actions_expires, idx_notes_user_id, idx_presets_user_id, idx_audit_log_user_id, idx_login_attempts_created). Boolean через `mode: 'boolean'`. PK для settings = (user_id, key). Действие telegramActions — enum 'link_code' | 'qr_login'. Статус — enum 'pending' | 'approved' | 'expired'. (Полные определения см. в спеке §0.)
- [ ] Step 3: `src/db/index.ts` — Database (better-sqlite3), pragma WAL/foreign_keys/busy_timeout/synchronous, drizzle(), export db/rawDb
- [ ] Step 4: `src/db/migrate.ts` — migrate(db, migrationsFolder) + log
- [ ] Step 5: `pnpm db:generate` -> создать `src/db/migrations/0000_*.sql`
- [ ] Step 6: `pnpm db:migrate` -> `helperdesktop.db` создан
- [ ] Step 7: `src/__tests__/db.test.ts` — тест in-memory db: создать users, insert, cascade delete sessions
- [ ] Step 8: `pnpm test` -> 3 PASS
- [ ] Step 9: commit

## Task 1.5: Password utility (scrypt)

Files: `apps/server/src/auth/{password.ts, __tests__/password.test.ts}`

- [ ] Step 1: test — hash/verify, different salts, exports params
- [ ] Step 2: run -> FAIL
- [ ] Step 3: `password.ts` — hashPassword (random 16 bytes salt, scrypt N=16384 r=8 p=1 keylen 64, base64url), verifyPassword (parse, timingSafeEqual)
- [ ] Step 4: run -> PASS
- [ ] Step 5: commit

## Task 1.6: JWT + sessions (with rotation)

Files: `apps/server/src/auth/{jwt.ts, sessions.ts, __tests__/jwt.test.ts}`

- [ ] Step 1: test — sign/verify, garbage, refresh rotation (one-time, повтор -> null), revokeAllSessionsForUser
- [ ] Step 2: run -> FAIL
- [ ] Step 3: `jwt.ts` — signToken (HS256, jti uuid, expiresIn 24h), verifyToken (catch -> null)
- [ ] Step 4: `sessions.ts` — createSession (signToken + insert sessions), rotateSession (find by refreshToken where used_at is null, mark used, create new; if not found AND stale exists -> revokeAllSessionsForUser), revokeSession, revokeAllSessionsForUser, cleanupExpiredSessions
- [ ] Step 5: run -> PASS
- [ ] Step 6: commit

## Task 1.7: Middleware (requestId, errorHandler, rateLimit, auth, dev, bot)

Files: `apps/server/src/middleware/{request-id.ts, error-handler.ts, rate-limit.ts, auth.ts}`

- [ ] Step 1: `request-id.ts` — extend Request с requestId, generate uuid, push в logger stack, setHeader, pop on finish
- [ ] Step 2: `error-handler.ts` — HttpError class, errorHandler middleware (status 500 default, message только для <500, логирует 5xx, отдает { error, requestId })
- [ ] Step 3: `rate-limit.ts` — globalRateLimit (100/1000 мин), authRateLimit (20/15 мин), authPerMinLimit (5/мин) — все keyGenerator по ip
- [ ] Step 4: `auth.ts` — AuthedUser type, extend Request; requireAuth (Bearer -> verifyToken + load user; x-auth-login + x-auth-password -> verifyPassword; оба log security event), requireDev (user.is_dev === 1), requireBotSecret (X-Bot-Secret timingSafeEqual, fail if not set в prod)
- [ ] Step 5: commit

## Task 1.8: Audit + lockout services

Files: `apps/server/src/services/{audit.ts, lockout.ts}`

- [ ] Step 1: `audit.ts` — AuditAction union, audit() function (insert в auditLog, metadata JSON.stringify)
- [ ] Step 2: `lockout.ts` — recordLoginAttempt, isLockedOut (5 failed за 15 мин, lockout 30 мин с последней failed), clearFailedAttempts
- [ ] Step 3: commit

## Task 1.9: Auth routes + integrate

Files: `apps/server/src/routes/auth.ts` + `src/__tests__/auth.test.ts` + modify `src/index.ts`

- [ ] Step 1: `routes/auth.ts` — authRouter. POST /register (если существует -> verify password, иначе create; всегда audit login; никогда 404 — 401 на wrong). POST /login (lockout check, verify, 401 на wrong/не существует; clear failed on success). POST /token (как login + createSession). POST /refresh (rotateSession, token_reuse_detected audit). POST /logout (requireAuth, revokeSession). GET /me (requireAuth, return user). PUT /email (requireAuth, verifyPassword currentPassword, update, audit). PUT /password (requireAuth, verifyPassword, hash new, update, revokeAllSessionsForUser, audit, re-create session). Все валидируются через zod из @helper/shared. INVALID_CREDS_MSG = 'Invalid credentials'.
- [ ] Step 2: modify `index.ts` — requestId middleware, globalRateLimit, register authRouter, errorHandler (после всех роутов), import './db/index.js' для side-effect
- [ ] Step 3: test — register new/existing/wrong, login non-existent (401 не 404), token, refresh rotation, logout invalidates, password change re-creates session
- [ ] Step 4: `pnpm test` -> PASS. NOTE: vi.doMock может не работать с ESM; если проблема — настроить vitest config для module reset (например, vitest-mock-extended или рефактор с dependency injection в routes/auth.ts)
- [ ] Step 5: commit

## Task 1.10: WebSocket health endpoint

Files: `apps/server/src/ws.ts` + modify `src/index.ts`

- [ ] Step 1: `ws.ts` — attachWebSocket(server), WebSocketServer path /ws, on connection send connected msg, setInterval 10s send {type:'health', timestamp, uptime}, clear on close
- [ ] Step 2: modify `index.ts` — import attachWebSocket, call после app.listen
- [ ] Step 3: commit

---

# Phase 2: Server — Data Endpoints

## Task 2.1: Notes CRUD

Files: `apps/server/src/routes/notes.ts` + modify `src/index.ts`

- [ ] Step 1: `routes/notes.ts` — notesRouter (requireAuth), rowToNote (JSON.parse tags, boolean casts). GET / (own notes, order pinned DESC, created_at DESC). POST / (zod parse, insert, return). PUT /:id (ownership check 404 if not, partial update). DELETE /:id (ownership check). PATCH /:id/toggle (zod parse field, flip boolean, update)
- [ ] Step 2: register in `index.ts`
- [ ] Step 3: commit

## Task 2.2: Presets CRUD

Files: `apps/server/src/routes/presets.ts` + modify `src/index.ts`

- [ ] Step 1: `routes/presets.ts` — presetsRouter (requireAuth), rowToPreset. GET / POST / PUT /:id DELETE /:id PATCH /:id/toggle-pin — зеркало notes
- [ ] Step 2: register
- [ ] Step 3: commit

## Task 2.3: Settings endpoints

Files: `apps/server/src/routes/settings.ts` + modify `src/index.ts`

- [ ] Step 1: `routes/settings.ts` — settingsRouter (requireAuth). GET / (parse all values из JSON). GET /:key (404 if not, JSON.parse value). PUT /:key (upsert). POST /batch (transaction, upsert all)
- [ ] Step 2: register
- [ ] Step 3: commit

## Task 2.4: Telegram public endpoints

Files: `apps/server/src/routes/telegram.ts` + modify `src/index.ts`

- [ ] Step 1: `routes/telegram.ts` — telegramRouter. GET /status (requireAuth, lookup telegramLinks by user_id). POST /link/code (requireAuth, gen code 6 chars, insert telegramActions action=link_code user_id current). GET /link/check (requireAuth, query code, return status pending/linked/expired/not_found). POST /qr/login/request (NO auth, gen token 32 bytes, insert action=qr_login без user_id/telegram_id, return deepLink `https://t.me/{botUsername}?start=login_{token}`). GET /qr/login/check (NO auth, query token, return status + on approved load most recent session for user from sessions table, return as TokenData format). POST /unlink (requireAuth, delete link, audit)
- [ ] Step 2: register
- [ ] Step 3: commit

## Task 2.5: Internal endpoints for bot

Files: `apps/server/src/routes/internal.ts` + modify `src/index.ts`

- [ ] Step 1: `routes/internal.ts` — internalRouter (requireBotSecret). POST /link-by-code (find latest pending link_code action, insert telegramLinks, mark action approved, audit). GET /user-by-telegram-id (find link by tg_id, return user). POST /qr-login-approve (find qr_login action, check not expired, find telegram_links by telegramId, createSession, mark action approved + user_id + telegram_id, return session, audit bot_login_approved). POST /unlink-by-telegram-id (find link by tg_id, delete, audit)
- [ ] Step 2: register
- [ ] Step 3: commit

## Task 2.6: Dev endpoints

Files: `apps/server/src/routes/dev.ts` + modify `src/index.ts`

- [ ] Step 1: `routes/dev.ts` — devRouter (requireAuth + requireDev). GET /serverinfo (uptime, memory, version, nodeEnv, counts для каждой таблицы). POST /restart (только в prod, audit, schedule spawn self + exit). POST /op (zod parse login, set is_dev=1, audit)
- [ ] Step 2: register
- [ ] Step 3: commit

## Task 2.7: Cleanup job

Files: `apps/server/src/services/cleanup.ts` + modify `src/index.ts`

- [ ] Step 1: `services/cleanup.ts` — startCleanupJob (interval 1h, run сразу, delete expired telegram_actions/sessions/login_attempts старше 1d/audit_log старше 90d, log counts, try/catch)
- [ ] Step 2: modify `index.ts` — startCleanupJob, clearInterval в shutdown
- [ ] Step 3: commit

## Task 2.8: BotManager

Files: `apps/server/src/services/bot-manager.ts` + modify `src/index.ts`

- [ ] Step 1: `services/bot-manager.ts` — BotManager class (child: ChildProcess | null, restartCount, firstRestartAt, stopping). start() — проверить package.json exists, spawn (Win: cmd /c npx tsx src/index.ts; *nix: npx tsx src/index.ts), set env SERVER_URL + BOT_MANAGED, pipe stdout/stderr, on exit scheduleRestart. scheduleRestart() — backoff [1s, 5s, 30s, 1m, 5m], max 5 за 10 мин, после лимита — give up + log. stop() — kill SIGTERM, после 5s SIGKILL
- [ ] Step 2: modify `index.ts` — new BotManager(botPath, serverUrl).start(), await stop в shutdown
- [ ] Step 3: commit

---

# Phase 3: Bot

## Task 3.1: Bot skeleton + server client

Files: `apps/bot/{package.json, tsconfig.json, vitest.config.ts, bot-config.example.json}` + `src/{index.ts, config.ts}` + `src/api/{circuit-breaker.ts, server-client.ts}` + `src/keyboards.ts`

- [ ] Step 1: `package.json` (`@helper/bot`, deps: @helper/shared, grammy; devDeps: tsx, typescript, vitest)
- [ ] Step 2: `tsconfig.json` (extends base, outDir dist, types node)
- [ ] Step 3: `vitest.config.ts`
- [ ] Step 4: `src/config.ts` — load token (env BOT_TOKEN или bot-config.json), serverUrl (env SERVER_URL default localhost:3001), username
- [ ] Step 5: `src/api/circuit-breaker.ts` — CircuitBreaker class (5 failures -> open 60s, после таймаута reset)
- [ ] Step 6: `src/api/server-client.ts` — request() через circuit breaker + withRetry (3 попытки, 1s/3s/9s backoff), X-Bot-Secret header. API: linkByCode, userByTelegramId, approveQrLogin, unlinkByTelegramId, health
- [ ] Step 7: `src/keyboards.ts` — mainMenu() InlineKeyboard (Привязать, Войти через QR, Профиль, Статус сервера, Мой ID, Помощь, Отвязаться — по 2 в ряд)
- [ ] Step 8: `bot-config.example.json` -> `{"token": "YOUR_BOT_TOKEN_HERE"}`
- [ ] Step 9: `src/index.ts` — Bot, session middleware, register start command (приветствие + mainMenu), register help/id commands, bot.start()
- [ ] Step 10: `pnpm install`, запустить вручную с токеном, проверить /start /help /id в Telegram
- [ ] Step 11: commit

## Task 3.2: Bot commands (link, me, status, logout, qr_login handler)

Files: `apps/bot/src/commands/{start.ts, link.ts, me.ts}`

- [ ] Step 1: `commands/start.ts` — registerStart: handle /start [payload]. Если payload `link_<code>` — linkByCode через server, ответ "Аккаунт привязан: {login}" + mainMenu. Если `login_<token>` — userByTelegramId (если 404 -> "сначала /link"), approveQrLogin, ответ "Вход выполнен. Вернитесь в приложение" + mainMenu. Иначе — mainMenu
- [ ] Step 2: `commands/link.ts` — /link: "Откройте приложение, сгенерируйте код и отправьте его сюда". session.on awaitingLink для следующего текст-сообщения — linkByCode
- [ ] Step 3: `commands/me.ts` — /me: userByTelegramId, "Логин: {login}, Dev: {да/нет}" + mainMenu. /status: health(), "Сервер доступен (v{version})" или "Сервер недоступен" + mainMenu. /id: "Ваш Telegram ID: {id}" + mainMenu. /logout: unlinkByTelegramId, "Аккаунт отвязан" + mainMenu. /help: список команд + mainMenu. callbackQuery /^cmd:/ -> переход в соответствующую команду (или answerCallbackQuery)
- [ ] Step 4: modify `index.ts` — импорт и register всех commands, start polling reminders/notifications (см. Task 3.3)
- [ ] Step 5: commit

## Task 3.3: Pollers (reminders, notifications)

Files: `apps/bot/src/polling/{reminders.ts, notifications.ts}`

NOTE: pollers открывают БД read-only напрямую (`../server/helperdesktop.db`) для join notes + telegram_links. Это единственное исключение — для mutations бот идёт через HTTP.

- [ ] Step 1: `polling/reminders.ts` — open better-sqlite3 db (../server/helperdesktop.db), setInterval 30s, select notes where reminder_at <= now AND completed=0, для каждой — найти telegram_links, если есть — отправить сообщение "Напоминание: {title}\n\n{body preview 200 chars}" (deepLink кнопка), update reminder_at=NULL
- [ ] Step 2: `polling/notifications.ts` — setInterval 30s, select notes where notify_telegram=1 AND telegram_notified=0, отправить "{title}\n\n{body preview}" + InlineKeyboard [Открыть, Прочитано], update telegram_notified=1
- [ ] Step 3: в `index.ts` — startReminders(bot) + startNotifications(bot) после bot.start()
- [ ] Step 4: commit

---

# Phase 4: Client — Foundation

## Task 4.1: Client skeleton (Electron + Vite + React + Tailwind + shadcn)

Files: `apps/client/{package.json, tsconfig.json, tsconfig.node.json, vite.{main,preload,renderer}.config.ts, forge.config.ts, tailwind.config.ts, postcss.config.js, components.json, index.html}` + `src/renderer/{main.tsx, App.tsx, styles/globals.css, types/window.d.ts}`

- [ ] Step 1: `package.json` (`@helper/client`, main `.vite/build/main.js`, scripts dev/build/package/make/typecheck/test/test:e2e; deps: @helper/shared, @phosphor-icons/react, @tanstack/react-query, framer-motion, qrcode, react, react-dom, react-hotkeys-hook, react-markdown, rehype-sanitize, remark-gfm, ws; devDeps: @electron-forge/*, @electron/fuses, @playwright/test, electron, electron-squirrel-startup, tailwindcss, postcss, autoprefixer, tailwind-merge, class-variance-authority, clsx, vite, @vitejs/plugin-react, types, vitest, typescript)
- [ ] Step 2: `tsconfig.json` (extends base, jsx react-jsx, types vite/node, paths `@/*` -> `src/renderer/*`)
- [ ] Step 3: `vite.main.config.ts` (external: ['ws'])
- [ ] Step 4: `vite.preload.config.ts` (external: ['electron'])
- [ ] Step 5: `vite.renderer.config.ts` (react plugin, alias)
- [ ] Step 6: `forge.config.ts` (packagerConfig asar, makers Squirrel/Zip/Deb/Rpm, plugins VitePlugin (build для main + preload, renderer для renderer entry), FusesPlugin (CookieEncryption, OnlyLoadAppFromAsar, EmbeddedAsarIntegrityValidation))
- [ ] Step 7: `tailwind.config.ts` (content scan, theme extend colors -> CSS variables)
- [ ] Step 8: `postcss.config.js` (tailwindcss + autoprefixer)
- [ ] Step 9: `components.json` (shadcn config, baseColor neutral)
- [ ] Step 10: `index.html` (root div, script src)
- [ ] Step 11: `src/renderer/styles/globals.css` (только @tailwind directives + :root CSS variables)
- [ ] Step 12: `src/renderer/types/window.d.ts` (window.api типы по спеке §7.2)
- [ ] Step 13: `src/renderer/main.tsx` (createRoot, render App)
- [ ] Step 14: `src/renderer/App.tsx` (заглушка — div "Hello HelperDesktop")
- [ ] Step 15: `pnpm install` (из корня), `pnpm --filter @helper/client dev` — должно открыться Electron-окно с "Hello"
- [ ] Step 16: commit

## Task 4.2: shadcn/ui setup + базовые компоненты

- [ ] Step 1: `npx shadcn@latest init` в `apps/client` (использует components.json)
- [ ] Step 2: добавить компоненты: `npx shadcn@latest add button input label dialog tabs switch accordion dropdown-menu toast tooltip popover calendar command scroll-area separator badge card sheet alert-dialog avatar textarea select checkbox`
- [ ] Step 3: проверить, что в `src/renderer/components/ui/` лежат все компоненты
- [ ] Step 4: commit

## Task 4.3: Main process + IPC + preload

Files: `apps/client/src/main/{index.ts, preload.ts}` + `src/main/ipc/*.ts` + `src/main/utils/{safe-storage.ts, http-client.ts, path-validation.ts}`

- [ ] Step 1: `src/main/utils/safe-storage.ts` — encrypt (safeStorage encryptString, prefix 'enc:'), decrypt (префикс check), readJson/writeJson в userData/<file>, версионированный auth.json ({version: 1, activeAccount, accounts}), при ошибке decrypt — clear и prompt login
- [ ] Step 2: `src/main/utils/http-client.ts` — apiFetch(path, init): подгружает token из auth.json (по activeAccount), refresh при 401 (один retry), заголовок Authorization Bearer + X-Device-Id (из device.json, генерится при первом старте). Если refresh fails — clear current account tokens
- [ ] Step 3: `src/main/utils/path-validation.ts` — validatePathWithinBase (защита от path traversal для dialog.showOpenDialog)
- [ ] Step 4: `src/main/ipc/auth.ts` — IPC handlers: auth:login (apiFetch POST /api/auth/token, saveToken), auth:save-token, auth:logout (apiFetch POST /api/auth/logout + clear tokens), auth:load-credentials (вернуть activeAccount), auth:list-accounts, auth:switch-account, auth:remove-account, auth:change-password (apiFetch PUT), auth:set-email (apiFetch PUT), auth:get-me (apiFetch GET /api/auth/me), auth:check-dev (вернуть user.is_dev === 1)
- [ ] Step 5: `src/main/ipc/notes.ts` — IPC handlers: notes:get-all, notes:create, notes:update, notes:remove, notes:toggle (apiFetch wrappers)
- [ ] Step 6: `src/main/ipc/presets.ts` — IPC handlers: presets:get-all, presets:save, presets:delete, presets:launch (через child_process.spawn, для runAsAdmin на Windows — PowerShell Start-Process -Verb RunAs), presets:toggle-pin
- [ ] Step 7: `src/main/ipc/settings.ts` — IPC handlers: settings:get-all, settings:get, settings:set, settings:set-many (apiFetch)
- [ ] Step 8: `src/main/ipc/telegram.ts` — IPC handlers: telegram:status, telegram:link-code (POST /api/telegram/link/code), telegram:link-check (GET ?code=), telegram:qr-login-request (POST), telegram:qr-login-check (GET ?token=), telegram:unlink
- [ ] Step 9: `src/main/ipc/server.ts` — IPC handlers: server:get-url (из server-url.json в userData), server:set-url, server:test (apiFetch /api/health), server:on-health (WebSocket ws клиент, auto-reconnect 5s, broadcast через webContents.send)
- [ ] Step 10: `src/main/ipc/dialog.ts` — dialog:open-file (validatePathWithinBase для filters exe/bat/cmd/lnk)
- [ ] Step 11: `src/main/ipc/window.ts` — window-minimize, window-maximize-toggle, window-close, window-is-maximized, deep-link setup (app.setAsDefaultProtocolClient('helperdesktop'), second-instance handler, open-url handler -> send 'deep-link:note')
- [ ] Step 12: `src/main/preload.ts` — contextBridge.exposeInMainWorld('api', {auth, notes, presets, settings, telegram, server, dialog, window, deepLink}) через invoke() и on() helpers
- [ ] Step 13: `src/main/index.ts` — app ready -> createWindow (frame:false, minWidth:800, minHeight:500, webPreferences с contextIsolation/sandbox/nodeIntegration:false, preload), register deep link, register all IPC handlers, app.on second-instance / open-url для deep-link, devtools shortcut (Ctrl+Shift+I)
- [ ] Step 14: `pnpm --filter @helper/client dev` — окно открывается, DevTools работают, electron-builder forge make собирает .exe
- [ ] Step 15: commit

## Task 4.4: Providers + lib (Query, Theme, Hotkey, api-client, queryClient, ws, hotkeys, deep-link, theme)

Files: `apps/client/src/renderer/{providers/*, lib/*}`

- [ ] Step 1: `lib/utils.ts` — cn() через clsx + tailwind-merge (shadcn стандарт)
- [ ] Step 2: `lib/query-client.ts` — QueryClient (staleTime 5min, retry 1, devtools в dev)
- [ ] Step 3: `lib/theme.ts` — applyTheme(settings) — для каждого theme.* ключа setProperty на document.documentElement.style, getDefaultTheme()
- [ ] Step 4: `lib/deep-link.ts` — onNoteLink(cb) -> window.api.deepLink.onNote(cb)
- [ ] Step 5: `lib/hotkeys.ts` — глобальные хоткеи через react-hotkeys-hook (Ctrl+K = command palette, Esc = close modal, Ctrl+N = new note, Ctrl+P = new preset, Ctrl+, = settings)
- [ ] Step 6: `providers/QueryProvider.tsx` — обёртка над QueryClientProvider + Devtools
- [ ] Step 7: `providers/ThemeProvider.tsx` — контекст {settings, applySettings}; на mount грузит window.api.settings.getAll(), applyTheme; useEffect подписывается на изменения
- [ ] Step 8: `providers/HotkeyProvider.tsx` — контекст для регистрации hotkey actions; хуки useHotkey('ctrl+k', openPalette)
- [ ] Step 9: commit

---

# Phase 5: Client — Features

## Task 5.1: Auth feature (LoginScreen, PasswordForm, QrLoginPanel, AccountSwitcher)

Files: `apps/client/src/renderer/features/auth/{api.ts, types.ts, hooks/{useAuth.ts, useAccounts.ts, useQrLogin.ts}, components/{LoginScreen.tsx, PasswordForm.tsx, QrLoginPanel.tsx, AccountSwitcher.tsx, PasswordChangeDialog.tsx, EmailChangeDialog.tsx}, index.ts}`

- [ ] Step 1: `api.ts` — loginFn, registerFn, listAccounts, switchAccount, removeAccount, getMe, changePassword, setEmail — все обёртки над window.api.auth.* с возврат-типами из @helper/shared
- [ ] Step 2: `hooks/useAuth.ts` — useAuth (useState user, loadFromStorage, login -> save tokens + setUser, logout, refreshMe); useAuthUser (TanStack Query: queryFn getMe, enabled если есть token)
- [ ] Step 3: `hooks/useAccounts.ts` — useAccounts (TanStack Query listAccounts)
- [ ] Step 4: `hooks/useQrLogin.ts` — useMutation qrLoginRequest -> useEffect polling qrLoginCheck каждые 2с до approved/expired/not_found, на approved — save tokens + setUser
- [ ] Step 5: `components/PasswordForm.tsx` — shadcn Form (login, password), submit -> login mutation, при 404 -> register
- [ ] Step 6: `components/QrLoginPanel.tsx` — кнопка "Войти через Telegram" -> qrLoginRequest + qrcode.toDataURL(deepLink), polling status, при approved -> onLogin
- [ ] Step 7: `components/AccountSwitcher.tsx` — shadcn DropdownMenu: список сохранённых аккаунтов (login, "Активный"), actions switchAccount/removeAccount
- [ ] Step 8: `components/LoginScreen.tsx` — левая колонка (бренд) + правая (PasswordForm + QrLoginPanel + AccountSwitcher если есть)
- [ ] Step 9: `components/PasswordChangeDialog.tsx` — форма (current + new + confirm), zod validate (passwordPolicySchema), submit
- [ ] Step 10: `components/EmailChangeDialog.tsx` — форма (email + currentPassword), submit
- [ ] Step 11: `index.ts` — re-export
- [ ] Step 12: commit

## Task 5.2: Layout (Titlebar, Sidebar, ServerStatusBadge, UserMenu, App routing)

Files: `apps/client/src/renderer/features/layout/{components/*.tsx, index.ts, hooks/useServerHealth.ts}`

- [ ] Step 1: `hooks/useServerHealth.ts` — TanStack Query: queryFn window.api.server.test каждые 30s, plus subscription на onHealth
- [ ] Step 2: `components/ServerStatusBadge.tsx` — indicator (online green dot / offline red dot) + label, клик -> открывает settings
- [ ] Step 3: `components/Titlebar.tsx` — draggable 48px, brand + ServerStatusBadge + UserMenu + window buttons (min/max/close), dev: AiInspectorToggle (см. Phase 6)
- [ ] Step 4: `components/Sidebar.tsx` — 240px, навигация (Заметки, Пресеты, Настройки), active gradient слева, внизу ServerStatusBadge + UserMenu
- [ ] Step 5: `components/UserMenu.tsx` — shadcn DropdownMenu: user name, switch account, change password, change email, logout
- [ ] Step 6: `index.ts` — re-export
- [ ] Step 7: modify `App.tsx` — if !user -> LoginScreen; else -> MainApp (Titlebar + Sidebar + content area по activePage state)
- [ ] Step 8: commit

## Task 5.3: Notes feature

Files: `apps/client/src/renderer/features/notes/{api.ts, types.ts, hooks/*.ts, components/*.tsx, index.ts}`

- [ ] Step 1: `api.ts` — getAll, create, update, remove, toggle — обёртки над window.api.notes.* 
- [ ] Step 2: `hooks/useNotes.ts` — useNotes (TanStack Query getAll)
- [ ] Step 3: `hooks/useCreateNote.ts` — useMutation + optimistic update
- [ ] Step 4: `hooks/useUpdateNote.ts` — useMutation + optimistic
- [ ] Step 5: `hooks/useDeleteNote.ts` — useMutation + optimistic
- [ ] Step 6: `hooks/useToggleNote.ts` — useMutation + optimistic
- [ ] Step 7: `components/MarkdownView.tsx` — react-markdown + remark-gfm + rehype-sanitize, опционально truncate
- [ ] Step 8: `components/TagInput.tsx` — chip input (Enter добавляет, max 10, удаление по X)
- [ ] Step 9: `components/ReminderPicker.tsx` — shadcn Calendar + time input, clear button
- [ ] Step 10: `components/MarkdownEditor.tsx` — split: textarea (или simplemde) + live preview
- [ ] Step 11: `components/NoteCard.tsx` — checkbox complete, title, MarkdownView (truncated), tags, ReminderPicker compact, NotifyTelegram indicator (paper plane icon), pin/edit/delete actions
- [ ] **NOTE: NotifyTelegram indicator — Phosphor icon `PaperPlaneTilt`, НЕ emoji. Это в клиенте, не в боте.**
- [ ] Step 12: `components/NoteEditDialog.tsx` — shadcn Dialog: title input, MarkdownEditor, TagInput, ReminderPicker, notify_telegram switch (disabled если Telegram не привязан)
- [ ] Step 13: `components/NotesPage.tsx` — search bar, секции (Закреплённые / Активные / Завершённые), кнопка "Новая заметка" (или Ctrl+N), NoteCard список
- [ ] Step 14: `index.ts` — re-export
- [ ] Step 15: commit

## Task 5.4: Presets feature

Files: `apps/client/src/renderer/features/presets/{api.ts, types.ts, hooks/*.ts, components/*.tsx, index.ts}`

- [ ] Step 1: `api.ts` — getAll, save, delete, launch, togglePin
- [ ] Step 2: `hooks/*.ts` — usePresets, useCreatePreset, useUpdatePreset, useDeletePreset, useTogglePin, useLaunchPreset
- [ ] Step 3: `components/AppRow.tsx` — name input, path input + browse button (window.api.dialog.openFile с фильтрами exe/bat/cmd/lnk), runAsAdmin switch, remove button
- [ ] Step 4: `components/PresetCard.tsx` — icon (Phosphor icon name or emoji), name, apps count, pin/launch/edit/delete actions
- [ ] Step 5: `components/PresetEditDialog.tsx` — name, icon, список AppRow (add/remove)
- [ ] Step 6: `components/PresetsPage.tsx` — search, секции (Закреплённые / Все), кнопка "Новый пресет" (Ctrl+P)
- [ ] Step 7: `index.ts` — re-export
- [ ] Step 8: commit

## Task 5.5: Settings feature

Files: `apps/client/src/renderer/features/settings/{api.ts, types.ts, hooks/*.ts, components/*.tsx, index.ts}`

- [ ] Step 1: `api.ts` — обёртки над window.api.settings.*
- [ ] Step 2: `hooks/useSettings.ts` — useSettings, useUpdateSettings (TanStack Query, optimistic)
- [ ] Step 3: `hooks/useTheme.ts` — useTheme (применяет settings.theme.* на :root через lib/theme.ts)
- [ ] Step 4: `hooks/useDevCommands.ts` — useMutation: serverinfo, restart, op — все через window.api.server.test? НЕТ — нужны новые IPC: добавить в server.ts handlers server:dev-serverinfo, server:dev-restart, server:dev-op
- [ ] **NOTE: dev IPC handlers** — добавить в `src/main/ipc/server.ts`: server:dev-serverinfo (apiFetch GET /api/dev/serverinfo), server:dev-restart (apiFetch POST), server:dev-op (apiFetch POST)
- [ ] Step 5: `components/AccountSection.tsx` — login (read-only), email (change), кнопка "Сменить пароль" -> PasswordChangeDialog
- [ ] Step 6: `components/TelegramSection.tsx` — статус (linked/not linked), telegram_id, кнопки "Привязать" / "Отвязать"; при нажатии "Привязать" -> встроенная мини-форма (code -> POST /link/code, poll /link/check, на linked обновить статус)
- [ ] Step 7: `components/ThemeSection.tsx` (только is_dev) — 11 color-picker'ов для theme.* ключей, "Сохранить" (setMany) / "Сбросить" (default values)
- [ ] Step 8: `components/DevConsole.tsx` (только is_dev) — textarea output + input command (/serverinfo, /restart, /op <login>) + submit
- [ ] Step 9: `components/DevSection.tsx` (только is_dev) — DevConsole
- [ ] Step 10: `components/SettingsPage.tsx` — shadcn Accordion: Аккаунт, Telegram, Оформление (dev), Сервер (dev — input SERVER_URL, кнопки Применить/Проверить, DevConsole)
- [ ] Step 11: `index.ts` — re-export
- [ ] Step 12: commit

## Task 5.6: Command palette

Files: `apps/client/src/renderer/features/layout/components/CommandPalette.tsx` + registry

- [ ] Step 1: `CommandPalette.tsx` — shadcn Command overlay (Ctrl+K), секции (Pages / Notes / Presets), фильтрация, Enter = action
- [ ] Step 2: registry собирает команды из features (через экспорт `commands` из features/{notes,presets,settings,layout}/index.ts)
- [ ] Step 3: интеграция в App.tsx — overlay поверх всего
- [ ] Step 4: commit

---

# Phase 6: Client — Dev (AI Inspector + Polish)

## Task 6.1: AI Inspector (dev-only)

Files: `apps/client/src/renderer/features/ai-inspector/{prompt-formatter.ts, hooks/useAiInspector.ts, components/{AiInspectorToggle.tsx, AiInspectorOverlay.tsx}, index.ts}`

- [ ] Step 1: `prompt-formatter.ts` — formatPrompt(componentInfo): string — генерирует markdown формат по спеке §7.6 (Component name, File, Line, Props, State, Issue placeholder)
- [ ] Step 2: `hooks/useAiInspector.ts` — useFiberWalker: при включении document.addEventListener('mouseover', hover) + ('click', click) — через `__reactFiber$<id>` получить fiber, найти Component name, file (через __source если есть), props, state, скопировать markdown в clipboard
- [ ] **DECISION (из спеки §0):** использовать React DevTools API (`__REACT_DEVTOOLS_GLOBAL_HOOK__`) если доступен; иначе fallback на собственный fiber walker. Оба варианта реализовать, основной — DevTools API
- [ ] Step 3: `components/AiInspectorToggle.tsx` — toggle в Titlebar (только is_dev), state в localStorage
- [ ] Step 4: `components/AiInspectorOverlay.tsx` — при включённом inspector: подсветка элемента при hover (border), tooltip с component name
- [ ] Step 5: `index.ts` — re-export
- [ ] Step 6: integrate в Titlebar (render toggle при is_dev)
- [ ] Step 7: commit

## Task 6.2: Global hotkeys integration

- [ ] Step 1: в `App.tsx` — useHotkey('ctrl+k', openCommandPalette), useHotkey('escape', closeTopModal), useHotkey('ctrl+n', () => navigateTo('notes', { newNote: true })), useHotkey('ctrl+p', () => navigateTo('presets', { newPreset: true })), useHotkey('ctrl+,', () => navigateTo('settings'))
- [ ] Step 2: commit

## Task 6.3: Deep-link handling

- [ ] Step 1: в `App.tsx` — useEffect: window.api.deepLink.onNote((id) => { navigateTo('notes', { editNoteId: id }) })
- [ ] Step 2: commit

---

# Phase 7: Testing

## Task 7.1: Server tests (unit + integration)

Files: `apps/server/src/__tests__/*.test.ts`

- [ ] Step 1: password.test.ts (Task 1.5) — done
- [ ] Step 2: jwt.test.ts (Task 1.6) — done
- [ ] Step 3: auth.test.ts (Task 1.9) — done
- [ ] Step 4: notes.test.ts — integration: register -> token -> create note -> get all -> update -> toggle -> delete
- [ ] Step 5: presets.test.ts — аналогично
- [ ] Step 6: settings.test.ts — integration: token -> setMany -> getAll
- [ ] Step 7: telegram-flow.test.ts — link/code -> bot link-by-code -> status linked; qr/request -> bot approve -> status approved
- [ ] Step 8: `pnpm test` -> all PASS
- [ ] Step 9: commit

## Task 7.2: Bot tests

Files: `apps/bot/src/__tests__/*.test.ts`

- [ ] Step 1: `server-client.test.ts` — мок fetch, проверка retries, X-Bot-Secret header, circuit breaker
- [ ] Step 2: `circuit-breaker.test.ts` — открывается после 5 fails, закрывается после timeout
- [ ] Step 3: `pnpm test` -> all PASS
- [ ] Step 4: commit

## Task 7.3: Client unit tests (Vitest)

Files: `apps/client/src/**/*.test.ts`

- [ ] Step 1: `lib/theme.test.ts` — applyTheme правильно ставит CSS variables
- [ ] Step 2: `lib/utils.test.ts` — cn() правильно мержит классы
- [ ] Step 3: `features/ai-inspector/prompt-formatter.test.ts` — formatPrompt дает валидный markdown
- [ ] Step 4: `pnpm test` -> all PASS
- [ ] Step 5: commit

## Task 7.4: Client e2e (Playwright)

Files: `apps/client/e2e/*.spec.ts`

- [ ] Step 1: `playwright.config.ts` — testDir e2e, use electron, reuseExistingServer, timeout
- [ ] Step 2: `e2e/login.spec.ts` — запустить electron, type login/password, submit, expect MainApp
- [ ] Step 3: `e2e/notes.spec.ts` — login -> new note -> type -> save -> expect в списке
- [ ] Step 4: `e2e/presets.spec.ts` — login -> new preset -> add app -> save -> expect в списке
- [ ] Step 5: `pnpm test:e2e` -> all PASS
- [ ] Step 6: commit

---

# Phase 8: CI/CD

## Task 8.1: GitHub Actions CI

Files: `.github/workflows/ci.yml`

- [ ] Step 1: workflow — on pull_request + push to main. Jobs: install (pnpm), lint (pnpm lint), typecheck (pnpm typecheck), test (pnpm test), build (pnpm build)
- [ ] Step 2: commit

## Task 8.2: GitHub Actions Deploy

Files: `.github/workflows/deploy.yml`

- [ ] Step 1: workflow — on tag v*. Jobs: deploy — checkout, setup-node 20, pnpm install, db:migrate на сервере, build, pm2 reload (через SSH secret)
- [ ] Step 2: добавить secrets в GitHub: SSH_PRIVATE_KEY, SERVER_HOST, SERVER_USER
- [ ] Step 3: commit

---

# Phase 9: Deploy & Docs

## Task 9.1: PM2 ecosystem

Files: `ecosystem.config.js`

- [ ] Step 1: ecosystem.config.js — app helperdesktop-server, script apps/server/dist/index.js, cwd /opt/helperdesktop, instances 1, max_memory_restart 512M, env prod, log files
- [ ] Step 2: commit

## Task 9.2: Scripts (dev, deploy, backup)

Files: `scripts/{dev.sh, deploy.sh, backup.sh}`

- [ ] Step 1: `dev.sh` — `pnpm dev` (chmod +x)
- [ ] Step 2: `deploy.sh` — ssh root@178.172.137.167 "cd /opt/helperdesktop && git pull && pnpm install --frozen-lockfile && pnpm db:migrate && pnpm build && pm2 reload ecosystem.config.js"
- [ ] Step 3: `backup.sh` — sqlite3 .backup команда
- [ ] Step 4: commit

## Task 9.3: Documentation

Files: `README.md`, `SECURITY.md`, `RUNBOOK.md`, `DEPLOY.md`

- [ ] Step 1: `README.md` — quickstart (clone, pnpm install, db:migrate, pnpm dev), env, scripts, structure (ccылка на спеку и план)
- [ ] Step 2: `SECURITY.md` — threat model, security policy, как репортить уязвимости
- [ ] Step 3: `RUNBOOK.md` — что делать при падениях server/bot/БД, как восстановить из backup, как сделать юзера dev через БД
- [ ] Step 4: `DEPLOY.md` — шаги деплоя, накатка миграций, откат, проверка работоспособности
- [ ] Step 5: commit

## Task 9.4: nginx + cron на сервере

Files: deployment instructions в `DEPLOY.md`

- [ ] Step 1: добавить в DEPLOY.md секцию "Initial server setup" — конфиг nginx (/etc/nginx/sites-available/helper), Let's Encrypt, cron для backup (`0 3 * * *` ...), PM2 startup
- [ ] Step 2: commit

## Task 9.5: Final smoke test

- [ ] Step 1: `pnpm install && pnpm db:migrate && pnpm dev` — server стартует на 3001, bot стартует, client открывается
- [ ] Step 2: register test user -> login -> create note -> sync через bot (если бот настроен) — manual
- [ ] Step 3: `pnpm build` — все apps собираются
- [ ] Step 4: `pnpm --filter @helper/client package` — .exe создаётся в out/
- [ ] Step 5: `bash scripts/deploy.sh` — если есть доступ к серверу, деплой работает
- [ ] Step 6: commit (если есть изменения)

---

# Self-Review Notes

**Spec coverage:**
- Architecture & monorepo: Task 1.1-1.2 ✓
- Data model (Drizzle): Task 1.4 ✓
- Auth (rotation, lockout, audit): Task 1.5-1.9 ✓
- Notes/Presets/Settings: Phase 2 ✓
- Telegram public + internal endpoints: Task 2.4-2.5 ✓
- BotManager with restart: Task 2.8 ✓
- Bot commands (link, qr_login, me, status, etc): Task 3.1-3.2 ✓
- Bot pollers: Task 3.3 ✓
- Client (Electron, Vite, React, Tailwind, shadcn): Task 4.1-4.3 ✓
- Auth feature (login, qr, multi-account): Task 5.1 ✓
- Layout (Titlebar, Sidebar): Task 5.2 ✓
- Notes (with Markdown): Task 5.3 ✓
- Presets (synced): Task 5.4 ✓
- Settings (theme dev, server console dev): Task 5.5 ✓
- Command palette: Task 5.6 ✓
- AI Inspector (dev): Task 6.1 ✓
- Hotkeys, deep-link: Task 6.2-6.3 ✓
- Tests: Phase 7 ✓
- CI/CD: Phase 8 ✓
- Deploy: Phase 9 ✓

**Spec requirements not in plan (TODO on plan stage):**
- Idempotency keys в internal endpoints (Task 2.5) — упомянуто в спеке, добавлено в роуты; в плане упрощено, ключи опциональны в zod-схеме. OK.
- Notification on new login (device_id not seen) — в спеке, в плане не реализовано явно. ВАЖНО: добавить в Task 1.9 auth routes (POST /token): если device_id не в sessions для этого user -> audit + Telegram notify (если привязан)
- Account lockout response should mention remaining time — упрощено в плане, OK
- shadcn UI components selection — финальный набор определится на Task 4.2

**Open questions resolved during plan:**
- Bot /logout: через /api/internal/bot/unlink-by-telegram-id ✓
- Bot pollers DB read: разрешено read-only ✓
- AI inspector: React DevTools API + fallback fiber walker ✓
- Password change session revocation: revoke all + re-create session for current user ✓

---

# End of Plan

После сохранения плана — вызвать subagent-driven-development или executing-plans skill для пошагового исполнения.
