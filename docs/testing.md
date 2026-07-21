# Testing

## Local Test Commands

```bash
# All packages
pnpm test

# Individual packages
pnpm --filter @helper/poe-engine test
pnpm --filter @helper/poe-data test
pnpm --filter @helper/poe-backend test
pnpm --filter @helper/server test
pnpm --filter @helper/client test
pnpm --filter @helper/bot test

# Watch mode
pnpm --filter @helper/poe-data test:watch
pnpm --filter @helper/client test:watch

# Typecheck all
pnpm typecheck
pnpm --filter @helper/poe-data typecheck
pnpm --filter @helper/client typecheck
pnpm --filter @helper/server typecheck
```

## Test Environment

| Package | Environment | Config |
|---------|------------|--------|
| poe-engine | Node (vitest) | Pure TS — zero I/O |
| poe-data | Node (vitest) | HTTP, filesystem OK |
| poe-backend | Node (vitest) | Drizzle ORM types |
| server | Node (vitest + supertest) | Express app + PostgreSQL |
| client main | Node (vitest) | Electron services |
| client renderer | jsdom (vitest) | React component tests |
| bot | Node (vitest) | Telegram bot logic |

## Running Specific Tests

```bash
# Single file
pnpm --filter @helper/poe-data vitest run src/__tests__/pob-converter.test.ts

# Single test (by name pattern)
pnpm --filter @helper/client vitest run -t "saves a build"

# Renderer tests use jsdom
pnpm --filter @helper/client vitest run src/renderer/
```

## VPS Verification

### Health Check

```bash
curl http://178.172.137.167:3001/api/health
```

Expected: `{ status: "ok", routes: { poe: { auth: [...], builds: [...], accounts: [...] } } }`

### Automated Check

```bash
npx tsx scripts/check-poe-production.ts http://178.172.137.167:3001
```

### Test Coverage Gaps

| Area | Coverage | Priority |
|------|----------|----------|
| PoB import (URL + XML) | Good | — |
| Modifier extraction | Good | — |
| Calculation engine | Good (2 snapshot failures pre-existing) | Low |
| OAuth flow | Manual only | Medium |
| Character import | None | High |
| AI cache | None | High |
| Build comparison | None | High |
| Deep link protocol | None | Medium |
| Health endpoint | None | Low |
