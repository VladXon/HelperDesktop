# Phase 2 — Data Intelligence Layer

> **Note**: Code migrated to `@helper/poe-data` and `@helper/poe-engine` packages. This document describes the original architecture.

**Status**: MIGRATED to `@helper/poe-data` / `@helper/poe-engine`  
**Original location**: `apps/client/src/main/poe/data/`  
**Tests**: 23 new (43 total with Phase 1)

---

## Architecture

```
packages/poe-engine/src/   ← Phase 1: pure domain (no IO)
packages/poe-data/src/     ← Phase 2: data sources, normalizers, loaders, sync
└── (files below are under poe-data/src/)
    ├── contracts/
    │   └── data-source.ts      DataSource<T> interface
    ├── sources/
    │   ├── poe-wiki.source.ts   poewiki.net API (CargoQuery)
    │   ├── ninja.source.ts      poe.ninja API (currency + items)
    │   ├── trade.source.ts      GGG Trade API (search + exchange)
    │   └── forum.source.ts      GGG Forum HTML parser
    ├── normalizers/
    │   ├── item.normalizer.ts   ExternalDTO → PoeItemRecord
    │   ├── skill.normalizer.ts  ExternalDTO → PoeSkillRecord
    │   └── mod.normalizer.ts    ExternalDTO → PoeModifierRecord
    ├── loaders/
    │   ├── item.loader.ts       fetch → normalize → prepare
    │   ├── skill.loader.ts      fetch → normalize → prepare
    │   ├── passive.loader.ts    (stub)
    │   └── league.loader.ts     (builtin defaults)
    ├── sync/
    │   ├── sync.engine.ts       Pipeline orchestrator
    │   ├── sync.scheduler.ts    setInterval-based scheduler
    │   └── sync-status.ts       SyncResult type
    └── index.ts                 Barrel
```

---

## Data Flow

```
External APIs (Wiki, Ninja, Trade, Forum)
    │
    ▼
Source.fetch()  →  AdapterResult<RawDTO>
    │
    ▼
Normalizer  →  DomainRecord (PoeItemRecord, PoeSkillRecord, etc.)
    │
    ▼
Loader  →  AdapterResult<LoaderResult>
    │
    ▼
Sync Engine  →  SyncResult { inserted, updated, failed, errors }
```

---

## Components

### Sources (4)

| Source | Endpoint | Returns | Auth |
|--------|----------|---------|------|
| `poe-wiki.source.ts` | poewiki.net/w/api.php | `WikiSearchResult[]`, `PoeItemRecord[]`, `PoeSkillRecord[]` | None |
| `ninja.source.ts` | poe.ninja/api/data | `EconomySnapshot[]` (currency + items) | None |
| `trade.source.ts` | pathofexile.com/api/trade | `TradeSearchResult`, `EconomySnapshot` | POESESSID |
| `forum.source.ts` | pathofexile.com/forum | `MetaBuild[]` | None |

### Normalizers (3)

| Normalizer | Input | Output | Key behavior |
|------------|-------|--------|--------------|
| `item.normalizer.ts` | `ExternalItemDTO` | `PoeItemRecord` | Dedup by name, map type from name, filter empties |
| `skill.normalizer.ts` | `ExternalSkillDTO` | `PoeSkillRecord` | Split quality text, dedup by name |
| `mod.normalizer.ts` | `ExternalModDTO` | `PoeModifierRecord` | Dedup by name, defaults for missing fields |

### Loaders (4)

| Loader | Source → Normalize | Returns |
|--------|-------------------|---------|
| `item.loader.ts` | Wiki → item.normalizer | `ItemLoaderResult { items }` |
| `skill.loader.ts` | Wiki → skill.normalizer | `SkillLoaderResult { skills }` |
| `passive.loader.ts` | Stub | `PassiveTreeInfo` |
| `league.loader.ts` | Builtin defaults | `LeagueLoaderResult { leagues }` |

### Sync Engine

```
runSyncPipeline(source, tasks[], options?) → SyncResult

Tasks run sequentially. Each task calls its loader.
Failures are tracked individually — pipeline continues.
SyncResult tracks: success, inserted, updated, failed, errors[], durationMs.
```

### Sync Scheduler

```
startSyncScheduler({ league, onSyncComplete?, onSyncError? }) → stopFn

- Economy: every 30 min (ninjaSource.fetchCurrencyOverview)
- Daily: leagues (builtin)
- Weekly: items + skills (wiki)
```

---

## New Shared Types

`packages/shared/src/poe/knowledge.ts`:

| Type | Fields |
|------|--------|
| `PoeItemRecord` | game, name, baseType, itemType, category, level, requiredLevel, explicitStats, dropSources, flavourText, icon, source, sourceUrl, version, updatedAt |
| `PoeSkillRecord` | game, name, type, gemLevel, manaMultiplier, qualityStats[], tags[], source, sourceUrl, version, updatedAt |
| `PoeLeagueRecord` | game, leagueId, leagueName, isCurrent, isHardcore, isSsf, startDate, endDate, version |
| `PoeModifierRecord` | name, domain, generationType, values[], tags[], tiers[] |

---

## Design Rules Followed

| Rule | Status |
|------|--------|
| Core has no IO | ✅ Data layer is separate from `poe-engine` |
| Sources are thin wrappers | ✅ Only fetch + return `AdapterResult<T>` |
| Normalizers are pure functions | ✅ No IO, no side effects |
| No new DB dependencies | ✅ Loaders prepare data for server API |
| Shared types only | ✅ `knowledge.ts` is interfaces only |
| Phase 1 tests still pass | ✅ 20/20 |
| No axios/npm deps | ✅ Uses native `fetch()` |

---

## Test Results

```
Test Files: 7 passed (7)
Tests:     43 passed (43)
  - Phase 1 core:  20 tests (damage, defense, scaling, PoB import)
  - Phase 2 data:  23 tests (normalizers 12, source validation 5, sync engine 6)
```
