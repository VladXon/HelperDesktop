<h1 align="center">HelperDesktop</h1>

<p align="center">
  <i>Electron desktop companion for Path of Exile players</i>
</p>

<p align="center">
  <a href="https://github.com/YOUR_USERNAME/helperdesktop/stargazers"><img src="https://img.shields.io/github/stars/YOUR_USERNAME/helperdesktop?style=flat-square&color=yellow" alt="Stars"></a>
  <a href="https://github.com/YOUR_USERNAME/helperdesktop/network/members"><img src="https://img.shields.io/github/forks/YOUR_USERNAME/helperdesktop?style=flat-square" alt="Forks"></a>
  <a href="https://github.com/YOUR_USERNAME/helperdesktop/issues"><img src="https://img.shields.io/github/issues/YOUR_USERNAME/helperdesktop?style=flat-square" alt="Issues"></a>
  <a href="https://github.com/YOUR_USERNAME/helperdesktop/pulls"><img src="https://img.shields.io/github/issues-pr/YOUR_USERNAME/helperdesktop?style=flat-square" alt="Pull Requests"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License"></a>
  <img src="https://img.shields.io/badge/status-active-brightgreen?style=flat-square" alt="Status">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey?style=for-the-badge" alt="Platform">
  <img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen?style=for-the-badge" alt="Node">
  <img src="https://img.shields.io/badge/pnpm-8%2B-orange?style=for-the-badge" alt="pnpm">
  <img src="https://img.shields.io/badge/typescript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
</p>

<br>

---

## About

**HelperDesktop** is a full-featured desktop companion for Path of Exile, built with Electron. It integrates deeply with GGG's authentication system through Chromium session cookies — no manual API key management, no Cloudflare captchas, no OAuth dance.

The app authenticates via your existing GGG login session to provide real-time character analysis, item evaluation, build intelligence, and seamless synchronization with a Telegram bot for remote access.

---

## Features

### 📥 PoB Import

| Feature | Description |
|---------|-------------|
| XML Parsing | Path of Building Community XML import |
| Build Domain | Full conversion to typed build domain model |
| Item Mod Parsing | ~30+ mod patterns, 71% coverage |
| Condition Parser | Flask, charge, and conditional modifier support |
| Tree Converter | Passive tree node extraction from XML |

### 🧮 Engine Calculation

| Feature | Description |
|---------|-------------|
| Defense Pipeline | Life, ES, Armour, Evasion, Resistances, Block |
| Offense Pipeline | Hit damage, crit, attack/cast speed |
| Modifier Aggregator | Increased/reduced/more/less stacking |
| Mechanic Resolvers | Keystones, charges, conditional mods |
| Stat Registry | 106+ stat keys, 10 categories |

### ✅ Golden Test Validation

| Feature | Description |
|---------|-------------|
| PoB Community Reference | Run reference calculations via PoB Community |
| Compare Pipeline | Per-stat diff, accuracy metrics, explain mode |
| Regression Detection | Baseline comparison after each change |
| Stress Tests | Multi-build soak testing |
| Auto-Explain | Deterministic analysis of discrepancies |

### 🎮 Character Analysis

| Feature | Description |
|---------|-------------|
| Stat Breakdowns | Comprehensive attribute, resistance, and damage calculations |
| Passive Tree | Full passive tree visualization with jewel socket mapping |
| Ascendancy | Ascendancy class tracking and node allocation |
| Item Slots | Snapshot equipped items with stat comparisons |
| Skill Gems | Active skill links, gem levels, and support calculations |

### 💰 Item Evaluation

| Feature | Description |
|---------|-------------|
| Mod Tiers | Automatic mod tier classification for all item types |
| Pseudo-Mods | Calculated pseudo-modifications (DPS, life, ES, etc.) |
| Trade Context | League-specific pricing and market context |
| Price Estimation | Pipeline for item price evaluation |

### 📝 Notes & Presets

| Feature | Description |
|---------|-------------|
| Markdown Editor | Full markdown support with live preview |
| Pinned Notes | Pin important notes to the top |
| Tag System | Categorize and filter notes by tags |
| Cloud Sync | Seamless sync with server backend |
| App Presets | Save and launch tool configurations with a click |

