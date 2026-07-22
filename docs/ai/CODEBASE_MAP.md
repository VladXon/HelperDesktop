# Codebase Map

> Map of every important directory and file. For AI agents and developers to navigate.

## Top-Level

| Path | Purpose |
|------|---------|
| `README.md` | Project overview, quick start, tech stack |
| `AGENTS.md` | AI agent engineering manual |
| `pnpm-workspace.yaml` | Workspace config (apps/*, packages/*) |
| `package.json` | Root scripts, workspace config |
| `turbo.json` | Build pipeline (if configured) |

## `apps/client/` — Electron Desktop App

| Path | Purpose |
|------|---------|
| `src/main/index.ts` | Electron main process entry |
| `src/main/ipc/poe.ts` | PoE IPC handlers (auth, trade, import, analysis) |
| `src/main/preload.ts` | Renderer bridge (`window.api.poe.*`) |
| `src/main/services/poe/auth/` | PoE auth layer (IGggAuthenticator + implementations) |
| `src/main/services/poe/auth/authenticator.ts` | Interface + types |
| `src/main/services/poe/auth/session.ts` | DefaultSessionAuthenticator |
| `src/main/services/poe/auth/poesessid.ts` | PoesessidAuthenticator |
| `src/main/services/poe/auth/browserwindow.ts` | BrowserWindowAuthenticator |
| `src/main/services/poe/auth/fallback.ts` | FallbackChainAuthenticator |
| `src/main/services/poe/auth/factory.ts` | Singleton + per-account instances |
| `src/main/services/poe/auth/feature-flag.ts` | `HELPER_USE_NEW_AUTH` toggle |
| `src/main/services/poe/auth/benchmark/` | Pluggable auth benchmark framework |
| `src/main/services/poe/electron-ggg-provider.ts` | **LEGACY** — BrowserWindow GGG fetch (replaced by auth layer) |
| `src/main/services/poe/poe-account.service.ts` | **LEGACY** — Local POESESSID via safeStorage (replaced) |
| `src/main/services/poe/backend-client.ts` | Server communication (builds, accounts, OAuth) |
| `src/main/services/poe/poe-trade.service.ts` | Trade API (leagues, exchange rate, search) |
| `src/main/services/poe/poe-import.service.ts` | PoB XML import |
| `src/main/utils/safe-storage.ts` | Electron safeStorage wrapper |
| `src/main/utils/http-client.ts` | JWT-authenticated apiFetch |
| `src/main/auth-benchmark.ts` | Benchmark Electron entry point |
| `src/main/auth-verify.ts` | Production verification entry point |
| `src/renderer/features/poe/` | PoE React components |
| `src/renderer/features/poe-assistant/` | Session Panel, trade UI |
| `vite.main.config.ts` | Main process build |
| `vite.auth-benchmark.config.ts` | Auth benchmark build |
| `package.json` | Client scripts (dev, build, test, auth:*) |

## `apps/server/` — Express Backend

| Path | Purpose |
|------|---------|
| `src/index.ts` | Server entry, middleware setup, routes |
| `src/config.ts` | Env validation (POE_AUTH_MODE, JWT_SECRET, etc.) |
| `src/routes/auth.ts` | JWT auth routes (register, login, refresh, password) |
| `src/routes/poe-auth.ts` | PoE auth routes (session connect, OAuth, characters) |
| `src/routes/poe-builds.ts` | PoE build CRUD |
| `src/routes/poe-characters.ts` | PoE character sync/refresh |
| `src/routes/poe-accounts.ts` | PoE account listing/disconnection |
| `src/routes/notes.ts`, `presets.ts`, `settings.ts` | App CRUD routes |
| `src/services/poe/ggg-client.ts` | Server-side GGG API client |
| `src/services/poe/oauth/poe-session-auth.service.ts` | Session auth provider (POESESSID → encrypt → DB) |
| `src/services/poe/oauth/poe-oauth.service.ts` | OAuth flow (authorize → callback → token) |
| `src/services/poe/character.provider.ts` | Character persistence |
| `src/middleware/` | JWT auth, error handler, rate limit, request ID |
| `src/db/schema.ts` | Drizzle ORM schema (all tables) |
| `src/db/migrations/` | Drizzle migrations |
| `src/ws.ts` | WebSocket (subscribers) |
| `src/utils/logger.ts` | Structured logging |

## `apps/bot/` — Telegram Bot

| Path | Purpose |
|------|---------|
| `src/index.ts` | Bot entry, middleware, commands |
| `src/handlers/` | Command handlers |

## `packages/shared/` — Shared Types

| Path | Purpose |
|------|---------|
| `src/schemas/` | Zod validation schemas |
| `src/types/` | Shared TypeScript types |
| `src/poe/` | PoE-specific shared types (Build, AnalysisResult, etc.) |

## `packages/poe-engine/` — PoE Calculator

| Path | Purpose |
|------|---------|
| `src/index.ts` | Public API |
| `src/core/` | Pure calculation engine |
| `src/core/modifier/` | Modifier system |
| `src/core/stat/` | Stat registry |
| `src/core/explanation/` | Deterministic explanations (AI fallback) |

## `packages/poe-data/` — PoE Data Layer

| Path | Purpose |
|------|---------|
| `src/http/` | HTTP client abstraction |
| `src/data/sources/` | Data sources (trade.source.ts, profile.source.ts) |
| `src/data/normalizers/` | Data normalizers |
| `src/parsers/` | PoB XML parser |
| `src/ai/` | AI provider registry |

## `packages/poe-backend/` — PoE Backend

| Path | Purpose |
|------|---------|
| `src/schema/` | Drizzle schema extensions |
| `src/repos/` | DB repositories |
| `src/services/` | PoE backend services |
| `src/crypto/` | AES-256-GCM token encryption |
| `src/client/` | Backend API client |
| `src/route-factory/` | Route factory pattern |

## `docs/` — Documentation

| Path | Purpose |
|------|---------|
| `architecture/ARCHITECTURE.md` | System architecture |
| `architecture/POE_AUTH_ARCHITECTURE.md` | PoE auth architecture (authoritative) |
| `architecture/POE_AUTH_BENCHMARK_RESULTS.md` | Benchmark results template |
| `ai/AI_CONTEXT.md` | AI context (this directory) |
| `ai/CODEBASE_MAP.md` | This file |
| `ai/TASK_GUIDELINES.md` | Task implementation patterns |
| `development/DEVELOPMENT.md` | Dev environment setup |
| `development/CODE_STANDARDS.md` | Code conventions |
| `development/TECH_DEBT.md` | Tech debt register |
| `deployment/DEPLOYMENT.md` | Deploy + backup |
| `security/SECURITY.md` | Security architecture |
| `poe/` | PoE analyzer engineering docs |

## Key Interfaces

| Interface | File | Implementations |
|-----------|------|-----------------|
| `IGggAuthenticator` | `auth/authenticator.ts` | DefaultSession, Poesessid, BrowserWindow, FallbackChain |
| `GggTransport` | `auth/benchmark/types.ts` | electron-net-fetch, electron-net-request, browserwindow-execjs, node-fetch |
| `CookieProvider` | `auth/benchmark/types.ts` | poesessid-header, chromium-session, cleared-cookies |
| `PoeDataProvider` | `server/services/poe/ggg-data-provider.ts` | GggClient (server) |
| `PoeAccountService` | `client/services/poe/poe-account.service.ts` | Legacy local session |

## Dependency Graph

```
renderer (React)
    ↓ preload
main process (Electron)
    ├── auth/factory.ts → auth/fallback.ts → auth/session.ts, poesessid.ts, browserwindow.ts
    ├── backend-client.ts → http-client.ts → Express API
    └── trade.service.ts → GGG trade endpoints

server (Express)
    ├── routes/poe-auth.ts → services/poe/session-auth.service.ts → ggg-client.ts → GGG
    ├── routes/poe-builds.ts → poe-backend package → PostgreSQL
    └── db/schema.ts → Drizzle ORM → PostgreSQL
```
