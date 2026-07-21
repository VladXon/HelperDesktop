# PoE Authentication

## Current: POESESSID Session Authentication (dev mode)

Set `POE_AUTH_MODE=session` in `.env`.

### Flow

```
Electron → POST /api/poe/auth/session/connect { poeSessionId }
  → Server validates POESESSID via GGG /character-window/get-account-name
  → Encrypts POESESSID with AES-256-GCM (POE_TOKEN_ENCRYPTION_KEY)
  → Stores in poe_accounts (auth_type='session')
  → Returns { connected: true, accountName }

Electron → GET /api/poe/auth/characters
  → Server decrypts POESESSID
  → Calls GGG /character-window/get-characters with cookie
  → Returns character list
```

### Configuration

```env
POE_AUTH_MODE=session
POE_TOKEN_ENCRYPTION_KEY=<64-char-hex>
```

### API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/poe/auth/url` | JWT | Returns `{mode:"session", connectEndpoint:"/api/poe/auth/session/connect"}` |
| POST | `/api/poe/auth/session/connect` | JWT | `{poeSessionId}` → validates + stores |
| GET | `/api/poe/auth/characters` | JWT | Returns characters via POESESSID |
| GET | `/api/poe/auth/status` | JWT | Connection status with authType |

### Security

- POESESSID stored encrypted (AES-256-GCM) in `poe_accounts.access_token_encrypted`
- Never logged, never exposed in responses
- Server-side only — client never receives raw POESESSID back

---

## Future: OAuth 2.1 Authorization Code Flow

Set `POE_AUTH_MODE=oauth` (default).

### Prerequisites

Register at https://www.pathofexile.com/developer

```env
POE_AUTH_MODE=oauth
POE_CLIENT_ID=<ggg-client-id>
POE_CLIENT_SECRET=<ggg-client-secret>
POE_REDIRECT_URI=https://yourdomain.com/api/poe/auth/callback
POE_TOKEN_ENCRYPTION_KEY=<64-char-hex>
```

### Flow

```
Electron → GET /api/poe/auth/url
  → Server creates OAuth state, returns GGG authorize URL
  → Electron opens browser

Browser → GGG OAuth authorize
  → User approves scopes: account:profile account:characters account:stashes
  → GGG redirects to /api/poe/auth/callback?code=...&state=...

Server → Exchange code for tokens via GGG /oauth/token
  → Fetch profile via GGG /api/profile
  → Encrypt access_token + refresh_token (AES-256-GCM)
  → Store in poe_accounts (auth_type='oauth')

Electron → GET /api/poe/auth/characters
  → Server decrypts access_token
  → Calls GGG /api/character with Bearer token
  → Returns character list
```

### Architecture

Both modes use the same:
- `poe_accounts` table (`auth_type` column: `'session'` | `'oauth'`)
- `POE_TOKEN_ENCRYPTION_KEY` for AES-256-GCM encryption
- Characters/status endpoints (auto-detect auth_type)

Switch between modes by changing `POE_AUTH_MODE` and restarting the server.
