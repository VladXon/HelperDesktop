# HelperDesktop — AGENTS.md

## Project Overview

Monorepo (pnpm workspace) Electron desktop app + Express backend + Telegram bot.
Помощник для управления заметками, пресетами приложений и интеграцией с Telegram.

## Architecture

```
Electron (React 19) ←HTTPS/WS→ Express + Drizzle/SQLite ←internal HTTP→ Telegram Bot (GrammY)
```

Клиент общается с сервером по HTTPS и WebSocket. Бот обращается к серверу по internal HTTP с заголовком `X-Bot-Secret`. БД — SQLite (WAL), одна на сервер и бот (бот читает read-only).

## Stack

| Component | Stack |
|-----------|-------|
| **client** | Electron 33 + React 19 + Vite 5 + TanStack Query + Radix UI + Tailwind 3 |
| **server** | Express 4 + better-sqlite3 + Drizzle ORM + JWT + Zod 4 |
| **bot** | grammY + better-sqlite3 |
| **shared** | Zod schemas + TypeScript types |
| **tools** | pnpm, Vitest, tsx, electron-forge |

## Directory Structure

```
/
├── apps/
│   ├── client/         # Electron desktop app
│   │   ├── src/main/   #   Main process (IPC handlers, preload)
│   │   ├── src/renderer/ # React app (features, components, lib, providers)
│   │   │   ├── features/
│   │   │   │   ├── ai-inspector/  # Dev-only fiber-based component inspector
│   │   │   │   ├── auth/          # Login/register/session
│   │   │   │   ├── notes/         # Notes CRUD
│   │   │   │   ├── presets/       # App presets
│   │   │   │   ├── settings/      # Settings, theme, server, telegram
│   │   │   │   └── layout/        # Titlebar, Sidebar, CommandPalette
│   │   │   ├── components/ui/     # shadcn-style UI components
│   │   │   ├── providers/         # Auth, Router, Query, Settings, Tooltip
│   │   │   └── lib/               # api-client, theme, deep-link, ws, hotkeys
│   │   ├── scripts/dev.mjs        # Custom dev server launcher
│   │   └── vite.*.config.ts       # Vite configs (main, preload, renderer)
│   ├── server/         # Express REST API
│   │   └── src/
│   │       ├── routes/            # auth, notes, presets, settings, telegram, dev, internal
│   │       ├── middleware/        # auth, error-handler, rate-limit, request-id
│   │       ├── auth/              # JWT, password (scrypt), sessions
│   │       ├── services/          # audit, cleanup, lockout
│   │       ├── db/                # schema, migrations, migrate.ts
│   │       └── config.ts          # Env-based config (Zod)
│   ├── bot/            # Telegram bot (grammY)
│       └── src/
│           ├── commands/          # start, link, me
│           ├── polling/           # notifications, reminders
│           └── api/               # server-client, circuit-breaker
├── packages/
│   └── shared/         # Shared Zod schemas + TypeScript types
├── docs/superpowers/   # SDD specs + implementation plans
└── .superpowers/sdd/   # Task progress tracking
```

## Commands

```bash
pnpm dev              # Start all (server + bot + client concurrently)
pnpm dev:server       # Server only (tsx watch)
pnpm dev:bot          # Bot only
pnpm dev:client       # Electron + Vite dev server
pnpm build            # Build all packages + apps
pnpm test             # Run all tests
pnpm typecheck        # TypeScript check all
```

**Batch scripts (Windows):**
- `startprod.bat` — build client + run Electron in production mode (connects to VPS)
- `start-dev.bat` — run dev server + bot + Vite client in new window (`pnpm dev`)

`startprod.bat` builds `@helper/shared` + `@helper/client`, then runs `npx electron .` from `apps/client/`. No local server needed — client connects to VPS (`DEFAULT_SERVER_URL`). Renderer is built to `.vite/build/renderer/`.

Client dev: `apps/client/scripts/dev.mjs` — starts Vite on :5173, then electron-forge start.

## Key Architecture Decisions

