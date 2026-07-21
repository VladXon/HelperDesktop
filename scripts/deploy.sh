#!/usr/bin/env bash
set -euo pipefail

SERVERS=(
  "server1:root@178.172.137.167"
  "server2:root@2.26.80.138"
)

resolve_remote() {
  local name="$1"
  for entry in "${SERVERS[@]}"; do
    local key="${entry%%:*}"
    local val="${entry#*:}"
    if [ "$key" = "$name" ]; then
      echo "$val"
      return 0
    fi
  done
  echo "Unknown VPS: $name" >&2
  echo "Available: server1 (Belarus), server2 (Germany)" >&2
  exit 1
}

if [ -z "${REMOTE:-}" ]; then
  VPS="${VPS:-server1}"
  REMOTE=$(resolve_remote "$VPS")
fi

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
  echo '--- build shared package ---'
  pnpm --filter @helper/shared build
  echo '--- build poe-backend package ---'
  pnpm --filter @helper/poe-backend build
  echo '--- db:migrate ---'
  pnpm --filter @helper/server db:migrate
  echo '--- build server ---'
  pnpm --filter @helper/server build
  echo '--- build bot ---'
  pnpm --filter @helper/bot build
  echo '--- pm2 reload ---'
  pm2 reload config/ecosystem.config.cjs || pm2 start config/ecosystem.config.cjs
  pm2 save
  echo '--- recent logs ---'
  pm2 logs helperdesktop-server --lines 30 --nostream --raw
"

echo "==> Deploy complete"
