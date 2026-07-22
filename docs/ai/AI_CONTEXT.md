# AI Context — HelperDesktop

> **Purpose**: Allow any AI model (including weaker ones) to understand this project quickly, without reading all source files.
> **Last updated**: 2026-07-22

## Project Summary

HelperDesktop is a **pnpm monorepo** containing an Electron desktop app, Express backend, Telegram bot, and Path of Exile analyzer.

Users manage notes, app presets, and connect Path of Exile accounts. The app communicates with a remote Express server (PostgreSQL) via JWT-authenticated HTTP. PoE authentication uses Chromium session cookies (`net.request` + `useSessionCookies`) with automatic fallback to BrowserWindow for Cloudflare bypass.

## Critical Architecture Rules

1. **Never bypass the service layer** — IPC handlers call services, services call providers. Never call GGG API directly from IPC.
2. **One authenticator to rule them all** — `IGggAuthenticator` interface. All GGG requests use the `FallbackChainAuthenticator`. Never add a new fetch path.
3. **PoE packages respect dependency direction** — `shared ← engine ← data ← backend`. Engine has zero I/O.
4. **Never store secrets in the DB** — POESESSID, API keys, OAuth tokens → `safeStorage` (Electron) or `safe-storage.json`.
5. **Existing patterns over new patterns** — before creating a new utility/service, check if an existing one solves the problem.
6. **TypeScript strict mode** — `tsc --noEmit` must pass. No `any` without documented justification.

## Architecture Map

```
Renderer (React)
  ↓ IPC
Main Process (Electron)
  ├─ PoE Auth Layer
  │   ├─ IGggAuthenticator (interface)
  │   ├─ FallbackChain: DefaultSession → Poesessid → BrowserWindow
  │   └─ Factory: getGggAuthenticator(poesessid?, accountId?)
  ├─ Backend Client (apiFetch → Express API)
  └─ Trade Service (GGG trade endpoints)
      ↓ HTTP/JWT
Express API (VPS)
  ├─ PoE Auth Routes
  │   ├─ Session mode: POST /session/connect (POESESSID)
  │   └─ OAuth mode: GET /url, GET /callback
  ├─ PoE Characters Route
  └─ JWT middleware (all routes)
      ↓ Drizzle ORM
PostgreSQL 16
  ├─ users, sessions (JWT)
  ├─ notes, presets, settings
  └─ poe_accounts, poe_characters, poe_builds
```

## Important Files

| Area | File | Purpose |
|------|------|---------|
| **PoE Auth** | `apps/client/src/main/services/poe/auth/authenticator.ts` | `IGggAuthenticator` interface + types |
| **PoE Auth** | `apps/client/src/main/services/poe/auth/session.ts` | DefaultSessionAuthenticator (primary, Chromium partition) |
| **PoE Auth** | `apps/client/src/main/services/poe/auth/fallback.ts` | FallbackChain (session → poesessid → browserwindow) |
| **PoE Auth** | `apps/client/src/main/services/poe/auth/factory.ts` | Singleton factory + per-account instances |
| **IPC** | `apps/client/src/main/ipc/poe.ts` | All PoE IPC handlers (auth, trade, import, characters) |
| **Preload** | `apps/client/src/main/preload.ts` | Renderer bridge (window.api.poe.*) |
| **Server GGG** | `apps/server/src/services/poe/ggg-client.ts` | Server-side GGG API client (Node fetch) |
| **Server Auth** | `apps/server/src/services/poe/oauth/poe-session-auth.service.ts` | Server session validation + token encryption |
| **DB Schema** | `apps/server/src/db/schema.ts` | Full Drizzle schema (all tables) |
| **Config** | `apps/server/src/config.ts` | Server env validation |
| **Shared** | `packages/shared/src/` | Zod schemas + shared types |
| **PoE Engine** | `packages/poe-engine/src/` | Pure calculation (no I/O) |
| **PoE Data** | `packages/poe-data/src/` | HTTP, PoB import, trade API, AI providers |
| **PoE Backend** | `packages/poe-backend/src/` | DB repos, services, route factory |
| **Benchmark** | `apps/client/src/main/services/poe/auth/benchmark/` | Pluggable auth benchmark framework |

## Data Flow: PoE Session Connect

```
1. User enters POESESSID in renderer (SessionPanel.tsx)
2. IPC: poe:connect-session → ipc/poe.ts
3. PoesessidAuthenticator.setPoesessid(sid)
4. FallbackChain.validate()
   ├─ DefaultSession.validate()
   │   └─ net.request('https://www.pathofexile.com/character-window/get-account-name', {useSessionCookies:true})
   │       ├─ 200 + JSON{name} → valid, return accountName
   │       └─ 401/403/CF → session_expired → fallback
   ├─ PoesessidAuth.validate()
   │   └─ net.fetch('https://www.pathofexile.com/...', {Cookie: POESESSID=xxx})
   │       ├─ 200 → valid
   │       └─ CF → fallback
   └─ BrowserWindowAuth.validate()
       └─ Hidden BrowserWindow → CF bypass → 200 or error
5. POST /api/poe/auth/session/connect {poeSessionId, accountName} → backend
6. Server: ggg-client.ts validates POESESSID again
7. Server: encryptToken(poesessid) → AES-256-GCM → poe_accounts
8. Returns {connected:true, accountName, mode:'session'}
```

## Common Mistakes AI Agents Make

| Mistake | Why It Happens | How To Avoid |
|---------|----------------|--------------|
| Adding new GGG fetch | Forgetting the authenticator exists | Check `auth/factory.ts` first — all GGG requests go through `IGggAuthenticator` |
| Using wrong endpoint | Copying from old code | Use `/character-window/get-account-name`, never `/api/profile` |
| Clearing cookies manually | Not understanding Chromium session persistence | DefaultSession NEVER clears cookies — Chromium handles caching |
| Creating duplicate types | Not checking shared packages | Check `packages/shared/src/` before defining new types |
| Bypassing IPC layer | Calling services directly from renderer | Renderer → preload → IPC → service. Never shortcut. |
| Adding dependencies without approval | Thinking "it's just one package" | All deps must be discussed. Check `package.json` first. |

## Verification Checklist

Before claiming any task is complete:

```
[ ] pnpm typecheck passes (all 8 workspace packages)
[ ] pnpm test passes (client 24 tests, PoE auth 7 tests)
[ ] pnpm build passes
[ ] No new dependencies added
[ ] No secrets exposed (POESESSID, API keys, tokens)
[ ] No duplicated code created
[ ] Existing architecture patterns followed
[ ] IPC handlers use the authenticator, not raw fetch
```
