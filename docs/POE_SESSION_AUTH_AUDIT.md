> **Deprecation Notice**: This document has been superseded by [PoE Auth Architecture](../docs/architecture/POE_AUTH_ARCHITECTURE.md). 
> The authoritative auth documentation is now in that file. This document is kept for historical reference.

# PoE Session Auth — Production Audit

## Architecture

```
Electron (IPC) → backend-client.ts → POST /api/poe/auth/session/connect
  → poe-auth.ts → SessionAuthProvider
  → GggClient.getAccountName(poesessid)
  → gggFetch() → pathofexile.com/character-window/get-account-name
  → encryptToken(AES-256-GCM) → PostgreSQL poe_accounts (auth_type='session')
```

### GGGClient (single abstraction layer)

All GGG API calls go through `services/poe/ggg-client.ts`:
- `getAccountName()` → `/character-window/get-account-name`
- `getCharacters()` → `/character-window/get-characters`
- `getCharacterDetail()` → `/character-window/get-items`

### Error codes

| Code | Meaning | HTTP |
|------|---------|------|
| `session_invalid` | Invalid POESESSID | 400 |
| `session_expired` | GGG returned 401/403 | 401 |
| `rate_limited` | GGG returned 429 + Retry-After | 429 |
| `ggg_unavailable` | GGG server unreachable | 502 |
| `ggg_api_error` | Other GGG errors | 502 |
| `decrypt_failed` | Token encryption key wrong | 500 |

### Security

- POESESSID NEVER logged — `maskSessionId()` shows only first 4 + last 4 chars
- Encrypted with AES-256-GCM via `POE_TOKEN_ENCRYPTION_KEY`
- Server refuses to start in session mode without encryption key
- DB column `access_token_encrypted` contains ciphertext only

### API

| Endpoint | Response |
|----------|----------|
| `GET /url` | `{mode:"session", connectEndpoint:"/api/poe/auth/session/connect"}` |
| `POST /session/connect` | `{connected:true, accountName}"..."` |
| `GET /status` | `{authenticated:true, account:"name", authType:"session", mode:"session", expires:null}` |
| `GET /characters` | `[{name, league, class, level}]` |
| `GET /accounts` | `[{id, accountName, authType, connected:true}]` |

### Remaining technical debt

- OAuth mode not yet configured (needs real GGG OAuth credentials)
- Client-side `poe-account.service.ts` duplicates GGGClient logic (legacy, kept for local POESESSID)
- Trade API calls in client `poe-trade.service.ts` don't use GGGClient (low priority, trade API doesn't need auth)
- `getCharacterDetail` endpoint not tested with real GGG data

### OAuth migration path

Switch `POE_AUTH_MODE=oauth`, configure `POE_CLIENT_ID/SECRET/REDIRECT_URI`, restart.

Both modes share `poe_accounts` table (differentiated by `auth_type` column).
No schema changes needed.
