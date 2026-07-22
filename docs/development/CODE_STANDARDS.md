# Code Standards

## TypeScript

### Configuration
- Strict mode enabled: `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`
- All apps extend `config/tsconfig.base.json`
- Server/bot use `outDir: "./dist"` + `rootDir: "./src"`

### Types
- Use `interface` for object shapes and API contracts, not `type`
- Database row types use `typeof schema.table.$inferSelect` / `$inferInsert`
- React component props: inline `interface` directly above the component
- Express augmentation in separate file (e.g. `request-id.ts`)
- Electron window API types in `.d.ts` with `declare global`

### Imports
- Explicit `import type { ... }` for type-only imports
- Barrel exports from feature `index.ts` files
- Shared package paths: `@helper/shared/schemas/note` or `@helper/shared/types/note`
- Server ESM paths: `import { ... } from '../file.js'`
- Renderer path alias: `@/` maps to `src/renderer/`

---

## React

### Component Structure
- Function components only, no classes
- Explicit return type: `React.JSX.Element`
- `import * as React from 'react'` (namespace import, not named)
- `React.forwardRef` for UI components that need ref forwarding
- Prefix all hooks with `React.`: `React.useState`, `React.useEffect`, `React.useMemo`, `React.useCallback`

### Feature Directory Pattern
```
features/<name>/
├── index.ts         # barrel exports
├── api.ts           # window.api calls
├── types.ts         # feature-specific types
├── hooks/           # TanStack Query hooks
└── components/      # components
```

### UI Components (`components/ui/`)
- One file per component (shadcn/ui style)
- Use `cva` (class-variance-authority) for variants
- `cn()` from `lib/utils.ts` for class merging
- Props extend native HTML attributes and `VariantProps`

### State Management
- TanStack React Query for server state
- React Context for auth, router, settings (create with guard hooks)
- No global state libraries (Redux, Zustand)
- Context guard: `if (!ctx) throw new Error('...')`

### Routing
- Custom context-based router (`RouterProvider` + `useRouter()`)
- No react-router

---

## Electron

### Main Process
- IPC handlers in `src/main/ipc/*.ts`, grouped by domain
- Each file exports `register*Ipc()` function
- All registered via `registerAllIpc()` in `main/index.ts`
- Handler signature: `async (_event, ...args) => { ... }`

### Preload
- Single `preload.ts`
- `contextBridge.exposeInMainWorld('api', api)` with one `api` object
- Methods grouped by domain: `api.auth.*`, `api.notes.*`
- Use `invoke<T>(channel, ...args)` wrapper for typed invocations
- Subscribe methods return cleanup (unsubscribe) function

### Window Configuration
- `frame: false`, `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`

---

## Backend (Express)

### Route Structure
- One file per domain in `routes/`: `auth.ts`, `notes.ts`, `presets.ts`
- Each exports factory: `createAuthRouter(): Router`
- Mounted with prefixes: `app.use('/api/notes', createNotesRouter())`
- `Router()` from express

### Handler Pattern
- Wrap async handlers in `try/catch` with `next(e)`
- Standard signature: `(req: Request, res: Response, next: NextFunction)`
- Validate all input with Zod: `schema.safeParse(req.body)` → 400 on failure
- Extract `req.user` from auth middleware, verify it exists

### Middleware
- `requireAuth` — JWT Bearer
- `requireDev` — dev-only endpoints
- `requireBotSecret` — bot-to-server internal calls
- `errorHandler` — `HttpError` class with status, code, expose
- Errors < 500 exposed to client, >= 500 logged as internal

### Services Layer
- Business logic in `services/` files
- Functions accept `db` as parameter (dependency injection)

---

## Database

### Schema (Drizzle ORM)

- PostgreSQL with `node-postgres` in production, SQLite in-memory for tests
- Column names: snake_case in DB (`user_id`, `created_at`)
- Primary keys: `serial('id').primaryKey()` (PostgreSQL) or `integer('id').primaryKey({ autoIncrement: true })` (SQLite)
- Booleans: `integer('pinned', { mode: 'boolean' }).notNull().default(false)` (SQLite) or `boolean('pinned').notNull().default(false)` (PostgreSQL)
- Foreign keys: `.references(() => users.id, { onDelete: 'cascade' })`
- Indexes: `uniqueIndex(...).on(...)`, `index(...).on(...)`
- Timestamps: `timestamp('created_at').defaultNow()` (PostgreSQL) or `default(sql\`(datetime('now'))\`)` (SQLite)
- Partial indexes: `.where(sql\`...\`)`

### Connection
- Server: `getDb()` returns Drizzle instance with PostgreSQL pool
- Tests: in-memory SQLite via `better-sqlite3`
- Foreign keys enabled, connection pooling via `node-postgres`

### Queries
- Chainable API: `db.select().from(schema.notes).where(eq(...))`
- Insert: `.insert(schema.notes).values({...}).returning()`
- Update: `.update(schema.notes).set({...}).where(eq(...))`
- Delete: `.delete(schema.notes).where(eq(...))`

---

## Testing

### Framework
- Vitest
- Test files in `__tests__/` directories, adjacent to tested code
- Naming: `*.test.ts`
- Structure: `describe` / `it` / `expect`

### Server Integration Tests
- `supertest` + in-memory SQLite (`:memory:`)
- `beforeEach`: create fresh DB, migrate, `setDb()`
- `afterEach`: `resetDb()`
- No mocking of the database — real in-memory SQLite

### Shared Package Tests
- Pure unit tests for Zod schemas

---

## Security

### Authentication
- JWT HS256 with 15m access + refresh token rotation
- `jsonwebtoken` library
- `requireAuth` middleware validates Bearer token + session existence

### Passwords
- scrypt: N=16384, r=8, p=1, keylen=64, salt 16 bytes
- Format: `scrypt:N:r:p:salt:hash` (base64url)

### Lockout
- 5 failed attempts per login+IP in 15m → blocked 30m
- `services/lockout.ts`

### Rate Limiting
- `express-rate-limit`: 100 req/min global, 5 req/min auth
- Disabled in test mode

### HTTP Headers
- `helmet` middleware with CSP and HSTS in production

### Input Validation
- Zod validation on all input data

### Logging
- Mask sensitive fields: `SENSITIVE_KEYS` in `logger.ts`
- Internal service auth via `X-Bot-Secret` header

---

## General Rules

- No comments unless essential for clarity
- No new dependencies without approval
- No unsafe shortcuts (skip validation, skip error handling, skip auth checks)
- No duplicated code — extract shared logic into `packages/shared/`
- No bad abstractions — prefer duplication over premature abstraction
- Match existing patterns — consistency over cleverness
- One thing per file, one responsibility per function