### 🤖 Telegram Bot

| Feature | Description |
|---------|-------------|
| Remote Access | Access your notes and presets from anywhere |
| QR Login | Scan QR codes for quick authentication |
| Notifications | Get notified about important events |
| Shared Secret | Secure bot-to-server communication |

### 🔐 PoE Authentication

| Feature | Description |
|---------|-------------|
| Session Cookies | Chromium session-based authentication (primary) |
| POESESSID Fallback | Direct cookie fallback for reliability |
| CF Bypass | BrowserWindow-based Cloudflare bypass (last resort) |
| Multi-Account | Isolated Chromium partitions per account |
| Feature Flag | `HELPER_USE_NEW_AUTH=1` for unified auth |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           ELECTRON CLIENT                               │
│                                                                         │
│   ┌───────────────┐  ┌───────────────┐  ┌─────────────────────────┐    │
│   │   React UI    │  │   PoE Auth    │  │    Stash Fetcher        │    │
│   │   (Vite 5)    │  │   Session     │  │    (rate-limited)       │    │
│   │   Tailwind    │  │   Cookies     │  │    Zod-validated        │    │
│   └───────┬───────┘  └───────┬───────┘  └────────────┬────────────┘    │
│           │                  │                       │                  │
│           └──────────────────┼───────────────────────┘                  │
│                              │                                          │
│                         IPC Bridge                                       │
│                     (typed + validated)                                   │
└──────────────────────────────┼──────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                          EXPRESS SERVER                                   │
│                                                                          │
│   ┌───────────────┐  ┌───────────────┐  ┌─────────────────────────┐    │
│   │   Auth JWT    │  │   Notes       │  │    PoE Integration      │    │
│   │   Refresh     │  │   Service     │  │    GGG API Client       │    │
│   │   Middleware   │  │   CRUD        │  │    OAuth / Session      │    │
│   └───────┬───────┘  └───────┬───────┘  └────────────┬────────────┘    │
│           │                  │                       │                  │
│           └──────────────────┼───────────────────────┘                  │
│                              │                                          │
└──────────────────────────────┼──────────────────────────────────────────┘
                               │
                               ▼
                    ┌─────────────────────────┐
                    │     PostgreSQL 16        │
                    │   (remote VPS in DE)     │
                    │   Drizzle ORM + pg       │
                    └─────────────────────────┘
```

### PoB → Engine Pipeline

```
PoB XML (pastebin/file)
    │
    ▼
┌─────────────┐
│  PoB Parser │  pob-xml.parser.ts → base64 → gunzip → regex → PoBXmlDTO
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Converter  │  pob-converter.ts → Build domain model
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Engine   │  Pure TS calculators, zero I/O
│             │  Defense · Offense · Modifier Aggregation
└──────┬──────┘
       │
       ▼
┌──────────────────────┐
│  Golden Tests         │  Compare against PoB Community reference
│  Compare → Explain    │  Per-stat diff, accuracy metrics
└──────────────────────┘
```

### Package Dependency Flow

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   shared    │◄─────│  poe-engine │◄─────│   poe-data  │◄─────│  poe-backend│
│   (types)   │      │  (pure TS)  │      │  (HTTP+IO)  │      │  (DB+repos) │
│   (Zod)     │      │  (no deps)  │      │  (parsers)  │      │  (storage)  │
└─────────────┘      └─────────────┘      └─────────────┘      └─────────────┘
       ↑                   ↑                    ↑                    ↑
       │                   │                    │                    │
   Zero I/O           Zero I/O              Node.js            PostgreSQL
   No HTTP            No HTTP               HTTP only           Drizzle
   No DB              No DB                 No DB               node-postgres
```

---

## Performance

| Operation | Throughput |
|-----------|------------|
| PoB Import | 38k ops/sec |
| Full Calculation | 4.9k ops/sec |

## Test Suite

| Suite | Count |
|-------|-------|
| Engine Tests | 195 |
| Data Tests | 323 |
| Shared Tests | 21 |
| Golden Test Builds | 15 |
| **Total** | **539+** |

