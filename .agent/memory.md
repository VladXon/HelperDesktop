# Project Memory

General project knowledge and subtle system behavior not obvious from code or documentation.

---

## Database Access Pattern

- Server uses Drizzle ORM with typed schema definitions and migrations.
- Bot bypasses HTTP API and **reads/writes the same SQLite database directly** via raw SQL in polling modules. This is the single biggest architectural issue — see `TECH_DEBT.md` C1.
- SQLite in WAL mode allows concurrent readers; concurrent writers from different processes can cause `SQLITE_BUSY`.
- Database connection is a global singleton (`getDb()`) — tests inject `:memory:` instances via `setDb()`/`resetDb()`.

## Bot Process Management

- Bot runs as a child process spawned by the server's `BotManager`.
- Bot is spawned via `npx tsx src/index.ts` even in production — compiled `dist/` never used.
- Bot manager has 5 states: stopped → running → given-up → scheduled → stopping.
- Deploy builds the bot but the build output is unused.

## IPC Architecture

- Main process uses `ipcMain.handle` for request/response.
- Preload exposes all methods via single `contextBridge.exposeInMainWorld('api', api)`.
- Channel names are string literals scattered across files — no shared constants.
- Some components bypass feature `api.ts` layer and call `window.api.*` directly.

## Authentication Flow

- Two auth paths: JWT Bearer token AND `X-Auth-Login`/`X-Auth-Password` headers (fallback).
- Dual path means `requireAuth` can authenticate via headers on any request, not just login.
- Session rotation has a race condition — concurrent requests can bypass reuse detection (see TECH_DEBT.md C3).

## Development Startup

- Root `pnpm dev` starts server, bot, and client concurrently via `concurrently`.
- Shared package (`@helper/shared`) is not pre-built — first import at runtime may fail.
- `start-dev.bat` writes `JWT_ACCESS_EXPIRY` and `JWT_REFRESH_EXPIRY` to `.env` that are never read by config.

## AI Push Notifications (Windows Toast)

- Main process watches `{userData}/ai-push.json` (default: `%APPDATA%/ElectronHelper/ai-push.json`) for changes and shows native Windows toasts.
- Override path via `AI_PUSH_FILE` env var.
- CLI script: `node scripts/push-notify.mjs <title> <body>` — writes to the watched file.
- AI can use `bash` to call the script or write directly to the JSON file.
- IPC available from renderer: `window.api.push.show(title, body)`.

## Testing

- Server integration tests use supertest + in-memory SQLite.
- All integration tests share a global DB singleton, preventing parallel execution.
- Test infrastructure (createTestApp, registerAndLogin) duplicated across 6 test files.
- Client has zero tests. Bot commands have zero tests.
