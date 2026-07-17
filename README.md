# HelperDesktop

**Electron desktop app + Express backend + Telegram bot** — assistant for notes, app presets, and Telegram integration.

## Quick Start

```bash
pnpm install
pnpm dev              # Start all (server + bot + client concurrently)
pnpm build            # Build all packages
pnpm test             # Run tests
pnpm typecheck        # TypeScript check
```

## Features

- **Notes** — CRUD with markdown editor
- **App Presets** — save and launch app configurations
- **Telegram Integration** — bot for notes and notifications
- **Dark Theme** — dark-only design with glassmorphism effects
- **AI Inspector** — dev tool for React fiber tree inspection

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
└── docs/           # Architecture, security, UI, deployment, etc.
```

See `AGENTS.md` for the full documentation index.
