# PoE Authentication Architecture Inventory — Phase 0 Baseline

> Generated: 2026-07-22 | Patch: 3.25 | Prior to auth refactoring

## 1. Authentication Classes & Modules

### 1.1 Core Types & Interfaces

| Module | File | Lines | Role |
|--------|------|-------|------|
| `PoeDataProvider` (interface) | `apps/server/src/services/poe/ggg-data-provider.ts` | 1-51 | Canonical interface: `getAccountName()`, `getCharacters()`, `getCharacterDetail()` |
| `GggCharacter` (type) | `apps/server/src/services/poe/ggg-data-provider.ts` | 1-6 | Character list item |
| `GggCharacterDetail` (type) | `apps/server/src/services/poe/ggg-data-provider.ts` | 8-45 | Full character + items + jewels. Defined here, duplicated in 3 other files |
| `PoeSessionData` (type) | `apps/client/src/main/services/poe/poe-account.service.ts` | 8-12 | `{ poesessid, accountName, validatedAt }` |
| `PoeAccountService` (interface) | `apps/client/src/main/services/poe/poe-account.service.ts` | 14-23 | Local session CRUD + char/stash fetch |
| `PoeAuthProvider` (interface) | `apps/server/src/services/poe/oauth/poe-session-auth.service.ts` | 9-14 | Server-side: `connect()`, `disconnect()`, `getAccount()`, `getAccessToken()` |
| `GggApiResponse<T>` (type) | `apps/client/src/main/services/poe/electron-ggg-provider.ts` | 56-63 | BrowserWindow fetch result wrapper |
| `TradeSource` (interface) | `packages/poe-data/src/data/sources/trade.source.ts` | 31-36 | Trade API: `searchItems()` requires POESESSID |

### 1.2 HTTP Client Implementations (3 distinct)

| # | Name | File | Transport | Cookie Method | Cloudflare |
|---|------|------|-----------|---------------|------------|
| 1 | `gggFetch()` (server) | `apps/server/src/services/poe/ggg-client.ts:14-54` | Node `fetch()` | `Cookie` header | None |
| 2 | `fetchViaWindow()` | `apps/client/src/main/services/poe/electron-ggg-provider.ts:98-170` | BrowserWindow + executeJS | `session.cookies.set()` | Built-in (detects CF HTML) |
| 3 | `gggFetch()` (client legacy) | `apps/client/src/main/services/poe/poe-account.service.ts:32-44` | `electron.net.fetch` | `headers.cookie` (lowercase) | None |

### 1.3 Authentication Providers (2 modes)

| Mode | File | Method | Token Storage | Endpoints for Validation |
|------|------|--------|---------------|--------------------------|
| Session | `apps/server/src/services/poe/oauth/poe-session-auth.service.ts:1-129` | POESESSID cookie | `access_token_encrypted` (AES-256-GCM) | `/character-window/get-account-name` |
| OAuth | `apps/server/src/services/poe/oauth/poe-oauth.service.ts:1-284` | Bearer token (OAuth 2.1 PKCE) | `access_token_encrypted` + `refresh_token_encrypted` | `/api/profile` (Bearer), `/character` (Bearer) |

### 1.4 Route Layer

| Route | File | Lines | Handler |
|-------|------|-------|---------|
| `GET /api/poe/auth/url` | `apps/server/src/routes/poe-auth.ts` | 23-44 | Returns `{mode, connectEndpoint}` or OAuth URL |
| `POST /api/poe/auth/session/connect` | `apps/server/src/routes/poe-auth.ts` | 61-73 | Validates + stores POESESSID |
| `GET /api/poe/auth/callback` | `apps/server/src/routes/poe-auth.ts` | 46-59 | OAuth callback handler |
| `GET /api/poe/auth/characters` | `apps/server/src/routes/poe-auth.ts` | 75-90 | Auto-detects auth_type → session/OAuth provider |
| `GET /api/poe/auth/characters/:name` | `apps/server/src/routes/poe-auth.ts` | 92-102 | Character detail |
| `GET /api/poe/auth/status` | `apps/server/src/routes/poe-auth.ts` | 104-127 | Connection status |
| `POST /api/poe/characters/sync` | `apps/server/src/routes/poe-characters.ts` | 30-65 | Session-only character sync |
| `POST /api/poe/characters/:id/refresh` | `apps/server/src/routes/poe-characters.ts` | 67-89 | Session-only character refresh |

### 1.5 IPC Layer (Client Main Process)