---

## Tech Stack

<p align="center">
  <img src="https://img.shields.io/badge/electron-33-47848F?style=for-the-badge&logo=electron&logoColor=white">
  <img src="https://img.shields.io/badge/react-19-61DAFB?style=for-the-badge&logo=react&logoColor=black">
  <img src="https://img.shields.io/badge/vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white">
  <img src="https://img.shields.io/badge/typescript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white">
  <img src="https://img.shields.io/badge/tailwind-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/express-4-000000?style=for-the-badge&logo=express&logoColor=white">
  <img src="https://img.shields.io/badge/postgresql-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white">
  <img src="https://img.shields.io/badge/drizzle-ORM-C5F74E?style=for-the-badge&logo=drizzle&logoColor=black">
  <img src="https://img.shields.io/badge/telegram-bot-26A5E4?style=for-the-badge&logo=telegram&logoColor=white">
  <img src="https://img.shields.io/badge/zod-validation-3E67B3?style=for-the-badge&logo=zod&logoColor=white">
</p>

---

## Quick Start

### Prerequisites

- **Node.js** >= 18.0
- **pnpm** >= 8.0
- **PostgreSQL** >= 16 (for server)

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/helperdesktop.git
cd helperdesktop

# Install dependencies
pnpm install

# Set up environment
cp apps/server/.env.example apps/server/.env
# Edit apps/server/.env with your DATABASE_URL, JWT_SECRET, BOT_TOKEN

# Run database migrations
cd apps/server
pnpm drizzle-kit migrate
```

### Running

```bash
# Start Electron client only (with Vite HMR)
pnpm dev

# Start everything (client + server + bot)
pnpm dev:all

# Start server only (with tsx watch)
pnpm dev:server

# Start Telegram bot only
pnpm dev:bot
```

### Building

```bash
# Build all packages
pnpm build

# Build Electron distributable
cd apps/client
pnpm electron:build
```

### Testing

```bash
# Run all tests
pnpm test

# Run TypeScript type checking
pnpm typecheck

# Run auth benchmarks (requires POESESSID)
pnpm --filter @helper/client run auth:benchmark -- --poesessid=YOUR_SESSION
pnpm --filter @helper/client run auth:verify   -- --poesessid=YOUR_SESSION
pnpm --filter @helper/client run auth:stress   -- --poesessid=YOUR_SESSION --iterations=100
```

---

## Project Structure

```
helperdesktop/
├── apps/
│   ├── client/              Electron desktop app
│   │   └── src/
│   │       ├── main/        Main process, IPC handlers, PoE auth services
│   │       │   ├── ipc/     IPC handlers (notes, presets, poe, auth)
│   │       │   └── services/
│   │       │       ├── poe/ PoE auth (session, fallback, benchmark)
│   │       │       └── ...  Other services
│   │       ├── renderer/    React 19 SPA, Vite 5, Tailwind
│   │       │   ├── components/
│   │       │   ├── features/
│   │       │   └── pages/
│   │       └── preload/     Context bridge, typed IPC
│   │
│   ├── server/              Express 4 REST API
│   │   └── src/
│   │       ├── routes/      Auth, notes, presets, PoE
│   │       ├── services/    Business logic, PoE session, Telegram manager
│   │       ├── middleware/  JWT, rate-limit, error handler
│   │       └── db/          Drizzle schema, migrations, repos
│   │
│   └── bot/                 Telegram bot (grammy)
│
├── packages/
│   ├── shared/              Zod schemas, TypeScript types
│   ├── poe-engine/          Pure TS calculators, zero I/O
│   ├── poe-data/            HTTP fetchers, parsers, AI integration
│   └── poe-backend/         DB schema, repos, PoE services
│
├── config/                  PM2 ecosystem, tsconfig.base
├── scripts/
│   ├── deploy.sh            VPS deploy
│   ├── backup.sh            Database backup
│   ├── push-notify.mjs      AI push notifications
│   ├── validation/          Golden tests, comparisons
│   ├── tooling/             Fetch, extract, analysis tools
│   ├── development/         Debug scripts, ad-hoc tooling
│   ├── benchmark/           Stress tests, soak tests
│   └── migration/           Migration helpers
├── testing/
│   ├── golden/
│   │   ├── builds/          PoB XML build fixtures (15)
│   │   ├── engine/          Engine result artifacts
│   │   ├── pob/             PoB reference results
│   │   ├── reports/         Golden test baselines
│   │   ├── explain/         Auto-generated diff explainers
│   │   └── baselines/       Baseline reference data
│   ├── fixtures/            Test helper data
│   └── temp/                Temporary debug artifacts
└── docs/
    ├── architecture/        System design, PoE auth architecture
    ├── development/         Development guide, code standards
    ├── deployment/          VPS setup, PM2, backups
    ├── database/            PostgreSQL schema, migrations
    ├── security/            JWT, session encryption
    ├── poe/                 PoE-specific documentation
    ├── validation/          Mechanics coverage, golden test history
    └── ai/                  AI context, codebase map, task guidelines
