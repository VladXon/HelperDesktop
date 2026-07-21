# Production Architecture — Two-VPS Setup

**Status: LIVE** | Last audited: 2026-07-22

---

## 1. Overview

```
                       Internet
                          │
                    ┌─────▼─────┐
                    │   Nginx    │  port 80
                    │  :80→:3001 │
                    │ VPS1       │
                    └─────┬─────┘
                          │
                    ┌─────▼─────┐
                    │ Express    │  port 3001
                    │ PM2 (fork) │  Node.js 20
                    │ VPS1       │
                    └─────┬─────┘
                          │  pg Pool (10 conn, keepAlive)
                          │  TLS-encrypted (pg wire protocol)
                          │
                    ┌─────▼─────┐
                    │ PostgreSQL │  port 5432
                    │ VPS2       │  29 tables
                    └───────────┘
```

## 2. Server Roles

### VPS1 — Application Server (178.172.137.167)

| Component | Detail |
|-----------|--------|
| **OS** | Ubuntu 24.04 |
| **Reverse proxy** | Nginx (port 80 → localhost:3001) |
| **App server** | Node.js 20.20.2, PM2 fork mode |
| **API** | Express, routes mounted at `/api/*` |
| **DB client** | `pg.Pool` → VPS2:5432 |
| **Bot** | Telegram bot (BOT_AUTOSTART, currently disabled) |
| **Auth** | JWT + bcrypt, POE_AUTH_MODE=session |
| **psql** | Installed for monitoring |

**PM2 config** (`config/ecosystem.config.cjs`):
```js
{
  name: 'helperdesktop-server',
  script: 'apps/server/dist/index.js',
  exec_mode: 'fork',
  instances: 1,
  autorestart: true,
  max_memory_restart: '512M',
  kill_timeout: 10000,
}
```

### VPS2 — Database Server (2.26.80.138)

| Component | Detail |
|-----------|--------|
| **OS** | Ubuntu 24.04 |
| **Database** | PostgreSQL 16 (localhost:5432) |
| **DB user** | `helperadmin` |
| **DB name** | `helperdesktop` |
| **Tables** | 29 (audit, users, sessions, notes, presets, poe_*, telegram_*) |
| **Migrations** | 0000_initial through 0003_poe_characters |
| **App server** | Instance running (connects to localhost:5432), not exposed via nginx |

## 3. Network Flow

```
Client (Electron/curl) → VPS1:80 (nginx) → VPS1:3001 (Express) → VPS2:5432 (PostgreSQL)
```

| Connection | Protocol | Port |
|------------|----------|------|
| Internet → Nginx | HTTP | 80 |
| Nginx → Express | HTTP (loopback) | 3001 |
| Express → PostgreSQL | PostgreSQL wire (TLS) | 5432 |
| VPS2 Express → PostgreSQL | Unix/localhost | 5432 |

**Latency**: VPS1→VPS2 DB ping: ~54ms

## 4. Database Pool Configuration

```ts
new pg.Pool({
  connectionString: DATABASE_URL,
  max: 10,                           // Max concurrent connections
  idleTimeoutMillis: 30_000,         // Close idle after 30s
  connectionTimeoutMillis: 10_000,   // Fail fast (10s), PM2 autorestart
  keepAlive: true,                   // TCP keepalive between VPS1↔VPS2
  keepAliveInitialDelayMillis: 10_000,
})
```

Pool events are logged:
- `pool error` → logged, does not crash process (connections are retried on next query)
- `connection acquired` → debug-level

`closePool()` called on graceful shutdown (SIGTERM/SIGINT).

## 5. Migrations

