# Database Architecture

## Production: PostgreSQL 16

The production database runs on a **separate VPS** (Germany, IP: 2.26.80.138) with PostgreSQL 16.

### Connection

```env
DATABASE_URL=postgres://helper:password@2.26.80.138:5432/helperdesktop
```

### Schema Management

Drizzle ORM with `node-postgres` driver (`pg` package).

```
apps/server/src/db/
├── schema.ts        # Drizzle ORM table definitions
├── index.ts         # getDb(), pool management
└── migrations/      # SQL migration files
```

### Tables

| Table | Purpose |
|-------|---------|
| `users` | Registered users (login, password hash, role) |
| `sessions` | JWT sessions (access + refresh tokens) |
| `notes` | User notes (markdown, pinned, completed) |
| `presets` | App launch presets |
| `settings` | Key-value user settings |
| `telegram_links` | Telegram bot user bindings |
| `telegram_actions` | Bot action log |
| `audit_log` | Security audit trail |
| `login_attempts` | Rate-limiting login attempts |
| `poe_accounts` | Connected PoE accounts (session / OAuth) |
| `poe_oauth_states` | OAuth CSRF state tokens |
| `poe_builds` | Imported PoE builds |
| `poe_characters` | Synced PoE characters |
| `poe_character_snapshots` | Character snapshot history |

### Common Commands

```bash
# Apply migrations
drizzle-kit migrate

# Check status
drizzle-kit check

# Generate from schema
drizzle-kit generate
```

## Development: SQLite (in-memory)

Client-side tests use SQLite in-memory via `better-sqlite3` for speed. The Drizzle schema is compatible with both PostgreSQL and SQLite dialects — Drizzle handles the differences.

## Encryption

Sensitive tokens (POESESSID, OAuth tokens) are encrypted with AES-256-GCM before storage:

- **Key**: `POE_TOKEN_ENCRYPTION_KEY` env var (64-char hex)
- **Module**: `packages/poe-backend/src/crypto/token-encryption.service.ts`
- **Column**: `poe_accounts.access_token_encrypted`, `refresh_token_encrypted`

Plaintext POESESSID is NEVER stored in the database.

## Backup

```bash
# PostgreSQL dump
pg_dump -h 2.26.80.138 -U helper -d helperdesktop -F c -f backup.dump

# Restore
pg_restore -h 2.26.80.138 -U helper -d helperdesktop backup.dump
```

## See Also

- `docs/PRODUCTION_TWO_VPS_ARCHITECTURE.md` — live production details
- `docs/deployment/DEPLOYMENT.md` — deploy commands
- `packages/poe-backend/src/crypto/` — token encryption
