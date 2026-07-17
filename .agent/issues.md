# Known Issues

### fixed 2026-07-17: grammy transformer signature mismatch

- **Impact**: Bot crashed on startup — all API calls failed with `"Call to 'getMe' failed! (undefined: undefined)"`.
- **Root cause**: `apps/bot/src/index.ts` used `(prev) => async (method, payload, signal) => { ... }` (returning a new function), but grammy 1.44.x expects `async (prev, method, payload, signal) => { ... }` (returning `Promise<ApiResponse>`). `as any` cast hid the type error.
- **Fix**: Changed transformer signature, removed `as any` cast. Pinned grammy to exact `1.44.0` in package.json.
- **Prevention**: Exact pinning prevents silent API breakage. TypeScript now catches signature mismatches.

## Format

```
### Area: Short description

- **Severity**: low / medium / high / critical
- **Status**: open / in_progress / fixed / wontfix
- **Notes**: reproduction steps or context
```

---

### Architecture: Bot directly accesses server SQLite database

- **Severity**: critical
- **Status**: open
- **Notes**: Polling modules in `apps/bot/src/polling/` open the server's database directly via raw SQL instead of using the HTTP API. Creates implicit schema coupling. Concurrent writes from two processes cause `SQLITE_BUSY`. See `TECH_DEBT.md` C1.

### Security: Session rotation race condition

- **Severity**: critical
- **Status**: open
- **Notes**: `rotateSession` in `sessions.ts` has a TOCTOU race: concurrent requests can both pass the null check. If reuse is detected, `revokeAllSessionsForUser` logs the user out entirely. See `TECH_DEBT.md` C3.

### Security: No rate limiting on refresh endpoint

- **Severity**: critical
- **Status**: open
- **Notes**: `POST /api/auth/refresh` has no rate limiter unlike login/register/token. Enables brute-force of refresh tokens. See `TECH_DEBT.md` C2.

### Security: Weak CSP allows inline script execution

- **Severity**: critical
- **Status**: open
- **Notes**: CSP in `index.html` uses `'unsafe-inline'` with no explicit `script-src`. Combined with 35+ preload-exposed methods, any XSS compromises the app. See `TECH_DEBT.md` C6.

### Testing: Zero client test coverage

- **Severity**: critical
- **Status**: open
- **Notes**: Entire `apps/client/` (60+ files) has zero tests. IPC handlers, React components, hooks, providers all untested.

### Architecture: Bot runs via tsx in production

- **Severity**: high
- **Status**: open
- **Notes**: `BotManager` spawns `npx tsx src/index.ts`. Production build of bot (`dist/`) is never used. Deploy script wastes time building it. See `TECH_DEBT.md` H10.

### Security: Header-based auth sends plaintext credentials

- **Severity**: high
- **Status**: open
- **Notes**: `requireAuth` middleware accepts `X-Auth-Login` and `X-Auth-Password` headers on every request. Credentials transmitted in plaintext. See `TECH_DEBT.md` H1.

### Security: Token encryption silently falls back to plaintext

- **Severity**: critical
- **Status**: open
- **Notes**: `safe-storage.ts` stores tokens unencrypted if `safeStorage.isEncryptionAvailable()` returns false (e.g., Linux without keyring).

### Build: Deploy script doesn't build shared package

- **Severity**: high
- **Status**: open
- **Notes**: `scripts/deploy.sh` builds server and bot but not `@helper/shared`. Fresh deploy crashes with import errors. See `TECH_DEBT.md` H9.

### Maintainability: No linting configured

- **Severity**: medium
- **Status**: open
- **Notes**: All packages have `"lint": "echo \"not configured yet\""`. No ESLint or Biome. Unused imports and dead code go undetected.
