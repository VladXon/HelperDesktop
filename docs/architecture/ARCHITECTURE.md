# System Architecture

## Overview

```
Electron Client (Vite + React)
    │
    ├─ IPC ── IGggAuthenticator ── GGG API
    │          (DefaultSession → Poesessid → BrowserWindow)
    │
    ├─ HTTP/JWT ── Express API (VPS)
    │                │
    │                ├─ Drizzle ORM ── PostgreSQL 16
    │                └─ Telegram Bot (grammy)
    │
    └─ packages/
         ├─ shared       (types, Zod schemas)
         ├─ poe-engine   (pure calculation, zero I/O)
         ├─ poe-data     (HTTP, PoB import, AI providers)
         └─ poe-backend  (DB repos, services, route factory)
```

## Stack

| Component | Technology |
|-----------|-----------|
| Desktop | Electron 33, React 19, Vite 5, Tailwind CSS |
| Backend | Express 4, Drizzle ORM, node-postgres |
| Database | PostgreSQL 16 (separate VPS) |
| Bot | grammy (Telegram Bot API) |
| Auth (Server) | JWT (access + refresh), rate limiting, lockout |
| Auth (GGG) | Chromium session cookies or POESESSID |

## Directory Structure

```
apps/
├── client/        Electron desktop app
│   ├── src/main/      Main process: IPC, services, auth
│   └── src/renderer/  React SPA
├── server/        Express REST API
│   ├── src/routes/    Auth, notes, presets, PoE
│   ├── src/services/  Business logic
│   ├── src/db/        Drizzle schema + migrations
│   └── src/middleware/ JWT, error handler, rate limit
└── bot/           Telegram bot (grammy)

packages/
├── shared/        Zod schemas, shared types
├── poe-engine/    Pure TS calculator (zero I/O)
├── poe-data/      HTTP, PoB import, data sources, AI providers
└── poe-backend/   DB repos, services, route factory
```

## Key Decisions

1. **PostgreSQL, not SQLite** — production DB runs on separate VPS via node-postgres. Client tests use SQLite in-memory. Server production uses PostgreSQL exclusively.

2. **Chromium session for PoE auth** — instead of managing POESESSID cookies manually, the app uses Electron's built-in Chromium session with `useSessionCookies: true`. Cloudflare challenges are solved natively.

3. **Packages for PoE** — the PoE analyzer is split into 4 packages (shared, engine, data, backend) with strict dependency direction. Engine is pure TypeScript with no I/O.

4. **Feature flags for migration** — `HELPER_USE_NEW_AUTH` allows rolling back to legacy auth paths during migration.

5. **JWT for server auth** — access + refresh tokens. All routes use `requireAuth` middleware. Tokens are stored in Electron `safeStorage`.
