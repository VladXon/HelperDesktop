# Production Architecture — Single VPS

**Status: LIVE** | Last audited: 2026-07-22

---

## 1. Overview

```
Client (Electron) → VPS (2.26.80.138):3001 → Express API → PostgreSQL (localhost)
                                                        → Telegram Bot API
```

## 2. Server Roles

### VPS — Application + Database Server (2.26.80.138)

| Component | Detail |
|-----------|--------|
| **OS** | Ubuntu 24.04 |
| **App server** | Node.js, PM2 fork mode |
| **API** | Express, routes mounted at `/api/*` |
| **Database** | PostgreSQL 16 (localhost:5432) |
| **DB user** | `helperadmin` |
| **DB name** | `helperdesktop` |
| **Bot** | Telegram bot |
| **Auth** | JWT + scrypt, POE_AUTH_MODE=session |

## 3. Health Endpoint

```
GET /api/health
```

```json
{
  "status": "ok",
  "poe": {
    "authMode": "session",
    "enabled": true
  }
}
```

## 4. Deployment

```bash
git push origin main
ssh root@2.26.80.138
cd /opt/helper
git pull --ff-only
pnpm install --frozen-lockfile
pnpm --filter @helper/shared build
pnpm --filter @helper/poe-backend build
pnpm --filter @helper/server build
pnpm --filter @helper/bot build
pnpm --filter @helper/server db:migrate
pm2 reload ecosystem.config.cjs
```

Shorthand:
```bash
scripts/deploy.sh
```

## 5. Backup Strategy

| What | How | Frequency |
|------|-----|-----------|
| PostgreSQL | `pg_dump helperdesktop > backup.sql` | Manual, before migrations |
| Code | GitHub (main branch) | Every commit |

## 6. Known Issues

| Issue | Severity | Status |
|-------|----------|--------|
| No SSL (HTTP only) | Medium | Needs domain + certbot |
| No automated DB backups | Medium | Manual only |
