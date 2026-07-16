# HelperDesktop

**Electron desktop app + Express backend + Telegram bot** — помощник для управления заметками, пресетами приложений и интеграцией с Telegram.

## Architecture

```
Electron (React 19) ←HTTPS/WS→ Express + Drizzle/SQLite ←internal HTTP→ Telegram Bot (GrammY)
```

Клиент — на Electron с React 19. Сервер — Express + SQLite (better-sqlite3) + Drizzle ORM. Telegram-бот на GrammY общается с сервером по внутреннему HTTP с заголовком `X-Bot-Secret`.

## Stack

| Component | Stack |
|-----------|-------|
| **client** | Electron 33 + React 19 + Vite 5 + TanStack Query + Radix UI + Tailwind 3 |
| **server** | Express 4 + better-sqlite3 + Drizzle ORM + JWT + Zod 4 |
| **bot** | grammY + better-sqlite3 |
| **shared** | Zod schemas + TypeScript types |
| **tools** | pnpm, Vitest, tsx, electron-forge |

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development (server + bot + client concurrently)
pnpm dev

# Or start individually
pnpm dev:server
pnpm dev:bot
pnpm dev:client

# Build all packages
pnpm build

# Run tests
pnpm test

# TypeScript check
pnpm typecheck
```

## Features

- **Заметки** — CRUD с markdown-редактором (TipTap/remirror)
- **Пресеты приложений** — сохранение и быстрый запуск конфигураций приложений
- **Telegram-интеграция** — бот для просмотра заметок и уведомлений
- **Тёмная тема** — dark-only дизайн с glassmorphism-эффектами
- **AI Inspector** — dev-инструмент для инспекции React fiber-дерева

## Environment

Сервер использует `.env` файл в `apps/server/`. Основные переменные:

| Var | Default | Description |
|-----|---------|-------------|
| `PORT` | `3001` | HTTP port |
| `DB_PATH` | `./helperdesktop.db` | SQLite path |
| `JWT_SECRET` | — | Required in prod, min 32 chars |
| `BOT_SHARED_SECRET` | — | Shared secret with bot |

## Deployment

Сервер развёрнут на Ubuntu 24.04 под PM2.

```bash
pnpm deploy     # git pull → install → migrate → build → pm2 reload
pnpm backup     # SQLite .backup, 30d retention
```

## Project Structure

```
├── apps/
│   ├── client/     # Electron desktop app
│   ├── server/     # Express REST API
│   └── bot/        # Telegram bot
├── packages/
│   └── shared/     # Shared Zod schemas + types
├── config/         # PM2 ecosystem, tsconfig.base
├── scripts/        # Deploy, backup
└── docs/           # Design specs, SDD
```

## Security

- Passwords: scrypt (N=16384, r=8, p=1), timingSafeEqual
- JWT: HS256, access 15m, refresh 7d, rotation with reuse detection
- Lockout: 5 failed attempts in 15m → blocked 30m
- Rate limit: 100 req/min global, 5 req/min auth routes
- Client tokens: Electron safeStorage (DPAPI / Keychain)
- Audit log: all sensitive ops logged, 90d retention
