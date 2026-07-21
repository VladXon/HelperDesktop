# API Reference

## Server Base URL

```
http://178.172.137.167:3001
```

## Authentication

Most endpoints require `Authorization: Bearer <jwt>` header.

### Auth Routes (`/api/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login, returns JWT |
| POST | `/api/auth/refresh` | No | Refresh JWT token |
| POST | `/api/auth/logout` | Yes | Invalidate session |

### Notes (`/api/notes`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/notes` | Yes | List user notes |
| POST | `/api/notes` | Yes | Create note |
| PUT | `/api/notes/:id` | Yes | Update note |
| DELETE | `/api/notes/:id` | Yes | Delete note |

### Presets (`/api/presets`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/presets` | Yes | List presets |
| POST | `/api/presets` | Yes | Create preset |
| PUT | `/api/presets/:id` | Yes | Update preset |
| DELETE | `/api/presets/:id` | Yes | Delete preset |

### Settings (`/api/settings`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/settings` | Yes | Get user settings |
| PUT | `/api/settings` | Yes | Update settings |

### Health (`/api/health`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | Health check + route listing |

---

## PoE Routes

### OAuth (`/api/poe/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/url` | Yes | Get GGG OAuth authorization URL |
| GET | `/callback` | No | OAuth callback from GGG |
| GET | `/characters` | Yes | List characters for connected account |
| GET | `/characters/:name` | Yes | Full character detail from GGG `/character/window` |
| GET | `/status` | Yes | Connection status (connected, tokenValid, scopes) |

### Builds (`/api/poe/builds`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | Yes | Save build + analysis |
| GET | `/` | Yes | List user's saved builds |
| GET | `/:hash` | Yes | Get single build |
| DELETE | `/:hash` | Yes | Delete build |
| POST | `/compare` | Yes | Compare two builds by hash. Body: `{ hashA, hashB }` |

### Accounts (`/api/poe/accounts`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Yes | List connected PoE accounts |
| DELETE | `/:id` | Yes | Disconnect PoE account |

---

## Electron IPC

Available from renderer via `window.api.poe.*`:

### Build Analysis
- `analyze(url, isUrl?)` — import PoB + run analysis
- `importUrl(url)` — import PoB from URL
- `importXml(xml)` — import PoB from XML

### Character Import
- `analyzeCharacter(name)` — fetch character detail + convert + analyze
- `fetchOAuthCharacters()` — list characters for connected OAuth account
- `fetchCharacterDetail(name)` — raw GGG character detail JSON

### Build Persistence
- `saveBuild(data)` — save to server
- `listBuilds()` — list saved builds
- `deleteBuild(hash)` — delete build
- `compareBuilds(hashA, hashB)` — compare two builds

### OAuth
- `connectAccount()` — get auth URL + open browser
- `completeOAuth(code, state)` — complete OAuth flow
- `getOAuthStatus()` — check connection
- `getAccounts()` — list connected accounts
- `disconnectAccount(id)` — disconnect

### Trade Data
- `getLeagues()` — list leagues
- `fetchExchangeRate(league, have, want)` — currency exchange
- `searchItems(league, query)` — item search
