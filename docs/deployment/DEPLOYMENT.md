# Deployment

## VPS Infrastructure

Two VPS servers:

| Role | Server | IP |
|------|--------|-----|
| App Server | VPS1 (Belarus) | `178.172.137.167` |
| Database | VPS2 (Germany) | `2.26.80.138` |

App server runs: Express API + nginx reverse proxy + PM2. Database server runs: PostgreSQL 16.

## Deploy Process

```bash
# 1. Push to GitHub
git push origin main

# 2. SSH to VPS1
ssh user@178.172.137.167

# 3. Pull + build + migrate
cd /opt/helperdesktop
git pull
pnpm install
pnpm build
cd apps/server
drizzle-kit migrate

# 4. Restart via PM2
pm2 reload all
```

## PM2 Configuration

```bash
pm2 start config/ecosystem.config.cjs
pm2 save
pm2 startup
```

### Useful PM2 Commands

```bash
pm2 status           # Process list
pm2 logs helper      # App logs
pm2 reload all       # Zero-downtime restart
pm2 restart all      # Hard restart
```

## Database Backup

```bash
# Full backup
pg_dump -h 2.26.80.138 -U helper -d helperdesktop -F c -f helperdesktop-$(date +%Y%m%d).dump

# Restore
pg_restore -h 2.26.80.138 -U helper -d helperdesktop helperdesktop-20260722.dump
```

Retention: 30 days of daily backups.

## Git Rules

- Never push directly to VPS. Push to GitHub, pull from VPS.
- Never commit `.env`, `node_modules`, or build artifacts.
- Never store secrets or credentials in git.

## Common Issues

### PM2 can't find `pnpm`
```bash
# Install pnpm globally
npm install -g pnpm
```

### Migration fails
```bash
cd apps/server
drizzle-kit check     # Verify schema
drizzle-kit drop      # WARNING: drops all data
drizzle-kit migrate   # Re-apply
```

### Server won't start
```bash
# Check env vars
grep -r "process.env" apps/server/src/config.ts

# Check DB connection
psql $DATABASE_URL -c "SELECT 1"

# Check port
netstat -tlnp | grep 3001
```

## Build Order

Packages must build in dependency order:

```bash
pnpm build
# Automatically builds:
#   1. packages/shared
#   2. packages/poe-engine
#   3. packages/poe-data
#   4. packages/poe-backend
#   5. apps/server
#   6. apps/bot
#   7. apps/client
```

The monorepo's build pipeline handles ordering automatically.
