#!/usr/bin/env bash
set -euo pipefail

REMOTE=${REMOTE:-root@178.172.137.167}
REMOTE_DIR=${REMOTE_DIR:-/opt/helperdesktop}
SSH_KEY=${SSH_KEY:-}
SSH_OPTS=(-o StrictHostKeyChecking=accept-new)

if [ -n "$SSH_KEY" ]; then
  SSH_OPTS+=(-i "$SSH_KEY")
fi

echo "==> Deploying to $REMOTE:$REMOTE_DIR"

ssh "${SSH_OPTS[@]}" "$REMOTE" "set -euo pipefail
  cd $REMOTE_DIR
  echo '--- git pull ---'
  git pull --ff-only
  echo '--- pnpm install ---'
  pnpm install --frozen-lockfile
  echo '--- db:migrate ---'
  pnpm --filter @helper/server db:migrate
  echo '--- build server ---'
  pnpm --filter @helper/server build
  echo '--- build bot ---'
  pnpm --filter @helper/bot build
  echo '--- pm2 reload ---'
  pm2 reload config/ecosystem.config.js || pm2 start config/ecosystem.config.js
  pm2 save
  echo '--- recent logs ---'
  pm2 logs helperdesktop-server --lines 30 --nostream --raw
"

echo "==> Deploy complete"
