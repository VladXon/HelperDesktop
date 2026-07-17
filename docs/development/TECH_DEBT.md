# Technical Debt Register

Last audit: 2026-07-17

Priorities: **Critical** → **High** → **Medium** → **Low**

---

## Critical

### C1. Bot directly accesses server database (bypassing API)

**Category**: Architecture  
**Files**: `apps/bot/src/polling/reminders.ts`, `apps/bot/src/polling/notifications.ts`  
**Issue**: Polling modules open the server's SQLite database directly using raw SQL instead of communicating via the HTTP API (`ServerClient`). This creates implicit coupling to the server's internal schema. SQLite is not designed for reliable concurrent multi-process writes.  
**Fix**: Move polling logic to server API endpoints (`GET /api/internal/bot/pending-reminders`, etc.) and have bot call them via `ServerClient`.  

### C2. No rate limiting on `/api/auth/refresh`

**Category**: Security  
**File**: `apps/server/src/routes/auth.ts:157`  
**Issue**: The refresh token endpoint has no rate limiter, unlike `/login`, `/register`, `/token`. Enables offline brute-force of refresh tokens.  
**Fix**: Apply `authPerMinLimit` to the `/refresh` route.  

### C3. Race condition in session rotation — reuse detection can revoke all sessions

**Category**: Security/Reliability  
**File**: `apps/server/src/auth/sessions.ts:72-99`  
**Issue**: `rotateSession` reads session row (SELECT), checks `refreshTokenUsedAt === null`, then UPDATEs. Two concurrent requests can both pass the null check. If reuse IS detected, `revokeAllSessionsForUser` logs the user out everywhere.  
**Fix**: Use atomic `UPDATE ... SET refreshTokenUsedAt = ? WHERE id = ? AND refreshTokenUsedAt IS NULL` and check `changes`. Only revoke all sessions after confirmed reuse.  

### C4. Unsafe dynamic field toggle — no column whitelist

**Category**: Security  
**File**: `apps/server/src/routes/notes.ts:149`  
**Issue**: `const current = Boolean((existing as Record<string, unknown>)[parsed.data.field])` — the `field` value from request body is used directly as a property key. No validation that `field` is an actual column. `Record<string, unknown>` cast bypasses TypeScript.  
**Fix**: Validate `field` against a whitelist of allowed toggleable columns (e.g., `'pinned' | 'completed'`).  

### C5. Synchronous DB in async wrappers — event loop blocking

**Category**: Performance  
**Files**: `apps/server/src/middleware/auth.ts:28-74`, many route handlers  
**Issue**: `better-sqlite3` is synchronous — `db.select().from(...).all()` blocks the thread. Wrapped in `async` functions, giving illusion of non-blocking behavior. Under load, one slow query blocks ALL requests.  
**Fix**: Remove unnecessary `async`/`await` wrappers. Accept synchronous nature of `better-sqlite3`. Consider connection pool for production workloads.  

### C6. Weak Content Security Policy in Electron renderer

**Category**: Security  
**File**: `apps/client/index.html:5`  
**Issue**: CSP allows `'unsafe-inline'` without explicit `script-src`. Combined with 35+ preload-exposed methods, any XSS leads to full compromise.
**Fix**: Set `script-src 'self'` explicitly. Use nonces for inline scripts.  

### C7. Default HTTP URL — tokens sent in plaintext

**Category**: Security  
**File**: `apps/client/src/main/utils/http-client.ts:9`  
**Issue**: `DEFAULT_SERVER_URL = 'http://178.172.137.167:3001'` sends Bearer tokens and passwords over plain HTTP.
**Fix**: Default to `https://`. Add warning for non-HTTPS URLs.

### C8. Token encryption silently falls back to plaintext

**Category**: Security  
**File**: `apps/client/src/main/utils/safe-storage.ts:22-29`  
**Issue**: If `safeStorage.isEncryptionAvailable()` returns false, credentials stored unencrypted on disk. Linux systems without keyring silently leak credentials.
**Fix**: Refuse to store credentials when encryption is unavailable.

### C9. Preload exposes full API surface — any XSS is game over