- **IPC pattern**: Main process handlers (ipcMain.handle) + preload exposes `window.api`
- **Auth**: JWT access tokens + refresh tokens + session rotation with reuse detection
- **safeStorage**: Electron's safeStorage encrypts auth tokens to disk (`userData/auth.json`)
- **Database**: SQLite via better-sqlite3 + Drizzle ORM (no Postgres)
- **State management**: TanStack Query for server state, React context for auth/router/settings
- **AI Inspector**: React fiber walker via `__reactFiber$` DOM keys (dev-only, gated by `user.isDev`)
- **Theme**: Tailwind CSS variables on `:root`, dark theme only
- **UI**: shadcn-style components (Radix primitives + CVA + Tailwind)

## AI Inspector Fixes

### Fix 1 (2026-07-16): Context state sharing
**Bug**: `useAiInspector()` hook created independent state per component — toggling in `AiInspectorToggle` didn't affect `AiInspectorOverlay`.
**Fix**: Extracted state into `AiInspectorProvider` (React Context). Both components consume the same context.

### Fix 2 (2026-07-16): Black screen on hover (crash)
**Bug**: `formatPrompt()` called `JSON.stringify` on `fiber.memoizedProps` which contains circular references (React elements). No ErrorBoundary → React unmounts entire tree → black screen.
**Fix**: Added `safeReplacer()` with `WeakSet` to detect circular refs + `'[React Element]'` short-circuit for `$$typeof` objects. Wrapped `<AiInspectorOverlay>` in `<ErrorBoundary>`.
**Files**: `prompt-formatter.ts`, `components/ui/error-boundary.tsx` (new), `App.tsx`.

### Fix 3 (2026-07-16): Click interception + modal dialog
**Bug**: Clicking an element with AI inspector on also triggered the element's normal action (e.g., opening Note modal).
**Fix**: Added `e.preventDefault()` + `e.stopPropagation()` in capture-phase click handler. Added `selectedInfo` state + `clearSelected()` to context. On click, shows a Radix `Dialog` modal with the prompt. Blocks app interaction until closed.
**Files**: `AiInspectorProvider.tsx`, `AiInspectorOverlay.tsx`.

## Server Bot Skip (2026-07-16)
Server now checks `process.env.BOT_TOKEN` before spawning the bot process. If not set, logs a warning and starts without bot. Prevents crash-loop restarts locally.
**File**: `server/src/index.ts`.

## Client Production Build (2026-07-16)
Renderer Vite output dir changed to `.vite/build/renderer/` so `main.js` can find it via `join(__dirname, 'renderer', 'index.html')`.
**File**: `vite.renderer.config.ts`.

## Build 0.2 — Code Quality & Bugfix Pass (2026-07-16)

### Fixed: Telegram internal tests (7 failing → 0)
**Root cause**: `.env` sets `NODE_ENV=production` + `BOT_SHARED_SECRET`, but tests sent requests without `x-bot-secret` header → `requireBotSecret` middleware returned 401.
**Fix**: Added `beforeEach`/`afterEach` to manage `config.botSharedSecret` + `botAuth()` helper that sends the correct header.
**Files**: `apps/server/src/__tests__/telegram-internal.test.ts`.

### Fixed: Password policy inconsistency
**Bug**: `registerSchema` used `passwordSchema` (min 1 char), but `changePasswordSchema` used `passwordPolicySchema` (min 8, uppercase, lowercase, digit).
**Fix**: Registration now uses `passwordPolicySchema` — new users must set strong passwords.
**Files**: `packages/shared/src/schemas/auth.ts`.

### Fixed: JWT access token TTL (24h → 15m)
**Bug**: `TOKEN_TTL_SECONDS = 24 * 60 * 60` (24h) did not match documented 15m.
**Fix**: Changed to `15 * 60` (15 minutes).
**Files**: `apps/server/src/auth/jwt.ts`.

### Fixed: Cleanup job never started
**Bug**: `startCleanupJob()` was exported but never called — session/action/attempt/audit cleanup never ran.
**Fix**: Added `startCleanupJob(getDb())` call in `main()` — runs immediately then every hour.
**Files**: `apps/server/src/index.ts`, `apps/server/src/services/cleanup.ts`.

### Fixed: Auth rate limit non-functional
**Bug**: `authPerMinLimit` (5 req/min) was defined but never applied to any route.
**Fix**: Applied `authPerMinLimit` to `/register`, `/login`, `/token` routes (skipped in test env via `process.env.VITEST`).
**Files**: `apps/server/src/routes/auth.ts`, `apps/server/src/middleware/rate-limit.ts`.

