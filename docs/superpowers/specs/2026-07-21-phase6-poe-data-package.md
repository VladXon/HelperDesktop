# Phase 6 Design: `@helper/poe-data` Package

**Date**: 2026-07-21
**Status**: Approved
**Phase**: 6 — External Data Integration

## Objective

Create a new workspace package `@helper/poe-data` that bridges external PoE data sources (PoB imports, GGG API, poe.ninja, trade API) and the pure `@helper/poe-engine` calculation core.

## Architecture

```
Electron/Web
    |
    ↓
@helper/poe-data      (NEW — HTTP, parsers, normalizers, data layer)
    |
    ↓
@helper/poe-engine    (PURE — StatRegistry, ModDB, Calculator, Explanation)
    |
    ↓
AI Explanation
```

### Dependency chain

```
poe-data → poe-engine → shared
```

`@helper/poe-engine` remains zero-dependency (no HTTP, no filesystem, no platform code).
`@helper/poe-data` may use `pako` (zlib replacement) and injectable HTTP clients.

## Migration Source

Migrate code from `apps/client/src/main/poe/` (~85 files, all platform-agnostic except one `node:zlib` usage).

The old code and `@helper/poe-engine` are independent parallel implementations. Migration creates a bridge between them over time.

## Three Waves

### Wave 1 — Package Skeleton + PoB Import

**Goal**: Working PoB import in the new package with engine-ready output.

Files:

```
packages/poe-data/
  package.json
  tsconfig.json
  src/
    index.ts
    http/
      http-client.ts          # HttpClient interface (DI)
    pob/
      pob-xml.dto.ts          # Raw PoB XML DTO types
      pob-xml.parser.ts       # XML parser (zlib → pako)
      pob.adapter.ts          # importFromPobUrl, importFromPobXml
      pob-converter.ts        # PoB DTO → Modifier[] (bridge to engine)
      index.ts
    __tests__/
      pob-parser.test.ts
```

Key interface:

```ts
interface HttpClient {
  get<T>(url: string, opts?: { signal?: AbortSignal; headers?: Record<string, string> }): Promise<T>
  post<T>(url: string, body?: unknown, opts?: { headers?: Record<string, string> }): Promise<T>
}

interface PobImportResult {
  character: CharacterData
  items: ImportedItem[]
  modifiers?: Modifier[]  // optional — bridge to engine when ready
}
```

### Wave 2 — Data Layer

**Goal**: Move sources, loaders, normalizers, sync engine.

Files:

```
src/data/
  index.ts
  contracts/
    data-source.ts           # DataSource<T> interface
  sources/
    ninja.source.ts          # poe.ninja API
    trade.source.ts          # GGG trade API
    poe-wiki.source.ts       # poewiki.net MediaWiki API
    forum.source.ts          # GGG forum scraper
  loaders/
    item.loader.ts
    skill.loader.ts
    passive.loader.ts
    league.loader.ts
  normalizers/
    item.normalizer.ts       # → PoeItemRecord
    skill.normalizer.ts      # → PoeSkillRecord
    mod.normalizer.ts        # → PoeModifierRecord
    league.normalizer.ts     # → PoeLeagueRecord
    economy.normalizer.ts    # → EconomySnapshot
  sync/
    sync.engine.ts
    sync.scheduler.ts
    sync-status.ts
  __tests__/
```

Normalizers should produce domain DTOs that can later be converted to `Modifier[]` for engine consumption.

### Wave 3a — Core Domain Migration (as-is)

**Goal**: Move items, skills, tree, calculators, rules, engine, explanation. Old calculation layer stays as legacy compatibility — no new calculations added there.

Files: Same structure as `apps/client/src/main/poe/core/` migrated to `packages/poe-data/src/core/`.

```
src/core/
  index.ts
  models/index.ts           # re-exports from @helper/shared
  dto/pob-xml.dto.ts
  parsers/pob-xml.parser.ts
  adapters/pob.adapter.ts
  pob/                      # sub-parsers (item, gem, tree, config, version)
  factory/build-factory.ts
  resolvers/stat-resolver.ts
  calculators/              # legacy — no new code
  rules/damage.rules.ts
  engine/analyzer.engine.ts
  explanation/problem.explainer.ts
  items/                    # modifier model, patterns, factory
  skills/                   # skill model, gem library, resolvers
  tree/                     # passive tree model, keystones, masteries
  calculation/              # legacy — no new code
  stats/                    # stat collector/aggregator
  __tests__/
```

## Key Architectural Constraints

1. **Engine is single source of truth**: `@helper/poe-engine` is the only calculation system. Old calculators remain only for legacy compatibility.
2. **No duplicate models**: Use `@helper/shared` types. Don't redefine what already exists there.
3. **Adaptation points**: Every data pipeline produces output that can eventually go through `Modifier[] → ModDB → Calculator`.
4. **DI for HTTP**: HttpClient is injected — engine and data layer never import fetch/axios directly.
5. **Tests preserved**: All existing tests migrate alongside their source code.

## Post-Wave-3 Migration Path (Phase 7+)

```
Legacy Domain (old calculators/analyzers)
    |
    ↓
Adapter Layer           (NEW)
    |
    ↓
Modifier[] / BuildLayer
    |
    ↓
@helper/poe-engine
    |
    ↓
AI Explanation
```

## Risk: `node:zlib` dependency

`pob-xml.parser.ts` uses `node:zlib.inflateRawSync`. Replace with `pako` npm package (zero dependencies, pure JS, works in browser/Node/Deno/Bun).

## Risk: Test fixture loading

PoB tests load `.pob.xml` fixture files using `node:fs`. This works in vitest (Node). If Deno/Bun compatibility is needed later, fixtures can be inlined or loaded via virtual imports.

## Verification

After each wave:
```
pnpm typecheck
pnpm build
pnpm test
```
