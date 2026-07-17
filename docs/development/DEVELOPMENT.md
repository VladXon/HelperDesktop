# Development

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

## Environment Variables (`apps/server/.env`)

| Var | Default | Description |
|---|---|---|
| `NODE_ENV` | `production` | `production` or `development` |
| `PORT` | `3001` | HTTP port |
| `LOG_LEVEL` | `info` | trace/debug/info/warn/error/fatal |
| `DB_PATH` | `./helperdesktop.db` | SQLite path |
| `BOT_PATH` | `../bot` | Path to bot directory |
| `BOT_TOKEN` | — | Telegram bot token |
| `BOT_USERNAME` | — | Bot username without @ |
| `JWT_SECRET` | — | Required in prod, min 32 chars |
| `BOT_SHARED_SECRET` | — | Shared secret with bot |
| `CORS_ORIGINS` | — | Comma-separated allowed origins |

## Production & Ops

- **Deploy**: `pnpm deploy` → `bash scripts/deploy.sh` (git pull + install + migrate + build + pm2 reload)
- **Backup**: `pnpm backup` → `bash scripts/backup.sh` (sqlite3 .backup, 30d retention)
- **PM2**: `pm2 start config/ecosystem.config.cjs`
- **DB**: `apps/server/helperdesktop.db`, ports: Vite :5173, Electron :5173, Express :3001