### Fixed: SQL performance issues
**Bug**: `listAudit()` loaded ALL rows into memory with `.all().slice(-limit).reverse()` — O(n) memory. `isLockedOut()` loaded ALL failed attempts and sorted in JS.
**Fix**: Use SQL `ORDER BY ... DESC LIMIT` for both queries.
**Files**: `apps/server/src/services/audit.ts`, `apps/server/src/services/lockout.ts`.

### Cleaned: Unused imports with `void` suppression
Removed `void config`, `void or`, `void isNull`, `void TAG_DEFAULT`, `void THEME_KEY_PREFIX`, `void eq` patterns across 5 files.
**Files**: `routes/auth.ts`, `routes/notes.ts`, `routes/settings.ts`, `routes/internal.ts`, `services/bot-manager.ts`, `services/cleanup.ts`.

## Security Reference

- **Passwords**: scrypt `N=16384, r=8, p=1, keylen=64`, salt `crypto.randomBytes(16)`, timingSafeEqual verify. Registration enforces 8+ chars with uppercase, lowercase, and digit.
- **JWT**: HS256, access 15m, refresh 7d, rotation with reuse detection (revoke all sessions)
- **Lockout**: 5 failed attempts per login+IP in 15m → blocked 30m
- **Rate limit**: 100 req/min global (1000 dev), 5 req/min on /register /login /token per IP, skipped in test env
- **Bot auth**: `X-Bot-Secret` header, timingSafeEqual compare
- **Client tokens**: Electron safeStorage (DPAPI on Windows, Keychain on macOS)
- **HTTP**: helmet (CSP/HSTS) in production, disabled in dev
- **Audit log**: all sensitive ops logged to `audit_log` table, 90d retention

## Environment Variables (`apps/server/.env`)

| Var | Default | Description |
|-----|---------|-------------|
| `NODE_ENV` | `production` | `production` or `development` |
| `PORT` | `3001` | HTTP port |
| `LOG_LEVEL` | `info` | `trace\|debug\|info\|warn\|error\|fatal` |
| `DB_PATH` | `./helperdesktop.db` | SQLite path |
| `BOT_PATH` | `../bot` | Path to bot directory |
| `BOT_USERNAME` | — | Bot username without @ |
| `JWT_SECRET` | — | Required in prod, min 32 chars |
| `BOT_SHARED_SECRET` | — | Shared secret with bot, required in prod |
| `CORS_ORIGINS` | — | Comma-separated allowed origins |

## Production & Ops

**Deploy:** `pnpm deploy` → runs `bash scripts/deploy.sh` (git pull + install + migrate + build + pm2 reload)
**Backup:** `pnpm backup` → runs `bash scripts/backup.sh` (sqlite3 .backup, 30d retention)
**PM2:** `pm2 start ecosystem.config.js`, `pm2 save`, `pm2 startup`
**Health:** `curl http://localhost:3001/api/health`
**Logs:** `pm2 logs helperdesktop-server --lines 200`
**DB access:** `cd apps/server && sqlite3 helperdesktop.db`

**Common issues:**
- `database is locked` → stop server, delete `*.db-shm *.db-wal`, restart
- `JWT_SECRET is required` → set env var (min 32 chars)
- Port conflict → `ss -ltnp \| grep 3001`
- Bot not starting → check `BOT_SHARED_SECRET` match, `BOT_USERNAME`, bot token

## Noteworthy

- Server version updated from `0.1.0` to `0.2.0` (hardcoded in `config.ts` — update from package.json next)
- `_debugSource` removed in React 19 — fiber source info always null
- `memoizedState` is a linked list of hook nodes, not raw state — extraction is approximate
- `isDev` is a DB column on `users` table, defaults to false. Set via: `UPDATE users SET is_dev = 1 WHERE login = '...'`
- Server DB: `apps/server/helperdesktop.db`
- Ports: Vite :5173, Electron main process :5173 (shared), Express :3001

## VPS Server

- Host: 178.172.137.167
- OS: Ubuntu 24.04 LTS
- User: root (key-based auth with local ed25519 key)
- SSH: `ssh root@178.172.137.167 "command"`
- Uses: deployment, server testing, bot hosting