**Category**: Security  
**File**: `apps/client/src/main/preload.ts:10-74`  
**Issue**: 35+ methods exposed via `contextBridge`. Combined with weak CSP, any XSS can invoke arbitrary IPC handlers including server restart and privilege escalation.
**Fix**: Reduce exposed API per renderer context. Add input validation to all IPC handlers.

### C10. No tests for Electron client

**Category**: Testing  
**File**: `apps/client/` (entire package)  
**Issue**: Zero tests exist for the entire desktop application — 60+ files including all IPC handlers, React components, hooks, providers, and API modules.
**Fix**: Add vitest with jsdom for renderer, node env for main process. Prioritize IPC handlers, auth hooks, and API modules.

### C11. Global DB singleton prevents parallel testing

**Category**: Testing  
**File**: `apps/server/src/db/index.ts:6-7,40-43`  
**Issue**: Tests use `setDb()` to inject :memory: DB into a global singleton. Any test forgetting `resetDb()` leaks state. Parallel execution impossible. `getDb()` lazily creates real file DB if `setDb()` wasn't called — a bug waiting to happen.
**Fix**: Use dependency injection instead of global singleton. Throw in `getDb()` if accessed during tests without `setDb()`.

---

## High

### H1. Header-based plaintext credentials in `requireAuth`

**Category**: Security  
**File**: `apps/server/src/middleware/auth.ts:56-67`  
**Issue**: `requireAuth` accepts `login` and `password` in custom headers on EVERY request as fallback. Plaintext credentials transmitted on every API call.
**Fix**: Remove `X-Auth-Login`/`X-Auth-Password` fallback. Use standard Bearer token flow exclusively.

### H2. `process.exit(0)` in dev restart — no graceful shutdown

**Category**: Reliability  
**File**: `apps/server/src/routes/dev.ts:62-71`  
**Issue**: `/api/dev/restart` calls `process.exit(0)` after 100ms without closing HTTP server, WebSocket connections, or stopping bot process.
**Fix**: Reuse `shutdown()` function from `index.ts` — close server, wait for connections, then exit.

### H3. `BetterSQLite3Database<any>` — type safety discarded

**Category**: Maintainability  
**Files**: `apps/server/src/auth/sessions.ts:32`, `lockout.ts:16`, `cleanup.ts:22`  
**Issue**: All session/lockout/cleanup functions accept `BetterSQLite3Database<any>`, discarding schema type parameter. No compile-time type safety.
**Fix**: Change to `BetterSQLite3Database<typeof schema>`.

### H4. Inconsistent and leaky error messages

**Category**: Security/Maintainability  
**File**: `apps/server/src/middleware/error-handler.ts:18-37`, throughout routes  
**Issue**: Error handler exposes `message` in response body for non-500 errors. Messages are inconsistent: `'Invalid credentials'`, `'unauthorized'`, `'Invalid input'`. Internal identifiers like `'Code already used'` leak application logic.
**Fix**: Standardize on `code` field (e.g., `'unauthorized'`, `'not_found'`). Reserve `message` for safe, generic descriptions.

### H5. Module-level side effects in config.ts

**Category**: Testability  
**File**: `apps/server/src/config.ts:6-19,80-84`  
**Issue**: Loading `.env` files and env validation run at module import time. Importing any file that transitively imports `config.ts` triggers file system access. Tests cannot easily override config.
**Fix**: Export `loadConfig()` function and call explicitly in `index.ts`. Use lazy getter for config singleton.

### H6. No IPC channel name constants

**Category**: Maintainability  
**Files**: All IPC handlers + preload  
**Issue**: 26+ channel name strings scattered across 8+ files. A typo (e.g., `'notes:get-all'` vs `'notes:getall'`) causes silent failure — renderer gets `undefined` with no error.
**Fix**: Define all channel names as a shared const enum consumed by preload and all IPC handlers.

### H7. URL scheme not validated in QR login links

**Category**: Security  
**File**: `apps/client/src/renderer/features/auth/components/QrLoginPanel.tsx:51-73`  
**Issue**: `deepLink` and `tgDeepLink` from server response rendered directly into `<a href={...}>`. Server compromise could inject `javascript:` URLs.
**Fix**: Validate URL schemes — only allow `https://`, `tg://`, `http://`.

