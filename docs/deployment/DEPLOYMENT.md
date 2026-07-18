# Deployment

**Only deploy server + bot. Do NOT deploy client code.**
Deploy: GitHub push → VPS pulls.

**Any server/bot changes MUST be discussed with user first.**
**All SSH work MUST use subagent** (`task` with `subagent_type: "general"`). Do NOT run SSH commands directly.

## Commands

```bash
pnpm deploy          # git pull → install → migrate → build → pm2 reload (via scripts/deploy.sh)
pnpm backup          # SQLite .backup with 30d retention (via scripts/backup.sh)
```

## PM2
- `pm2 start config/ecosystem.config.cjs`
- Deploy: `git pull && pnpm install && pnpm --filter server build && pnpm --filter bot build && pm2 restart all`

## VPS Servers

### Сервер 1 — Belarus (178.172.137.167)
- OS: Ubuntu 24.04 LTS
- User: root (key-based auth)
- Config: 2 vCPU / 4GB RAM / 50GB SSD
- Type: KVM

### Сервер 2 — Germany (2.26.80.138)
- Domain: verbal-ivory-buzzard.play2go.cloud
- OS: Ubuntu 22.04
- User: root (key-based auth)
- Config: 1 vCPU / 4GB RAM / 10GB
- Type: KVM

### Selection

```bash
# Default (Сервер 1)
./scripts/deploy.sh

# Specify by name
VPS=server2 ./scripts/deploy.sh

# Or by direct remote
REMOTE=root@2.26.80.138 ./scripts/deploy.sh
```

## Git Rules
- Push to GitHub (`origin`), NOT to VPS. VPS pulls from GitHub.
- Never commit secrets, .env files, or build artifacts.

## Common Issues
- `JWT_SECRET is required` → set env var min 32 chars
- Bot not starting → check `BOT_SHARED_SECRET` match, `BOT_USERNAME`, bot token
