# Task Guidelines for AI Agents

> Common development patterns and workflows for implementing features in HelperDesktop.

## Before Starting Any Task

1. **Read `docs/ai/AI_CONTEXT.md`** — understand the architecture
2. **Check `docs/ai/CODEBASE_MAP.md`** — know where files live
3. **Verify the task** — does it need new code, or does something exist already?

## Workflow: Adding a New PoE Feature

```
1. Identify data source
   ├─ GGG API (character, stash, trade) → auth layer (IGggAuthenticator)
   ├─ PoB import → packages/poe-data/src/parsers/
   └─ Calculation → packages/poe-engine/src/core/

2. Define types
   └─ Shared DTOs → packages/shared/src/poe/

3. If server-side:
   ├─ Add DB table → apps/server/src/db/schema.ts
   ├─ Add migration → apps/server/src/db/migrations/
   ├─ Add repo → packages/poe-backend/src/repos/
   ├─ Add service → packages/poe-backend/src/services/
   └─ Add route → apps/server/src/routes/poe-*.ts

4. If client-side:
   ├─ Add IPC handler → apps/client/src/main/ipc/poe.ts
   ├─ Add preload bridge → apps/client/src/main/preload.ts
   ├─ Add renderer type → apps/client/src/renderer/types/window.d.ts
   └─ Add UI component → apps/client/src/renderer/features/poe/

5. Verify
   └─ pnpm typecheck && pnpm test
```

## Workflow: Adding an API Endpoint

```
1. Define route → apps/server/src/routes/
2. If new entity:
   ├─ Add to schema.ts
   ├─ Create migration
   └─ Run migration
3. Add validation (Zod) → packages/shared/src/schemas/
4. Wire middleware → JWT auth already on most routes
5. Update docs/api.md
6. Verify: pnpm typecheck && pnpm test
```

## Workflow: Changing the Database Schema

```
1. Edit apps/server/src/db/schema.ts
2. Generate migration: drizzle-kit generate
3. Review migration SQL
4. Apply: drizzle-kit migrate
5. Update types in shared/packages
6. Verify: pnpm typecheck && pnpm test
```

## Workflow: Adding Electron IPC

```
1. Main process:
   └─ apps/client/src/main/ipc/poe.ts — ipcMain.handle('poe:channel-name', handler)
2. Preload:
   └─ apps/client/src/main/preload.ts — expose via contextBridge
3. Renderer Type:
   └─ apps/client/src/renderer/types/window.d.ts — declare interface
4. Renderer usage:
   └─ window.api.poe.channelName(args)
5. Verify: build + E2E (if available)
```

## Workflow: Adding a New GGG Transport

```
1. Implement GggTransport interface
   └─ apps/client/src/main/services/poe/auth/benchmark/transports/
2. Register in auth-benchmark.ts entry point
3. Run benchmark: pnpm run auth:benchmark -- --poesessid=...
4. If transport proves reliable, add to FallbackChain in factory.ts
5. Never add raw GGG fetch outside the auth layer
```

## Forbidden Actions

| Action | Why Forbidden |
|--------|---------------|
| Adding new GGG fetch outside `auth/` | Duplicates transport logic. Use `IGggAuthenticator`. |
| Calling GGG API directly from IPC | Bypasses auth layer. Use authenticator. |
| Adding `any` without comment | TypeScript strict mode. |
| Creating duplicate services | Check existing patterns first. |
| Removing error handling / auth checks | Security requirement. |
| Adding dependencies without approval | Package size, security, compatibility. |
| Committing `.env` or secrets | Security policy. |
| Editing generated migration files | Edit schema.ts, re-generate. |

## Testing Requirements

```
[ ] pnpm typecheck passes (all 8 workspace packages)
[ ] pnpm test — all existing tests pass
[ ] New code has test coverage
[ ] IPC changes: test preload + main handler
[ ] Route changes: test HTTP endpoint
[ ] Auth changes: test with auth:verify (needs real POESESSID)
[ ] No regression in unrelated areas
```

## When You Don't Know

1. Check `docs/` for relevant architecture docs
2. Use `grep` to find similar implementations
3. Read existing code in the same area
4. Ask the user before making assumptions
5. Never fabricate API endpoints, function signatures, or dependencies