### H8. Duplicate server DB helpers across pollers

**Category**: Duplication  
**Files**: `apps/bot/src/polling/reminders.ts:84-103`, `apps/bot/src/polling/notifications.ts:103-122`  
**Issue**: `openReadOnly`, `openWritable`, `resolveDbPath` are identical copy-paste (~40 lines) in both pollers.
**Fix**: Extract to shared helper file (`apps/bot/src/polling/db.ts`). Best fix: move polling to server API (see C1).

### H9. Deploy script doesn't build shared package

**Category**: Build  
**File**: `scripts/deploy.sh:21-26`  
**Issue**: Deploy builds server and bot but NOT `@helper/shared`. The shared package's `dist/` directory is empty on fresh deploy, causing import errors at runtime.
**Fix**: Add `pnpm --filter @helper/shared build` before building server and bot.

### H10. Bot runs via tsx in production — build output unused

**Category**: Build  
**File**: `apps/server/src/services/bot-manager.ts:48-49`  
**Issue**: Bot spawned with `npx tsx src/index.ts` even though `pnpm --filter @helper/bot build` compiles to `dist/`. Build step in deploy script is wasted.
**Fix**: In production mode, use `node dist/index.js`. Add env var to control behavior.

### H11. Deploy runs migration before build

**Category**: Build  
**File**: `.github/workflows/deploy.yml:82`  
**Issue**: Migrations run before new code is built. If migration drops a column old code still references, causes brief outage.
**Fix**: Build first, then migrate.

### H12. Node version mismatch between CI and deploy

**Category**: CI  
**Files**: `.github/workflows/ci.yml:18`, `.github/workflows/deploy.yml:18`  
**Issue**: CI uses Node 20, deploy uses Node 24. Server code may behave differently across versions.
**Fix**: Align Node versions across CI and deploy workflows.

### H13. No typecheck/test before deploy

**Category**: CI  
**File**: `.github/workflows/deploy.yml:67-91`  
**Issue**: Deploy script has no test or typecheck step. If CI was bypassed, broken code reaches production.
**Fix**: Add typecheck and test steps to deploy workflow.

### H14. Full table scan + JS filter for token lookup

**Category**: Performance  
**File**: `apps/server/src/routes/internal.ts:33-40`  
**Issue**: Fetches ALL `link_code` actions from DB, then filters/sorts in JS. Performance degrades linearly with total link codes.
**Fix**: Add `eq(schema.telegramActions.token, code)` to WHERE clause.

### H15. Bot commands untested

**Category**: Testing  
**Files**: `apps/bot/src/commands/start.ts`, `me.ts`, `link.ts`  
**Issue**: Core user-facing bot flows — linking, QR login, status, help — have zero test coverage.
**Fix**: Unit tests for pure helper functions. Integration tests for command handlers with mocked ServerClient.

### H16. Rate limiters untested

**Category**: Testing  
**File**: `apps/server/src/middleware/rate-limit.ts`  
**Issue**: All three rate limiters (global, auth per-min, auth) are security-critical and completely untested.
**Fix**: Integration tests verifying 429 responses and `skipInTest()` behavior.

### H17. BotManager — complex process manager completely untested

**Category**: Testing  
**File**: `apps/server/src/services/bot-manager.ts`  
**Issue**: State machine with 5 states, process spawning, restart backoff, health tracking — zero tests.
**Fix**: Refactor to inject child process factory. Add unit tests for state transitions and backoff logic.

### H18. Dead IPC handler `server:on-health`

**Category**: Architecture  
**File**: `apps/client/src/main/ipc/server.ts:85-99`  
**Issue**: Registered via `ipcMain.handle` but preload uses listener (`ipcRenderer.on`), not invoke. Dead code.
**Fix**: Remove the handler. WebSocket push model handles health correctly.

### H19. Duplicated main/renderer type definitions

**Category**: Architecture  
**Files**: Main IPC files ↔ renderer feature `types.ts` files  
**Issue**: Identical `NoteCreateInput`, `NoteUpdateInput`, `PresetCreateInput`, `PresetUpdateInput` defined in both main and renderer. Inevitably drift.
**Fix**: Define in `@helper/shared` and import in both places.