| Channel | File | Lines | Implementation |
|---------|------|-------|----------------|
| `poe:set-session` | `apps/client/src/main/ipc/poe.ts` | 31-38 | Local session (legacy, uses `poe-account.service.ts`) |
| `poe:get-session` | `apps/client/src/main/ipc/poe.ts` | 40 | Local session read |
| `poe:clear-session` | `apps/client/src/main/ipc/poe.ts` | 41 | Local session clear |
| `poe:connect-session` | `apps/client/src/main/ipc/poe.ts` | 182-185 | Validates via `electron-ggg-provider` + sends to backend |
| `poe:get-oauth-status` | `apps/client/src/main/ipc/poe.ts` | 170-172 | Server OAuth status |
| `poe:fetch-oauth-characters` | `apps/client/src/main/ipc/poe.ts` | 174-176 | Server character list (session or OAuth) |
| `poe:get-accounts` | `apps/client/src/main/ipc/poe.ts` | 152-154 | Connected PoE accounts list |
| `poe:disconnect-account` | `apps/client/src/main/ipc/poe.ts` | 156-158 | Disconnect PoE account |

### 1.6 Encryption

| Module | File | Algorithm | Key Source |
|--------|------|-----------|------------|
| `encryptToken/decryptToken` | `packages/poe-backend/src/crypto/token-encryption.service.ts` | AES-256-GCM (16B IV, 16B auth tag) | `process.env.POE_TOKEN_ENCRYPTION_KEY` (min 32 chars) |
| `safeStorage.encryptString/decryptString` | `apps/client/src/main/utils/safe-storage.ts` | OS-native (DPAPI/Keychain) | Electron `safeStorage` API |

---

## 2. Endpoint Inventory

### 2.1 Session-Validated (POESESSID Cookie)

| Endpoint | Used By | Method | Notes |
|----------|---------|--------|-------|
| `/character-window/get-account-name` | Server `ggg-client.ts:60`, Client `poe-account.service.ts:68`, Client `electron-ggg-provider.ts:176` | GET | Returns `{name}`. **Primary validation endpoint** |
| `/character-window/get-characters` | Server `ggg-client.ts:67`, Client `electron-ggg-provider.ts:184`, Client `poe-account.service.ts:106` | GET | Returns character array. Accepts `?accountName=` query |
| `/character-window/get-items` | Server `ggg-client.ts:73`, Client `electron-ggg-provider.ts:194` | GET | Full character detail. Params: `character`, `accountName` |
| `/character-window/get-stash-items` | Client `poe-account.service.ts:114` | GET | Stash data. Params: `league`, `tabs`, `tabIndex` |
| `/api/trade/search/{league}` | `packages/poe-data/src/data/sources/trade.source.ts:47` | POST | Trade search. POESESSID optional (higher rate limit with it) |
| `/api/trade/fetch/{ids}` | `packages/poe-data/src/data/sources/trade.source.ts:57` | GET | Trade listing fetch. POESESSID optional |
| `/api/profile` | (Was in `electron-ggg-provider.ts` before fix) | GET | **INCORRECT** — web app endpoint, requires additional cookies |

### 2.2 OAuth-Validated (Bearer Token)

| Endpoint | Used By | Method | Notes |
|----------|---------|--------|-------|
| `/oauth/authorize` | `poe-oauth.service.ts:25` | GET | OAuth authorize URL builder |
| `/oauth/token` | `poe-oauth.service.ts:47` | POST | Token exchange (authorization_code, refresh_token, client_credentials) |
| `/api/profile` | `poe-oauth.service.ts:51` | GET (Bearer) | User profile with UUID — works with OAuth Bearer, NOT with POESESSID |
| `/character` | `poe-oauth.service.ts` | GET (Bearer) | Character list via OAuth |
| `/character/{name}` | `poe-oauth.service.ts` | GET (Bearer) | Character detail via OAuth |

### 2.3 Public (No Auth)

| Endpoint | Used By | Notes |
|----------|---------|-------|
| `/api/leagues?type=main` | `electron-ggg-provider.ts:115` (BrowserWindow warmup) | Public leagues list. Used to establish CF session |
| `/api/trade/data/leagues` | Various | League names for trade |
| `/api/trade/data/items` | Various | Item definitions |
| `/api/trade/data/stats` | Various | Mod/search definitions |
| `/api/trade/exchange/{league}` | `trade.source.ts:77` | Exchange rate searches |

### 2.4 Endpoint Discovery Candidates (from community tools + official docs)

| Endpoint | Source | Status |
|----------|--------|--------|
| `/character-window/get-passive-skills` | PoB Community (site import) | Public, used for passive tree data |
| `/api/leagues` | Electron provider warmup | Public |
| `/api/account/leagues` | GGG docs | OAuth required |
| `/api/account/stashes` | GGG docs | OAuth required (`account:stashes`) |
| `/api/account/stashes/{id}` | GGG docs | OAuth required |
| `/api/profile` | GGG docs | OAuth Bearer required. **Do NOT use with POESESSID** |

