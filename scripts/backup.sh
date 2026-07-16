#!/usr/bin/env bash
set -euo pipefail

REMOTE=${REMOTE:-root@178.172.137.167}
DB_PATH=${DB_PATH:-/opt/helperdesktop/apps/server/helperdesktop.db}
BACKUP_DIR=${BACKUP_DIR:-/opt/helperdesktop/backups}
RETENTION_DAYS=${RETENTION_DAYS:-30}
SSH_KEY=${SSH_KEY:-}
SSH_OPTS=(-o StrictHostKeyChecking=accept-new)

if [ -n "$SSH_KEY" ]; then
  SSH_OPTS+=(-i "$SSH_KEY")
fi

STAMP=$(date -u +%Y%m%dT%H%M%SZ)

echo "==> Backing up $REMOTE:$DB_PATH to $BACKUP_DIR/db-$STAMP.db"

ssh "${SSH_OPTS[@]}" "$REMOTE" "set -euo pipefail
  mkdir -p '$BACKUP_DIR'
  if [ ! -f '$DB_PATH' ]; then
    echo 'Database file not found: $DB_PATH' >&2
    exit 1
  fi
  sqlite3 '$DB_PATH' \".backup '$BACKUP_DIR/db-$STAMP.db'\"
  echo '--- retention: deleting backups older than $RETENTION_DAYS days ---'
  find '$BACKUP_DIR' -name 'db-*.db' -mtime +$RETENTION_DAYS -delete
  echo '--- remaining backups ---'
  ls -lh '$BACKUP_DIR' | tail -n 20
"

echo "==> Backup complete"