### H20. `window.api` bypasses feature api.ts modules

**Category**: Architecture  
**Files**: Titlebar.tsx, AppRow.tsx, useServerHealth.ts, useQrLogin.ts, etc.  
**Issue**: Components call `window.api.*` directly instead of through their feature's `api.ts` wrapper. Creates tight coupling to Electron IPC.
**Fix**: All `window.api` calls must go through feature `api.ts` modules.

### H21. `confirm()` blocks main thread, inconsistent with design

**Category**: UX/Debt  
**Files**: NotesPage.tsx, PresetsPage.tsx, TelegramSection.tsx  
**Issue**: Synchronous `confirm()` dialogs cannot be styled and block renderer process.
**Fix**: Custom confirmation dialog component with open/close state management.

### H22. Unused dependencies bundled (framer-motion)

**Category**: Performance  
**File**: `apps/client/vite.renderer.config.ts:89-91`  
**Issue**: `framer-motion`, `motion-utils`, `motion-dom` listed in `optimizeDeps.include` but never imported anywhere.
**Fix**: Remove from config and package.json.

---

## Medium

### M1. Duplicated utility functions across route files

**Files**: `notes.ts:33-37`, `presets.ts:32-36`, `auth.ts:21-23`, `telegram.ts:17-19`, `dev.ts:12-14`, `internal.ts:14-20`  
**Issue**: `parseId`, `clientIp`, `nowSeconds`, `isExpired` copy-pasted across route files.
**Fix**: Extract to `src/utils/request.ts`, `src/utils/parse.ts`.

### M2. `authRateLimit` defined but never used

**File**: `apps/server/src/middleware/rate-limit.ts:33-41`  
**Issue**: Exported but never applied to any route. Dead code.
**Fix**: Either remove or apply to `/refresh` (which has no rate limiting — see C1).

### M3. `toPublicUser` vs `stripUser` — two functions, same purpose

**File**: `apps/server/src/routes/auth.ts:25-39`  
**Issue**: Both strip password from User. One uses destructuring hack (`void _pw`), other constructs new object. Produce subtly different shapes.
**Fix**: Consolidate into single `toPublicUser`. Remove `void _pw;` anti-pattern.

### M4. Bot restart cooldown — time-of-check-time-of-use window

**File**: `apps/server/src/services/bot-manager.ts:107-109`  
**Issue**: After giving up, cooldown calculation can be ≤ 0 without resetting `gaveUp`, permanently stopping bot recovery.
**Fix**: Add `else` branch: if `cooldown <= 0`, reset `gaveUp` and restart immediately.

### M5. No rate limiting on internal bot routes

**File**: `apps/server/src/routes/internal.ts:22-24`  
**Issue**: Internal routes rely solely on `requireBotSecret`. No rate limiting or IP whitelisting if secret is leaked.
**Fix**: Add rate limiting. Require localhost origin in production.

### M6. No rate limiting on QR login token generation

**File**: `apps/server/src/routes/telegram.ts:125-147`  
**Issue**: Anyone can request QR login tokens. No rate limiting. Enables table fill or phishing token generation.
**Fix**: Apply rate limiting. Consider CAPTCHA for anonymous requests.

### M7. `toSqliteNow` string format comparison is fragile

**File**: `apps/server/src/services/lockout.ts:24-29`  
**Issue**: Converts ISO 8601 to SQLite format by replacing T with space. Comparison relies on lexicographic ordering of formatted timestamps.
**Fix**: Store timestamps as Unix epoch integers consistently.

### M8. Logger `maskSensitive` recurses into circular references

**File**: `apps/server/src/utils/logger.ts:68-81`  
**Issue**: Recursively walks objects without handling circular references. Cyclic metadata causes `RangeError: Maximum call stack size exceeded`.
**Fix**: Add `WeakSet` to track visited objects.

### M9. Bot exits with code 0 on missing token