| Migration | Tables Created |
|-----------|----------------|
| 0000_initial | users, sessions, notes, presets, settings |
| 0001_add_telegram_and_audit | telegram_links, telegram_actions, audit_log, login_attempts |
| 0002_add_poe_accounts | poe_accounts, poe_builds, poe_build_analyses, poe_modifiers, poe_skills, poe_items, poe_item_valuations, poe_economic_events, poe_market_snapshots, poe_currency_snapshots, poe_meta_builds, poe_crafting_methods, poe_trade_search_cache, poe_league_info, poe_ai_provider_settings, poe_ai_requests, poe_oauth_states |
| 0003_poe_characters | poe_characters, poe_character_snapshots, poe_item_cache |

**Tracking**: `__drizzle_migrations` table on VPS2 PostgreSQL with unique index on `hash`. Both server instances see identical migration state.

**Application**: Migrations are applied manually via `psql -f migration.sql`. Not run through drizzle-kit CLI (which would use `.env` for connection). Both VPS servers share the same PostgreSQL database — migrations are applied once.

## 6. Environment Variables

Both servers load `.env` from `/opt/helperdesktop/apps/server/.env`.

| Variable | VPS1 | VPS2 | Notes |
|----------|------|------|-------|
| `NODE_ENV` | production | production | |
| `PORT` | 3001 | 3001 | |
| `DATABASE_URL` | `postgresql://...@2.26.80.138:5432/helperdesktop` | `postgresql://...@localhost:5432/helperdesktop` | Different host |
| `JWT_SECRET` | Same | Same | 64-char |
| `BOT_SHARED_SECRET` | Same | Same | 44-char base64 |
| `BOT_TOKEN` | Same | Same | Telegram bot API token |
| `POE_AUTH_MODE` | session | session | Must match on both |
| `POE_TOKEN_ENCRYPTION_KEY` | Same | Same | 64-char hex, AES-256-GCM |
| `CORS_ORIGINS` | * | * | |

**Secrets**: The same JWT_SECRET, BOT_SHARED_SECRET, and POE_TOKEN_ENCRYPTION_KEY are used on both servers — they access the same database, so auth tokens must be decryptable by both.

## 7. Health Endpoint

```
GET /api/health
```

```json
{
  "status": "ok" | "degraded",
  "database": {
    "connected": true,
    "latencyMs": 54
  },
  "poe": {
    "authMode": "session",
    "enabled": true
  },
  "routes": { "poe": { "auth": [...], "builds": [...], "accounts": [...], "characters": [...] } }
}
```

- `status: "degraded"` if DB ping fails
- DB ping uses a fresh connection from the pool, then releases it
- Latency measured end-to-end (connect + query + release)

## 8. Deployment

```bash
# From local development machine:
git push

# VPS1 (app server):
ssh root@178.172.137.167
cd /opt/helperdesktop && git pull --ff-only
pnpm install --frozen-lockfile
pnpm --filter @helper/shared build
pnpm --filter @helper/poe-backend build
pnpm --filter @helper/server build
pm2 restart helperdesktop-server --update-env

# VPS2 (optional, if also running app):
ssh root@2.26.80.138
# Same commands (DATABASE_URL uses localhost)
```

**Build order**: shared → poe-backend → server (must match dependency chain)

Shorthand:
```bash
scripts/deploy.sh
```

## 9. Backup Strategy

| What | How | Frequency |
|------|-----|-----------|
| PostgreSQL | `pg_dump helperdesktop > backup.sql` | Manual, before migrations |
| Code | GitHub (master branch) | Every commit |

**Restore**:
```bash
PGPASSWORD=helper_secret_2026 psql -h 127.0.0.1 -U helperadmin -d helperdesktop -f backup.sql
```

No automated backup system in place. Recommended: add a cron job for daily `pg_dump`.

## 10. Known Issues

| Issue | Severity | Status |
|-------|----------|--------|
| Bot restarts on VPS1 (409: getUpdates conflict) | Low | Bot disabled, API unaffected |
| No SSL on nginx (HTTP only) | Medium | certbot ready, needs domain |
| No automated DB backups | Medium | Manual only |
| VPS2 also runs app server (unnecessary for DB-only role) | Low | Low resource usage, not exposed |