---

## 3. Cookie Inventory

### 3.1 Cookies Used by the Application

| Cookie | Required By | Purpose | Set By |
|--------|-------------|---------|--------|
| `POESESSID` | All session-mode endpoints | Session identifier | User copies from browser |
| `cf_clearance` | BrowserWindow approach (via CF) | Cloudflare clearance token | Cloudflare JS challenge |
| `__cf_bm` | BrowserWindow approach (via CF) | Cloudflare bot management | Cloudflare |

### 3.2 Cookie Dependency Analysis (per endpoint)

| Endpoint | POESESSID | PHPSESSID | cf_clearance | __cf_bm | Notes |
|----------|-----------|-----------|--------------|---------|-------|
| `/character-window/get-account-name` | **Required** | Not needed | Not needed | Not needed | Public API, least auth friction |
| `/character-window/get-characters` | **Required** | Not needed | Not needed | Not needed | + optional `accountName` param |
| `/character-window/get-items` | **Required** | Not needed | Not needed | Not needed | + `character` + optional `accountName` |
| `/character-window/get-stash-items` | **Required** | Not needed | Not needed | Not needed | |
| `/api/trade/search` | Optional | Not needed | Not needed | Not needed | Works without auth (lower rate limit) |
| `/api/trade/fetch` | Optional | Not needed | Not needed | Not needed | Works without auth |
| `/api/profile` | NOT sufficient | **Required** | Possibly | Possibly | Web app endpoint — needs full browser session |
| `/api/leagues` | None | Not needed | Not needed | Not needed | Public endpoint |

### 3.3 BrowserWindow Cookie Lifecycle

Current flow in `fetchViaWindow()` (`electron-ggg-provider.ts:98-170`):

```
1. Create BrowserWindow (fresh, no cookies)
2. session.clearStorageData(['cookies'])     ← clears ALL cookies
3. session.cookies.set(POESESSID)            ← sets only POESESSID
4. win.loadURL('/api/leagues?type=main')     ← may receive CF cookies in response
5. Wait 3s + up to 25s timeout               ← allows CF JS to execute
6. executeJavaScript fetch(path)             ← makes API call with cookies from step 3 + step 4
7. win.destroy()
```

**Problem**: Step 2 removes cookies that GGG may require for `/api/profile` (web app endpoint) but is fine for `/character-window/*` endpoints.

---

## 4. Duplication Inventory

### 4.1 Code Duplicates

| # | What | Locations | Severity |
|---|------|-----------|----------|
| 1 | `maskSessionId()` | Server `ggg-client.ts:9-12`, Client `electron-ggg-provider.ts:51-54` | Low |
| 2 | GGG fetch + error handling | 3 implementations (server fetch, client BrowserWindow, client net.fetch) | **High** |
| 3 | `getAccountName()` logic | Server `ggg-client.ts:58-62`, Client `electron-ggg-provider.ts:174-178`, Client `poe-account.service.ts:66-73` | **High** |
| 4 | `getCharacters()` logic | Server `ggg-client.ts:65-69`, Client `electron-ggg-provider.ts:181-186`, Client `poe-account.service.ts:101-106` | **High** |
| 5 | `getCharacterDetail()` logic | Server `ggg-client.ts:71-74`, Client `electron-ggg-provider.ts:188-195` | Medium |
| 6 | `GggCharacterDetail` type | 4 separate definitions across client/server/oauth | Medium |
| 7 | Rate limiter | `poe-account.service.ts:25-30`, `poe-trade.service.ts:8-13` | Medium |
| 8 | Error code classification | Server `ggg-client.ts:31-50` (HttpError), Client `electron-ggg-provider.ts:79-96` (Object.assign) | Medium |
| 9 | `createGggClient()` instantiation | 3+ places on server (no singleton) | Low |

### 4.2 Path Duplication

- Character fetch from session: 2 paths (server-side `ggg-client.ts` vs client-side `electron-ggg-provider.ts`)
- Session validation: 2 paths (`poe:set-session` legacy vs `poe:connect-session` new)
- Token decryption: Direct import in session/oauth services vs dynamic import in character routes

---

## 5. BrowserWindow / Session Inventory