**File**: `apps/bot/src/index.ts:27`  
**Issue**: `process.exit(0)` when bot can't start. Exit 0 indicates success. PM2/Docker see nothing wrong.
**Fix`: Use `process.exit(1)`.

### M10. Bot shared secret falls back to empty string

**File**: `apps/bot/src/api/server-client.ts:78`  
**Issue**: If `BOT_SHARED_SECRET` is not set, fallback is `''`. Server's `requireBotSecret` skips validation when secret is empty in dev mode.
**Fix**: Generate random shared secret automatically.

### M11. No HTTPS between bot and server

**File**: `apps/bot/src/config.ts:5`  
**Issue**: Default `http://localhost:3001` uses plain HTTP. Shared secret sent in plaintext.
**Fix**: Default to HTTPS when not on localhost.

### M12. `HELP_TEXT` duplicated between files

**Files**: `apps/bot/src/index.ts:67-78`, `apps/bot/src/commands/me.ts:9-18`  
**Issue**: Same help string defined twice.
**Fix`: Define once in shared constants file.

### M13. `errorMessage` and `isStatus` defined in wrong module

**File**: `apps/bot/src/commands/me.ts:6`  
**Issue**: Utilities imported from `start.ts` create dependency from `me` to `start` for infrastructure concerns.
**Fix**: Move to shared utility module (`helpers.ts`).

### M14. `as any` cast on bot API transformer

**File**: `apps/bot/src/index.ts:56-64`  
**Issue**: Complete type bypass for grammy bot API transformer. Future upgrades silently break.
**Fix**: Properly type using grammy's `Transformer` type.

### M15. Config file parse failure silently swallowed

**File**: `apps/bot/src/config.ts:42-45`  
**Issue**: Invalid `bot-config.json` silently ignored. Bot starts with unexpected settings.
**Fix**: Log warning on config parse failure.

### M16. Unused env vars in dev template

**File**: `start-dev.bat:18-19`  
**Issue**: `JWT_ACCESS_EXPIRY` and `JWT_REFRESH_EXPIRY` written to `.env` but never read by config.
**Fix**: Remove from template or implement reading in config.

### M17. Fragile publicHoistPattern

**File**: `package.json:8-31`  
**Issue**: ~20 patterns hoisted to root node_modules. Missing pattern causes cryptic runtime errors.
**Fix**: Investigate and fix underlying dependency resolution issues.

### M18. Zod ^4.0.0 caret range

**Files**: `packages/shared/package.json:29`, `apps/bot/package.json:21`  
**Issue**: Major-version caret allows breaking changes on minor updates.
**Fix**: Pin exact version or use `~4.0.0`.

### M19. Experimental `import.meta.dirname`

**File**: `apps/bot/src/config.ts:33`  
**Issue**: Uses experimental Node.js feature with `process.cwd()` fallback that behaves differently.
**Fix**: Use `import.meta.url` with `fileURLToPath` + `dirname`.

### M20. No linting configured

**Issue**: All packages have `"lint": "echo \"not configured yet\""`. No automated code style enforcement.
**Fix**: Configure ESLint or Biome.

### M21. Bot tests create real SQLite files on disk

**File**: `apps/bot/src/polling/__tests__/polling.test.ts:29-61`  
**Issue**: Tests create real DB files on disk. Slower, cannot run in parallel.
**Fix`: Use `:memory:` database.

### M22. No vitest config files

**Issue**: Tests run with vitest defaults. No shared setup, global mocks, or path aliases.
**Fix**: Add minimal vitest config files.

### M23. Shared package not pre-built for dev

**File**: `package.json:34`  
**Issue**: Root `dev` script starts server/bot/client concurrently without building shared package first.
**Fix**: Add `"predev": "pnpm --filter @helper/shared build"`.

### M24. Duplicate test infrastructure across 6 files

**Files**: All server integration test files  
**Issue**: `beforeEach`/`afterEach`/`createTestApp`/`registerAndLogin` duplicated across 6 files (~90 lines).
**Fix**: Extract shared test helper file.

### M25. `middleware.test.ts` has a no-op test

**File**: `apps/server/src/middleware/__tests__/middleware.test.ts:86-92`  
**Issue**: Creates app but never sends request. No assertion.
**Fix**: Actually test `requireDev` returns HttpError(401) when `req.user` is undefined.

### M26. No CI coverage reporting

**Issue**: No `--coverage` flag on vitest. No coverage upload action.
**Fix**: Add coverage generation and upload to CI.

