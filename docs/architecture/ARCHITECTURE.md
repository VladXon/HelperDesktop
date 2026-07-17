# Architecture

## System Diagram

```
Electron (React 19) ←HTTPS/WS→ Express + Drizzle/SQLite ←internal HTTP→ Telegram Bot (GrammY)
```

Client communicates with server via HTTPS and WebSocket. Bot talks to server over internal HTTP with `X-Bot-Secret` header. DB is SQLite (WAL mode), shared between server and bot (bot reads read-only).

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
│   ├── client/                 # Electron desktop app
│   │   ├── src/main/           # Main process (IPC handlers, preload)
│   │   ├── src/renderer/       # React app (features, components, lib, providers)
│   │   │   ├── features/
│   │   │   │   ├── ai-inspector/
│   │   │   │   ├── auth/
│   │   │   │   ├── notes/
│   │   │   │   ├── presets/
│   │   │   │   ├── settings/
│   │   │   │   └── layout/
│   │   │   ├── components/ui/  # shadcn-style UI components
│   │   │   ├── providers/
│   │   │   └── lib/
│   │   └── vite.*.config.ts
│   ├── server/                 # Express REST API
│   │   └── src/
│   │       ├── routes/
│   │       ├── middleware/
│   │       ├── auth/
│   │       ├── services/
│   │       ├── db/
│   │       └── config.ts
│   ├── bot/                    # Telegram bot (grammY)
│       └── src/
│           ├── commands/
│           ├── polling/
│           └── api/
├── packages/
│   └── shared/                 # Zod schemas + TS types
└── .superpowers/sdd/           # Task progress tracking
```

## Key Architecture Decisions

- **IPC**: `ipcMain.handle` + preload exposes `window.api`
- **Auth**: JWT access (15m) + refresh (7d) tokens + session rotation with reuse detection
- **safeStorage**: Electron safeStorage encrypts tokens to disk (`userData/auth.json`)
- **Database**: SQLite via better-sqlite3 + Drizzle ORM
- **State**: TanStack Query for server, React context for auth/router/settings
- **AI Inspector**: React fiber walker via `__reactFiber$` (dev-only, gated by `user.isDev`)
- **Theme**: Tailwind CSS vars on `:root`, dark only
- Server checks `BOT_TOKEN` before spawning bot; if not set, starts without bot

## Noteworthy

- `isDev` is a DB column on `users` (default false). Enable via: `UPDATE users SET is_dev = 1 WHERE login = '...'`
- `_debugSource` removed in React 19 — fiber source info always null
- `memoizedState` is a linked list of hook nodes, extraction is approximate
