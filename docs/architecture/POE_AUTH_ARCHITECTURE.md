# PoE Authentication Architecture — Final Design

> Version: 2.0 | Date: 2026-07-22 | Patch: 3.25

## 1. Problem Statement

The application needs to authenticate with Path of Exile to access character data, stash data, and the trade API. GGG does not provide a standard OAuth registration path for third-party applications — new `client_id` registration is **closed** as of 2026-07-22.

The only available authentication method is **POESESSID** — a session cookie from a user's logged-in browser session on `www.pathofexile.com`.

The core challenge: **GGG protects their API endpoints with Cloudflare**, which returns HTML challenge pages instead of JSON for non-browser HTTP clients. This makes simple `fetch()` or `net.fetch()` calls unreliable.

## 2. Previous Architecture (Pre-2.0) — Problems

### 2.1 Three Separate GGG Fetch Implementations

| # | File | Transport | Cookie | Cloudflare | Problems |
|---|------|-----------|--------|------------|----------|
| 1 | `electron-ggg-provider.ts` | BrowserWindow + executeJS | `session.cookies.set()` | Built-in (detects CF HTML) | Creates+destroys BrowserWindow per request (~3-5s each), clears cookies per call, used wrong endpoint (`/api/profile`) |
| 2 | `poe-account.service.ts` | `electron.net.fetch` | `headers.cookie` (lowercase) | None | No CF bypass, uses `User-Agent: HelperDesktop/1.0` (non-browser), separate rate limiter |
| 3 | `ggg-client.ts` (server) | Node `fetch()` | `Cookie` header | None | Server-only, can't use BrowserWindow |

### 2.2 Specific Bugs

- **B1**: `electron-ggg-provider.ts` called `/api/profile` (web app endpoint needing extra cookies) instead of `/character-window/get-account-name` (public API). Fixed: 2026-07-22.
- **B2**: BrowserWindow created per request with full cookie clear → Cloudflare session not reused.
- **B3**: `session.cookies.set()` used `sameSite: 'lax'` on `session.defaultSession` but BrowserWindow has its own session.
- **B4**: Character sync only works for `authType='session'`, not OAuth.
- **B5**: 4 separate `GggCharacterDetail` type definitions across client/server.
- **B6**: `maskSessionId()` duplicated in 2 files.
- **B7**: Rate limiter duplicated in 2 files.

### 2.3 No Fallback

When `electron-ggg-provider.ts`'s BrowserWindow failed (CF challenge timeout, session expired), there was no automatic fallback. The error was surfaced directly to the user as "session expired" even when the POESESSID was actually valid but Cloudflare was blocking the approach.

## 3. Research Findings

### 3.1 Community Tools

| Tool | Auth Method | Cookie Handling | Cloudflare |
|------|-------------|-----------------|------------|
| **Awakened PoE Trade** | `electron.net.request({useSessionCookies:true})` | Chromium defaultSession (persistent, zero manual management) | Chromium handles natively — no special code |
| **Exiled Exchange 2** | Same as Awakened | Same | Same |
| **PoB Community** | OAuth 2.1 PKCE (`client_id=pob`) | Token in memory + config file | N/A (OAuth) |
| **PoE Overlay** | Electron Chromium session | Cookies in browser context | Chromium natively |

**Key insight from Awakened PoE Trade**: They NEVER manage POESESSID. They never clear cookies. They never set cookies manually. They just use `net.request({ useSessionCookies: true })` and let Chromium's default session handle everything. Cloudflare challenges are solved natively by Chromium.

### 3.2 OAuth Research