### M27. Unused UI components bundled

**Files**: `apps/client/src/renderer/components/ui/scroll-area.tsx`, `select.tsx`, `separator.tsx`  
**Issue**: Three shadcn/ui components never imported. Dead code increasing bundle size.
**Fix**: Remove unused component files.

### M28. Polling + WebSocket concurrently updating same health state

**File**: `apps/client/src/renderer/features/layout/hooks/useServerHealth.ts`  
**Issue**: 30s poll query AND WebSocket listener both update same state. Double traffic, race conditions.
**Fix**: Use WebSocket as source of truth. Poll as fallback only.

### M29. `setQueryData` bypasses cache invalidation

**Files**: All note/preset CRUD hooks  
**Issue**: Optimistic `setQueryData` used instead of `invalidateQueries`. Dependent queries not refreshed.
**Fix**: `invalidateQueries` as primary strategy. `setQueryData` only for true optimistic updates with rollback.

### M30. 5-minute staleTime makes data stale across sessions

**File**: `apps/client/src/renderer/lib/query-client.ts:6`  
**Issue**: Global `staleTime: 5 * 60 * 1000`. Data 5 minutes stale after account switch or server-side change.
**Fix**: Lower to 30s or use WebSocket push for real-time updates.

---

## Low

### L1. Hardcoded values throughout codebase

**Files**: Multiple  
- `version: '0.1.0'` in `config.ts:75` — not from package.json  
- `TOKEN_TTL_SECONDS` in `jwt.ts:5` — hardcoded 15 min  
- Rate limit thresholds in `rate-limit.ts:15,25,35` — magic numbers  
- scrypt params in `password.ts:17-22` — N=16384, r=8, p=1  
- Lockout params in `lockout.ts:5-7` — 15, 5, 30 minutes  
- Shutdown timeout in `index.ts:123` — 10000  
- Bot kill timeout in `bot-manager.ts:9` — 5000  

**Fix**: Extract to well-named constants or environment variables.

### L2. `Logger.child()` is a no-op

**File**: `apps/server/src/utils/logger.ts:158-160`  
**Issue**: Returns `this` ignoring scope parameter. Child loggers don't work.
**Fix**: Implement proper child logger with scope prefixing.

### L3. `resetDb` silently swallows all errors

**File**: `apps/server/src/db/index.ts:46-51`  
**Issue**: `catch { // ignore }` hides permission errors or file locks.
**Fix**: Log error message at debug level.

### L4. Telegram token length not validated