```

---

## Environment Variables

### Server (`apps/server/.env`)

```env
# Server
PORT=3001
NODE_ENV=development

# Database (PostgreSQL)
DATABASE_URL=postgres://user:pass@host:5432/helperdesktop

# Auth
JWT_SECRET=<64-char-hex>

# PoE
POE_AUTH_MODE=session              # session | oauth
POE_TOKEN_ENCRYPTION_KEY=<64-char-hex>

# Telegram Bot
BOT_TOKEN=<telegram-bot-token>
BOT_USERNAME=<bot-username>

# Logging
LOG_LEVEL=info
```

### Client (`apps/client/.env` — optional)

```env
HELPER_SERVER_URL=http://localhost:3001
HELPER_USE_NEW_AUTH=1              # 1 = unified auth, 0 = legacy
```

---

## Documentation

| Guide | Description |
|-------|-------------|
| [Architecture](docs/architecture/ARCHITECTURE.md) | System design, data flow, components |
| [PoE Auth](docs/architecture/POE_AUTH_ARCHITECTURE.md) | Chromium session, fallback chain, multi-account |
| [Development](docs/development/DEVELOPMENT.md) | Local setup, env vars, commands |
| [Code Standards](docs/development/CODE_STANDARDS.md) | Conventions, patterns, rules |
| [API Reference](docs/api.md) | REST endpoints, auth, request/response |
| [Testing](docs/testing.md) | Vitest, integration tests, auth benchmarks |
| [Security](docs/security/SECURITY.md) | JWT, session encryption, safeStorage |
| [Deployment](docs/deployment/DEPLOYMENT.md) | VPS setup, PM2, backups, migration |
| [Database](docs/database/DATABASE.md) | Schema, migrations, queries |
| [PoE Engine](docs/poe/phase1-core-engine.md) | PoE calculators, pure TypeScript (legacy doc) |
| [PoE Data](docs/poe/phase2-data-layer.md) | HTTP fetchers, parsers, AI (legacy doc) |
| [Validation Plan](docs/validation/PRE_RELEASE_VALIDATION_PLAN.md) | Golden tests, mechanics coverage |
| [Validation History](docs/validation/history/) | Iterative progress records |
| [Health Report](docs/development/REPOSITORY_HEALTH.md) | Repository health checkpoint |
| [AI Context](docs/ai/AI_CONTEXT.md) | For AI agents: architecture map, workflows |
| [Codebase Map](docs/ai/CODEBASE_MAP.md) | File-level codebase navigation |
| [Task Guidelines](docs/ai/TASK_GUIDELINES.md) | Common development workflows |

---

## Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'feat: add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Commit Convention

```
feat:     New feature
fix:      Bug fix
refactor: Code refactoring
docs:     Documentation changes
test:     Adding tests
chore:    Maintenance tasks
```

### Code Standards

- TypeScript strict mode
- Zod validation for all external data
- No `any` without justification
- Follow existing patterns in the codebase

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <i>Built with ❤️ for the Path of Exile community</i>
</p>
