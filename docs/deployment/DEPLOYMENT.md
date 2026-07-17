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

## VPS Server
- Host: 178.172.137.167
- OS: Ubuntu 24.04 LTS
- User: root (key-based auth, local ed25519 key)
- Uses: server hosting, bot hosting

## Git Rules
- Push to GitHub (`origin`), NOT to VPS. VPS pulls from GitHub.
- Never commit secrets, .env files, or build artifacts.

## Common Issues
- `JWT_SECRET is required` → set env var min 32 chars
- Bot not starting → check `BOT_SHARED_SECRET` match, `BOT_USERNAME`, bot token