**File**: `apps/server/src/routes/telegram.ts:151`  
**Issue**: `req.query.token` used without length validation. Oversized tokens impact DB index performance.
**Fix`: Validate token length matches expected encoded length.

### L5. `config.warnings` populated but never consumed

**File**: `apps/server/src/config.ts:51,76`  
**Issue**: Warnings array collects non-fatal issues (dev-only JWT). Never logged or displayed.
**Fix**: Log warnings after config loads.

### L6. `express.json` limit hardcoded

**File**: `apps/server/src/index.ts:57`  
**Issue**: Body parser size limit `'1mb'` is a hardcoded string.
**Fix**: Make configurable via environment variable.

### L7. No graceful degradation if DB directory missing

**File**: `apps/server/src/db/index.ts:13`  
**Issue**: `new Database(dbPath)` throws if parent directory doesn't exist. SQLite doesn't create directories.
**Fix**: Ensure parent directory exists before creating database.

### L8. `console.error` bypasses logger in config

**File**: `apps/server/src/config.ts:82`  
**Issue**: Uses `console.error` instead of structured logger.
**Fix**: Acceptable (logger not initialized yet), but note as inconsistency.

### L9. Health endpoint always returns `db: 'ok'`

**File**: `apps/server/src/index.ts:66`  
**Issue**: Health endpoint never actually checks database connectivity. Always reports OK.
**Fix**: Run `SELECT 1` and return real status.

### L10. `JSON.stringify` per render for dirty check

**File**: `apps/client/src/renderer/features/settings/hooks/useTheme.ts:35`  
**Issue**: `isDirty: JSON.stringify(tokens) !== JSON.stringify(saved)` computes serialization twice per render.
**Fix**: Compare by key-value iteration with early exit.

### L11. Array index as React key

**File**: `apps/client/src/renderer/features/presets/components/PresetEditDialog.tsx:110`  
**Issue**: `key={idx}` for AppRow. Reordering causes React state bugs.
**Fix**: Use stable unique ID.

### L12. `import.meta.env.DEV` scattered across 3 files

**Files**: App.tsx, Titlebar.tsx, AiInspectorDevPanel.tsx  
**Issue**: Tight coupling to Vite's build system in multiple files.
**Fix**: Create single `isDev` constant in `lib/env.ts`.

### L13. `setQueryData<unknown>` type escape hatch

**Files**: `useDeleteNote.ts:9`, `useDeletePreset.ts:9`  
**Issue**: `qc.setQueryData<unknown>(...)` bypasses type checking.
**Fix**: Use `qc.setQueryData<Note[]>(...)` with proper generic.

### L14. `mounted`/`cancelled` flag naming inconsistent

**Files**: 4 files  
**Issue**: Inconsistent naming for effect cleanup pattern.
**Fix**: Standardize to one name (`mounted`).

### L15. Duplicate settings fetch (provider + hook)

**Files**: `SettingsProvider.tsx`, `useSettings.ts`  
**Issue**: Two sources independently fetch same query key. Confusing code.
**Fix**: Have provider use the hook, or remove one.

### L16. Duplicate `getMe()` call

**File**: `PasswordChangeDialog.tsx:40-44`  
**Issue**: `window.api.auth.getMe()` called twice sequentially.
**Fix**: Store result in variable.

### L17. `onSaved={() => {}}` empty callbacks

**Files**: NotesPage.tsx, PresetsPage.tsx  
**Issue**: Empty arrow functions create new references per render. Never used.
**Fix**: Make `onSaved` optional.

### L18. `memoizedState` guidance outdated — React 19

**Note**: AI Inspector fiber walker notes `_debugSource` removed in React 19. Documented in AGENTS.md already.
**Fix**: Already documented. No action needed.

### L19. `console.error` in health handler reduces to no-op

**Duplicate of L8 for server health — accept consistent pattern.**
**Fix**: Noted for audit completeness.

### L20. Dialog missing parent window reference

**File**: `apps/client/src/main/ipc/dialog.ts:9-19`  
**Issue**: `dialog.showOpenDialog()` called without `parent` window. Dialog may not be modal.
**Fix**: Use `BrowserWindow.fromWebContents(event.sender)` for parent.

### L21. `void` expressions on unused imports

**Files**: server.ts, presets.ts, index.ts  
**Issue**: `void app`, `void shell`, `void electronApp`, `void handleDeepLink` — tokens of incomplete refactoring.
**Fix**: Remove unused imports or use them properly.

### L22. `TokenData` type not reused in preload

**File**: `apps/client/src/main/preload.ts`  
**Issue**: Inline return types for auth methods instead of importing `TokenData` from `@helper/shared`.
**Fix**: Import shared types.

### L23. Test timeouts may be insufficient on slow CI

**Issue**: Vitest default 5s timeout for integration tests with DB migration. Some tests set 10s explicitly.
**Fix**: Increase global timeout in vitest config or per-slow-test.

### L24. No `workflow_dispatch` on CI

**Category**: CI  
**Issue**: Cannot manually trigger CI for arbitrary branches.
**Fix**: Add `workflow_dispatch` to CI workflow.

### L25. Single OS CI matrix

**Category**: CI  
**Issue**: CI runs only on ubuntu-latest. Electron app targets Windows.
**Fix**: Add Windows runner for client tests.

### L26. Migration path hardcoded in tests

**Category**: Testing  
**Files**: All server integration tests  
**Issue**: `./src/db/migrations` is relative to CWD. Fragile.
**Fix**: Use `import.meta.url` to derive path relative to source file.

### L27. Health test assertion too vague

**File**: `apps/server/src/__tests__/health.test.ts:31`  
**Issue**: `expect(res.status).toBeGreaterThanOrEqual(400)` should assert exact 413 for oversized payloads.
**Fix**: Assert exact status code.
