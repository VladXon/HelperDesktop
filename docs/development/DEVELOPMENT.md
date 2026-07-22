# Development

## Commands

```bash
pnpm dev              # Start Electron client (Vite HMR)
pnpm dev:all          # Start all (server + bot + client concurrently)
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
| `DATABASE_URL` | — | PostgreSQL connection string (`postgres://user:pass@host:5432/db`) |
| `JWT_SECRET` | — | Required in prod, min 32 chars |
| `BOT_TOKEN` | — | Telegram bot token |
| `BOT_USERNAME` | — | Bot username without @ |
| `BOT_SHARED_SECRET` | — | Shared secret with bot |
| `CORS_ORIGINS` | — | Comma-separated allowed origins |
| `POE_AUTH_MODE` | `session` | `session` or `oauth` |
| `POE_TOKEN_ENCRYPTION_KEY` | — | 64-char hex for AES-256-GCM (session mode) |
| `POE_CLIENT_ID` | — | GGG OAuth client ID (oauth mode only) |
| `POE_CLIENT_SECRET` | — | GGG OAuth client secret |
| `POE_REDIRECT_URI` | — | OAuth callback URL |

## Production & Ops

- **Deploy**: push to GitHub → VPS pulls → `pnpm install` → `pnpm build` → `drizzle-kit migrate` → `pm2 reload`
- **Backup**: `pg_dump -h 2.26.80.138 -U helper -d helperdesktop -F c -f backup.dump` (30d retention)
- **PM2**: `pm2 start config/ecosystem.config.cjs`
- **Ports**: Vite dev :5173, Electron :5173, Express :3001