| Usage | File | Lines | Purpose |
|-------|------|-------|---------|
| `createGggWindow()` | `electron-ggg-provider.ts` | 65-77 | Creates headless BrowserWindow per API call |
| `fetchViaWindow()` | `electron-ggg-provider.ts` | 98-170 | Full Cloudflare bypass pipeline |
| `session.clearStorageData()` | `electron-ggg-provider.ts` | 103 | Clears ALL cookies before each call |
| `session.cookies.set()` | `electron-ggg-provider.ts` | 105-113 | Sets POESESSID cookie on `.pathofexile.com` |
| `win.loadURL()` | `electron-ggg-provider.ts` | 115 | Loads `/api/leagues?type=main` as session warmup |
| `win.webContents.executeJavaScript()` | `electron-ggg-provider.ts` | 155 | Injects fetch() inside browser context |
| `win.destroy()` | `electron-ggg-provider.ts` | 168 | Destroys window (no reuse — created fresh per call) |

---

## 6. Cloudflare Handling Inventory

| Method | File | Lines | Approach |
|--------|------|-------|----------|
| BrowserWindow CF bypass | `electron-ggg-provider.ts:98-170` | Full pipeline | Headless Chromium renders CF JS challenge natively |
| CF HTML detection | `electron-ggg-provider.ts:79-96` | `makeGggError()` | Checks body for `Just a moment`/`challenge`/`cf-browser` strings |
| CF 403 HTML detection | `electron-ggg-provider.ts:86-87` | `makeGggError()` | Returns `ggg_unavailable` for HTML 403/503 |
| `did-fail-load` ERR_ABORTED | `electron-ggg-provider.ts:127-128` | `fetchViaWindow()` | Ignores ERR_ABORTED (-3) from CF navigation redirects |
| JS fetch content-type check | `electron-ggg-provider.ts:142-143` | JS fetch script | Detects `text/html` vs `application/json` for CF detection |

---

## 7. Authentication Dependency Graph