- Registration for new `client_id` at `pathofexile.com/developer` is **CLOSED**
- Community tools use `client_id=pob` (PoB's registered client) — works but violates ToS
- OAuth scopes do NOT cover trade API (`/api/trade/*`) — only POESESSID can access trade
- OAuth tokens: Confidential 28d/90d, Public 10h/7d
- OAuth endpoints: `/oauth/authorize`, `/oauth/token`, `/api/profile` (Bearer), `/character` (Bearer)

### 3.3 Electron Session Persistence

- `session.defaultSession` — persistent by default, stored in Electron userData
- `session.fromPartition('persist:name')` — persistent, isolated session
- `session.fromPartition('name')` — in-memory only (no persist: prefix)
- Cookies in defaultSession survive app restarts
- `useSessionCookies: true` on `net.request` automatically attaches all cookies for the target domain

### 3.4 Cookie Dependency Matrix

| Endpoint | Requires POESESSID | Requires other cookies | Cloudflare |
|----------|-------------------|----------------------|------------|
| `/character-window/get-account-name` | **Yes** | No | Sometimes |
| `/character-window/get-characters` | **Yes** | No | Sometimes |
| `/character-window/get-items` | **Yes** | No | Sometimes |
| `/api/trade/search` | Optional | No | Sometimes |
| `/api/trade/fetch` | Optional | No | Sometimes |
| `/api/profile` | NOT sufficient | **Yes** (PHPSESSID) | Likely |

## 4. Transport Comparison

| Transport | Speed | Cloudflare | Cookie Method | Complexity | Score |
|-----------|-------|------------|---------------|------------|-------|
| `net.request` + `useSessionCookies` | Fast (100-300ms) | **Native** (Chromium solves CF) | Chromium defaultSession | Low | **9/10** |
| `net.fetch` + Cookie header | Fast (100-300ms) | No CF bypass (returns HTML) | Manual header | Low | 6/10 |
| Node `fetch()` + Cookie header | Fast (100-500ms) | No CF bypass | Manual header | Low | 5/10 |
| BrowserWindow + executeJS | Slow (3-5s) | **Bypassed** (renderer JS) | `session.cookies.set()` | High | 4/10 |
| Playwright | Very slow (5-15s) | Bypassed | Browser context | Very High | 2/10 |

**Winner**: `net.request` + `useSessionCookies: true` — fastest, simplest, Chromium handles Cloudflare natively. Used by Awakened PoE Trade successfully for years.

## 5. Cookie Strategy Comparison

| Strategy | Cookie Survival | Multi-Account | Simplicity | Score |
|----------|----------------|---------------|------------|-------|
| Chromium defaultSession (persistent) | Survives restart | No (single session) | High (zero code) | **9/10** |
| POESESSID in Cookie header | Per-request | Yes (free to switch) | High | 8/10 |
| Cleared cookies + POESESSID | Per-request | Yes | Medium | 5/10 |
| Imported Chrome cookies | Manual import | No | Low | 3/10 |

## 6. Final Architecture

```
                      ┌──────────────────────────────┐
                      │     Renderer / Preload        │
                      │  (never sees raw POESESSID)   │
                      └──────────┬───────────────────┘
                                 │ IPC
                      ┌──────────▼───────────────────┐
                      │      ipc/poe.ts               │
                      │  (IPC handlers — auth-aware)  │
                      └──────────┬───────────────────┘
                                 │
              ┌──────────────────▼──────────────────┐
              │         IGggAuthenticator            │
              │   (interface — no transport deps)    │
              └──────────────────┬──────────────────┘
                                 │
              ┌──────────────────▼──────────────────┐
              │    FallbackChainAuthenticator        │
              │                                      │
              │  1. DefaultSession                   │
              │     ↓ session_expired / CF / network │
              │  2. PoesessidHeader                  │
              │     ↓ CF / network                   │
              │  3. BrowserWindow                    │
              │     ↓ (stop — error to user)         │
              └──────────────────┬──────────────────┘
                                 │
         ┌───────────────────────┼──────────────────────┐
         │                       │                       │
   ┌─────▼──────┐       ┌───────▼──────┐       ┌───────▼──────┐
   │  Session   │       │  Poesessid   │       │ BrowserWindow│
   │ (primary)  │       │  (fallback1) │       │  (fallback2) │
   └────────────┘       └──────────────┘       └──────────────┘
    Chromium session      net.fetch +           BrowserWindow +
    useSessionCookies:true  Cookie header         executeJavaScript
```

### Fallback Logic (error classification)

| Error Category | Fallback? | Reason |
|---------------|-----------|--------|
| `session_expired` | **Yes** | Session might work with different method |
| `cloudflare_block` | **Yes** | Different transport might bypass CF |
| `network_error` | **Yes** | Transient, try next transport |
| `rate_limited` | **No** | Retry, don't change method |
| `invalid_params` | **No** | Not an auth issue — fix the request |
| `ggg_unavailable` | **No** | GGG is down — no transport will help |

## 7. Authentication Flow

### 7.1 Connect Session (`poe:connect-session`)

```
User enters POESESSID
   │
   ▼
setNewAuthPoesessid(poesessid)   → injects POESESSID into chain
   │
   ▼
getNewAuth().validate()
   │
   ├─ DefaultSession.validate()
   │   ├─ net.request /character-window/get-account-name
   │   │   └─ useSessionCookies: true
   │   ├─ 200 + JSON {name} ✓ → return valid
   │   └─ 401/403/CF/network ✗ → fallback
   │
   ├─ PoesessidAuth.validate()
   │   ├─ net.fetch + Cookie: POESESSID=xxx
   │   ├─ 200 + JSON {name} ✓ → return valid
   │   └─ CF/network ✗ → fallback
   │
   ├─ BrowserWindowAuth.validate()
   │   ├─ Create BrowserWindow
   │   ├─ clearSession + set POESESSID cookie
   │   ├─ Load /api/leagues (warmup + CF)
   │   ├─ Wait 3s
   │   ├─ executeJavaScript fetch /character-window/get-account-name
   │   ├─ 200 + JSON {name} ✓ → return valid
   │   └─ 401/403 ✗ → throw session_expired
   │
   └─ (all failed) throw auth_all_failed
```

### 7.2 Persistent Session (DefaultSessionAuthenticator)

```
User signs in via BrowserWindow → pathofexile.com/login
   │
   ▼
POESESSID + cf_clearance cookies stored in Chromium defaultSession
   │
   ▼
App restarts
   │
   ▼
Cookies persist in userData/Cookies (SQLite file on disk)
   │
   ▼
Every subsequent request:
   net.request({ useSessionCookies: true, url: GGG_API })
   │
   ▼
Chromium attaches POESESSID + cf_clearance automatically
Chromium solves Cloudflare challenges natively
```

**Cookie Lifetime — NOT "forever":**

| Cookie | Lifetime | Expires When |
|--------|----------|--------------|
| `POESESSID` | ~30 days idle | GGG session inactivity |
| `cf_clearance` | ~1 year | Cloudflare challenge resolved |
| `__cf_bm` | ~30 minutes | Session-level, auto-refreshed by CF JS |
| `PHPSESSID` | Hours | GGG PHP session timeout |

**Session becomes invalid when:**
- GGG invalidates the session (user logs out on website)
- POESESSID expires (~30 days of no activity on pathofexile.com)
- IP changes significantly (Cloudflare may re-challenge)
- User manually clears cookies in the app
- Different account signs in (cookies overwritten)

**Typical real-world behavior:**
1. User connects account → session works for ~2-4 weeks
2. Eventually: `net.request` returns 401/403 → `session_expired`
3. Fallback chain kicks in: `PoesessidAuthenticator` tries with fresh POESESSID
4. If that fails too → `BrowserWindowAuthenticator` recovers session
5. After recovery in BrowserWindow → new cookies written to defaultSession → cycle repeats

**NOTES for future debugging:**
- "Sometimes asks to reconnect" is EXPECTED — cookies expire naturally
- If `session_expired` occurs <24h after login: investigate CF clearance expiry
- If `session_expired` occurs every few hours: GGG may have reduced POESESSID lifetime
- Cookie storage path: `%APPDATA%/helper/Cookies` (the SQLite file can be inspected)

## 8. Security Model

| Concern | Solution |
|---------|----------|
| POESESSID logged in plaintext | NEVER logged — `maskSessionId()` first4+last4 only |
| POESESSID exposed to renderer | NEVER — preload only sees IPC results, not raw token |
| POESESSID in Electron storage | Old: `safeStorage` (DPAPI/Keychain). New: Chromium defaultSession cookies |
| POESESSID in transit to server | HTTPS — sent as Cookie header via `net.fetch` or `net.request` |
| Server-side storage | AES-256-GCM encrypted in PostgreSQL `access_token_encrypted` |
| Multi-account isolation | Chromium defaultSession = single account. Multi-account needs `session.fromPartition('persist:account-N')` |
| Cookie invalidation | `session.cookies.remove()` or `session.clearStorageData()` |
| Cookie expiration | POESESSID expires ~30 days after last GGG session use |

## 9. Configuration

### Feature Flag

```bash
# Use new IGggAuthenticator chain (default: true)
HELPER_USE_NEW_AUTH=1

# Use old electron-ggg-provider + poe-account.service
HELPER_USE_NEW_AUTH=0
```

### npm scripts

```bash
# Full transport × cookie × endpoint matrix benchmark
pnpm --filter @helper/client run auth:benchmark -- --poesessid=YOUR_SESSION_ID

# Stress test (single transport, many iterations)
pnpm --filter @helper/client run auth:stress -- --poesessid=YOUR_SESSION_ID --iterations=100

# Transport comparison (validation endpoints only)
pnpm --filter @helper/client run auth:compare -- --poesessid=YOUR_SESSION_ID
```

## 10. Migration Path to OAuth

When GGG reopens OAuth registration:

1. Implement `OAuthAuthenticator` implementing `IGggAuthenticator`
2. Replace `FallbackChainAuthenticator([session, poesessid, browserwindow])` with `OAuthAuthenticator`
3. No changes needed to IPC layer, renderer, or backend — interface stays the same
4. Trade API access remains POESESSID-only regardless of OAuth

## 11. Files Inventory (Post-Migration)

```
apps/client/src/main/services/poe/auth/
├── authenticator.ts          # IGggAuthenticator interface
├── session.ts                # DefaultSessionAuthenticator (primary)
├── poesessid.ts              # PoesessidAuthenticator (fallback #1)
├── browserwindow.ts          # BrowserWindowAuthenticator (fallback #2)
├── fallback.ts               # FallbackChainAuthenticator
├── factory.ts                # createGggAuthenticator() + singleton
├── feature-flag.ts           # HELPER_USE_NEW_AUTH toggle
├── benchmark/                # Reusable benchmark framework
│   ├── types.ts              # GggTransport, CookieProvider interfaces
│   ├── endpoints.ts          # Endpoint catalogue
│   ├── runner.ts             # Matrix runner + stress test
│   ├── reporter.ts           # JSON + Markdown + CSV
│   ├── artifacts.ts          # HAR storage
│   ├── transports/           # 4 transport implementations
│   └── cookies/              # 3 cookie provider implementations
│
└── (old files, kept until Step 3 cleanup)
    electron-ggg-provider.ts  # → replaced by browserwindow.ts
    poe-account.service.ts    # → legacy safeStorage, kept for transitional use
```

## 12. Maintenance Guidelines

1. **New transport**: Implement `GggTransport` interface in `benchmark/transports/`. Benchmark auto-discovers it.
2. **New cookie strategy**: Implement `CookieProvider` interface in `benchmark/cookies/`. Benchmark auto-discovers it.
3. **New authenticator**: Implement `IGggAuthenticator`, add to factory chain.
4. **Breaking change to GGG API**: Run `auth:benchmark` to verify which transports/endpoints still work.
5. **Logging**: All authenticators log to `AuthAttemptLog[]` — structured, searchable, never contains secrets.
6. **Future OAuth**: Implement `OAuthAuthenticator : IGggAuthenticator`, swap in factory. Zero downstream changes.
