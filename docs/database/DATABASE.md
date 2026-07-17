# Database

- **Engine**: SQLite via better-sqlite3
- **ORM**: Drizzle ORM
- **Mode**: WAL (Write-Ahead Logging)
- **Location**: `apps/server/helperdesktop.db`
- **Shared**: One database for server and bot (bot reads read-only)
- **Ports**: Vite :5173, Electron :5173, Express :3001

## Common Issues

- `database is locked` → stop server, delete `*.db-shm *.db-wal`, restart