```
┌── Renderer ──────────────────────────────────────────────────────────┐
│ SessionPanel.tsx                                                      │
│   ├─→ api.setSession(poesessid)                                      │
│   │    └─→ poe:connect-session IPC                                    │
│   └─→ api.getSession()                                               │
│         ├─→ poe:get-session (local safeStorage)                       │
│         └─→ poe:get-oauth-status (server)                             │
│                                                                       │
│ PoeAccountPanel.tsx                                                   │
│   ├─→ poe:get-accounts                                               │
│   ├─→ poe:get-auth-url → OAuth flow                                  │
│   ├─→ poe:complete-oauth → OAuth callback                            │
│   └─→ poe:fetch-oauth-characters                                     │
└──────────────────────────────────────────────────────────────────────┘
        │ IPC                                          │ IPC
        ▼                                              ▼
┌── Main Process ──────────────────────────────────────────────────────┐
│ ipc/poe.ts (central dispatcher)                                       │
│                                                                       │
│ poe:connect-session                                                   │
│   ├─→ electron-ggg-provider.ts (BrowserWindow CF bypass)              │
│   │    ├─→ createGggWindow()                                          │
│   │    ├─→ session.clearStorageData(['cookies'])                     │
│   │    ├─→ session.cookies.set(POESESSID)                             │
│   │    ├─→ win.loadURL('/api/leagues?type=main')  ← CF challenge    │
│   │    ├─→ win.webContents.executeJavaScript(fetch)  ← actual API    │
│   │    └─→ makeGggError()  ← error classification                    │
│   └─→ backend-client.ts: connectSession()                             │
│        └─→ POST /api/poe/auth/session/connect (JWT)                  │
│                                                                       │
│ poe:set-session (legacy)                                              │
│   └─→ poe-account.service.ts                                         │
│        ├─→ gggFetch('/character-window/get-account-name')  ← net.fetch│
│        └─→ writeSession() → safeStorage.encryptString()              │
└──────────────────────────────────────────────────────────────────────┘
        │ HTTP (JWT)
        ▼
┌── Server ─────────────────────────────────────────────────────────────┐
│ routes/poe-auth.ts                                                    │
│                                                                       │
│ POST /session/connect                                                 │
│   └─→ SessionAuthProvider.connect()                                  │
│        ├─→ validateSessionId()  (>= 20 chars)                        │
│        ├─→ ggg-client.ts: getAccountName(poesessid)                   │
│        │    └─→ gggFetch()  ← Node fetch() with Cookie header        │
│        ├─→ encryptToken(poesessid)  ← AES-256-GCM                    │
│        └─→ DB: INSERT/UPDATE poe_accounts (authType='session')       │
│                                                                       │
│ GET /characters                                                       │
│   ├─→ [session] getSessionProviderCharacters()                       │
│   │    └─→ decryptToken() → createGggClient().getCharacters()        │
│   └─→ [oauth] getOAuthCharacters()                                   │
│        └─→ getAccessToken() → GET /character (Bearer)               │
└──────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌── Database ───────────────────────────────────────────────────────────┐
│ poe_accounts                                                          │
│   ├── access_token_encrypted  ← AES-256-GCM (POESESSID or Bearer)    │
│   ├── refresh_token_encrypted ← AES-256-GCM (OAuth only)             │
│   ├── auth_type: 'session' | 'oauth'                                 │
│   └── poe_account_id: ('session-{userId}-{timestamp}' | GGG UUID)   │
│                                                                       │
│ poe_oauth_states (CSRF)                                              │
│ poe_characters (normalized)                                           │
│ poe_character_snapshots (history)                                     │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 8. Known Bugs & Issues (Current Baseline)

| ID | Bug | File:Line | Severity |
|----|-----|-----------|----------|
| B1 | Lowercase `headers.cookie` vs `'Cookie'` | `poe-account.service.ts:36` | Low |
| B2 | `authType` defaults to `'oauth'` in session provider | `poe-session-auth.service.ts:101` | Medium |
| B3 | BrowserWindow created+destroyed per request (no reuse) | `electron-ggg-provider.ts:65-170` | Medium |
| B4 | `/api/profile` used for session validation (fixed → `/character-window/get-account-name`) | `electron-ggg-provider.ts:176` (now fixed) | High |
| B5 | Session + OAuth tokens share `access_token_encrypted` column | Schema | Low |
| B6 | Character sync only works for `authType='session'` | `poe-characters.ts:56` | High |
| B7 | 3 independent GGG fetch implementations | Multiple | High |
| B8 | `session.cookies.set` uses `sameSite: 'lax'` — may not match GGG expectations | `electron-ggg-provider.ts:112` | Low |
| B9 | Initial load uses API endpoint (`/api/leagues`) instead of HTML page — may not trigger CF challenge properly | `electron-ggg-provider.ts:115` | Medium |
| B10 | `did-finish-load` may fire before CF JS completes — 3s fixed wait is fragile | `electron-ggg-provider.ts:117-133` | Medium |

---

## 9. Security Inventory

| Asset | Storage | Encryption | Transport | Exposure Risk |
|-------|---------|------------|-----------|---------------|
| POESESSID (local) | `poe-session.json` | Electron `safeStorage` (OS keychain) | N/A (local) | Low |
| POESESSID (server) | `poe_accounts.access_token_encrypted` | AES-256-GCM | HTTPS to server | Low |
| POESESSID (transit) | N/A | N/A | HTTPS to GGG (Cookie header) | Medium (plain in HTTP header) |
| OAuth access token | `poe_accounts.access_token_encrypted` | AES-256-GCM | HTTPS to server, HTTPS to GGG | Low |
| OAuth refresh token | `poe_accounts.refresh_token_encrypted` | AES-256-GCM | HTTPS to server, HTTPS to GGG | Low |
| OAuth CSRF state | `poe_oauth_states` | None (plaintext, 10min TTL) | HTTPS | Low |
| JWT token | `auth.json` | Electron `safeStorage` | HTTPS to server | Low |
| AI API keys | `safeStorage` | Electron `safeStorage` | Variable | Low |

---

## 10. Migration Readiness (Session → OAuth)

| Item | Status |
|------|--------|
| Shared `poe_accounts` schema | Ready |
| Shared `POE_TOKEN_ENCRYPTION_KEY` | Ready |
| `auth_type` discriminator column | Ready |
| Route auto-detection (`/characters`, `/status`) | Ready |
| Session provider interface (`PoeAuthProvider`) | Ready (server-side only) |
| OAuth provider implementation | Ready |
| Client-side OAuth flow | Ready (IPC + renderer) |
| Character sync for OAuth | **NOT READY** — only session mode supported |
| Trade API with OAuth | Not implemented |

---

## 11. Summary: What Needs to Change

1. **Unify 3 HTTP clients → 1** with interchangeable transports (Node fetch, electron.net.fetch, BrowserWindow)
2. **Extract shared types** (`maskSessionId`, `GggCharacterDetail`, rate limiter) to packages
3. **Create `IGggAuthenticator`** interface for session/OAuth interchangeability
4. **Implement fallback chain** (primary transport → fallback transport → BrowserWindow → error)
5. **Add structured logging** (transport, endpoint, cookies masked, status, CF detection, latency, fallback)
6. **Add OAuth character sync** support in `poe-characters.ts`
7. **Fix BrowserWindow reuse** or eliminate BrowserWindow if Chromium session approach works
8. **Add benchmark + stress-test infrastructure**
