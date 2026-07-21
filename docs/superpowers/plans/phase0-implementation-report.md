# Phase 0 — StatRegistry Implementation Report

> **Date:** 2026-07-21
> **Author:** AI coding agent
> **Package:** `@helper/poe-engine` (new)

---

## Files Created (15)

| # | File | Lines |
|---|------|-------|
| 1 | `packages/poe-engine/package.json` | 31 |
| 2 | `packages/poe-engine/tsconfig.json` | 12 |
| 3 | `packages/poe-engine/src/index.ts` | 9 |
| 4 | `packages/poe-engine/src/registry/index.ts` | 8 |
| 5 | `packages/poe-engine/src/registry/stat-key.ts` | 13 |
| 6 | `packages/poe-engine/src/registry/stat-category.ts` | 12 |
| 7 | `packages/poe-engine/src/registry/aggregation.ts` | 23 |
| 8 | `packages/poe-engine/src/registry/game-stat-mapping.ts` | 15 |
| 9 | `packages/poe-engine/src/registry/stat-registry.ts` | 6 |
| 10 | `packages/poe-engine/src/registry/stat-accessor.ts` | 60 |
| 11 | `packages/poe-engine/src/scripts/generate-registry.ts` | 77 |
| 12 | `packages/poe-engine/seeds/domain-stats.ts` | 612 |
| 13 | `packages/poe-engine/src/__tests__/stat-key.test.ts` | 64 |
| 14 | `packages/poe-engine/src/__tests__/stat-registry.test.ts` | 91 |
| 15 | `packages/poe-engine/src/__tests__/stat-mapping.test.ts` | 61 |

## Files Modified (2)

| # | File | Change |
|---|------|--------|
| 1 | `apps/client/package.json` | Added `"@helper/poe-engine": "workspace:*"` dependency |
| 2 | `apps/client/tsconfig.json` | Added `{ "path": "../../packages/poe-engine" }` to references |

---

## Gate Results

| Gate | Command | Result |
|------|---------|--------|
| Install | `pnpm install` | Done in 8.2s |
| Build | `pnpm --filter @helper/poe-engine build` | Pass |
| Typecheck | `pnpm --filter @helper/poe-engine typecheck` | Pass |
| Tests | `pnpm --filter @helper/poe-engine test` | **30 passed** (3 files) |
| Generation | `pnpm --filter @helper/poe-engine generate:registry` | 106 stats, 10 categories, ✓ |
| Client typecheck | `pnpm --filter @helper/client typecheck` | Pass (unaffected) |

---

## Registry Statistics

- **106 stat keys** defined
- **10 categories**: defense (16), resistance (9), attribute (4), offense (28), conversion (7), resource (8), skill (8), ailment (8), mechanic (15), enemy (6)
- **5 aggregation kinds**: sum=85, flag=15, maximum=4, product=2, override=0
- **Registry is immutable**: `Object.freeze()` applied
- **Accessor**: Proxy-based `S['defense.life']` with Levenshtein error suggestions

---

## Known Issues

1. **`gameMappings: []` all empty.** Game stat mapping requires GGG game data extraction — deferred to future phase. All 106 stats have empty `gameMappings` arrays. This does not affect type system or registry structure.

2. **`noUncheckedIndexedAccess` is strict.** `STAT_REGISTRY[key]` returns `StatKey | undefined`. The `S` accessor handles this by throwing on missing keys. Direct registry access must use `!` assertion or guard.

3. **Seeds live in `seeds/` not `src/`.** This required `rootDir: "."` in tsconfig. The `seeds/` directory is designed to be replaced by generated output when the GGG data pipeline is built.

4. **No vitest config.** The package relies on vitest's defaults (no `vitest.config.ts`). This works because vitest discovers `**/*.test.ts` patterns automatically.

---

## What is Ready for Phase 1 (Condition Engine)

- `StatKey` type with metadata — Phase 1 ConditionExpr leaf types can reference `StatKey` for `StatThreshold` conditions
- `StatRegistry` with accessor — Phase 1 evaluator can query `S['defense.life']` for stat metadata
- `AggregationKind` discriminated union — Phase 4 ModDB uses this to determine query aggregation
- `StatCategory` grouping — Phase 5 CalcSetup uses this to organize output sections
- `GameStatMapping` infrastructure — ready for GGG data pipeline when game data becomes available

## Notes for AI Agents Continuing Work

- Import from `@helper/poe-engine`: `import { S, STAT_REGISTRY, type StatKey } from '@helper/poe-engine'`
- Never use bare string stat names; always go through `S['category.name']`
- The registry is flat (`STAT_REGISTRY` is `Record<string, StatKey>`, not nested)
- To add new stats: add to `seeds/domain-stats.ts`, run `pnpm --filter @helper/poe-engine generate:registry`
- Old `core/` code is untouched — migration to new package happens in later phases
