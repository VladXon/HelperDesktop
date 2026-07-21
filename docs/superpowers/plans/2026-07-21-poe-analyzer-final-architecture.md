# PoE Analyzer 2.0 — Final Architecture

**Status**: LOCKED  
**Date**: 2026-07-21  
**Purpose**: Consolidated technical specification before Phase 0 implementation.  
**Source**: Design spec + all review sessions + final corrections.

---

## Project Context

- **Stack**: Electron + React 19 (client), Node.js + Express (server), PostgreSQL VPS, Drizzle ORM, TypeScript
- **Monorepo**: pnpm workspace — `apps/client`, `apps/server`, `apps/bot`, `packages/shared`
- **Existing**: `apps/client/src/renderer/features/poe-assistant/` (old module, 10 files, must survive until Phase 5)
- **Theme**: Obsidian Glass (dark), accent `#8b5cf6`, Inter font
- **IPC pattern**: `window.api.poe.*` via contextBridge + ipcMain.handle

---

## Architecture Principle

```
External Sources (PoB, GGG, Trade, Ninja, Wiki, Forums)
    │
    ▼
Adapters (fetch + normalize → DTO, zero business logic)
    │
    ▼
BuildFactory (DTO → Build domain model, rawMods preserved, no computed stats)
    │
    ▼
Core Engine (Stat Resolution → Defense → Damage → Scaling → Upgrade → Score)
    │
    ▼
AnalysisResult = { facts, insights, scores }
    │
    ├──► PostgreSQL (cache + history + knowledge)
    │
    └──► AI Layer (gets AiBuildReviewInput → human explanation)
           │
           providers: DeepSeek, Claude, OpenAI, LM Studio
```

**Hard rule**: Math before AI. Core calculates. AI explains. Core must work fully offline without any AI provider configured.

---

## Database Architecture (FINAL)

### Decision

**Use the existing PostgreSQL VPS. Do NOT create a separate SQLite database.**

The project already has:
- PostgreSQL on VPS
- Drizzle ORM with `node-postgres`
- Migration pipeline (`drizzle-kit generate` + `pnpm db:migrate`)
- 9 existing tables under the same schema

### PoE tables (13, added to `apps/server/src/db/schema.ts`)

| Table | Category | Purpose |
|-------|----------|---------|
| `poe_currency_snapshots` | History | Currency price time series |
| `poe_market_snapshots` | Cache | Item price snapshots |
| `poe_trade_search_cache` | Cache | Trade API result cache (5min TTL) |
| `poe_builds` | Entity | Build identity (one per build) |
| `poe_build_analyses` | History | Multiple analyses per build (patch, context) |
| `poe_item_valuations` | History | Single item price checks |
| `poe_items` | Knowledge | Unique items encyclopedia |
| `poe_skills` | Knowledge | Skill gem reference |
| `poe_meta_builds` | Knowledge | Forum meta build registry |
| `poe_crafting_methods` | Knowledge | Crafting guides |
| `poe_league_info` | Knowledge | League metadata |
| `poe_economic_events` | History | Price spikes, meta shifts |
| `poe_ai_requests` | History | AI interaction log |
| `poe_ai_provider_settings` | Config | Active provider + model (NO keys) |

### Electron local storage (ONLY for secrets)

```
userData/
├── poe-session.json          # POESESSID (safeStorage encrypted)
├── poe-oauth.json            # OAuth tokens (safeStorage encrypted)
└── ai/
    └── providers.json.enc    # { "deepseek": { "apiKey": "enc" }, ... }
```

**Never store in SQLite or PostgreSQL**: POESESSID, OAuth tokens, AI API keys, raw GGG session data.

### Data flow

```
Electron UI → IPC (preload) → Main Process → HTTP → Server REST API → Drizzle service → PostgreSQL
```

---

## Shared Types Layer

```
packages/shared/src/poe/
├── build.ts          # Build, CharacterBase, EquippedItem, ComputedItemStats, Modifier, etc.
├── analysis.ts       # AnalysisResult, AnalysisContext, BuildScores, OffenseReport, DefenseReport, etc.
├── adapters.ts       # AdapterResult<T>, AdapterMetadata
├── economy.ts        # EconomyDashboard, ItemValuation, MetaBuild, LeagueInfo, ExchangeRatePoint
├── ai.ts             # AiProviderConfig, AiBuildReviewInput, AiMessage, AiResponse, AiCapabilities
└── index.ts          # Barrel export
```

**Constraints:**
- Only TypeScript interfaces/types/enums
- No imports from: `electron`, `drizzle-orm`, `axios`, `node:*`
- No business logic, no calculations

---

## Core Analyzer Architecture

### Directory

```
apps/server/src/poe/core/
├── models/
│   ├── build.ts             # Build domain model (read from shared)
│   ├── character.ts
│   ├── item.ts
│   └── passive-tree.ts
│
├── engine/
│   ├── analyzer.engine.ts   # Pipeline orchestrator
│   └── pipeline.ts
│
├── calculators/
│   ├── damage.calculator.ts
│   └── defense.calculator.ts
│
├── resolvers/
│   └── stat-resolver.ts     # rawMods → ComputedItemStats
│
├── rules/
│   ├── damage.rules.ts
│   ├── defense.rules.ts
│   ├── scaling.rules.ts
│   └── upgrade.rules.ts
│
├── explanation/              # Built-in offline recommendations
│   ├── recommendation.generator.ts
│   ├── problem.explainer.ts
│   └── upgrade.explainer.ts
│
├── context/
│   └── analysis-context.ts
│
└── factory/
    └── build-factory.ts      # DTO → Build domain model
```

### Pipeline

```
Build
  │
  ├─ 1. Validation
  ├─ 2. Stat Resolution (rawMods → computedStats)
  ├─ 3. Defense Calculator (EHP, resists, layers)
  ├─ 4. Damage Calculator (DPS per tier)
  ├─ 5. Scaling Analysis (marginal gains)
  ├─ 6. Upgrade Detection (weakest slots)
  ├─ 7. League Start Assessment
  └─ 8. Score Aggregation → AnalysisResult
```

### Responsibility split

| Layer | Does | Doesn't |
|-------|------|---------|
| **Engine** | Orchestrate pipeline | Calculate DPS |
| **Calculators** | Math (DPS, EHP) | Make recommendations |
| **Rules** | Check conditions, generate problems | Fetch data |
| **Resolvers** | rawMods → computedStats | Interpret mod text |
| **Factory** | DTO → domain type mapping | Compute item power |

### Key types

```ts
interface AnalysisContext {
  patch: string;
  enemy: { type: 'normal' | 'rare' | 'boss' | 'uber'; resistance: number };
  budget: 'league-start' | 'budget' | 'endgame';
}

interface AnalysisResult {
  facts: { offense: OffenseReport; defense: DefenseReport; scaling: ScalingReport };
  insights: { problems: Problem[]; warnings: Warning[]; recommendations: UpgradeRecommendation[] };
  scores: BuildScores;
  metadata: AnalysisMetadata;
}

interface EquippedItem {
  slot: EquipmentSlot;
  identity: { name: string; baseType: string; rarity: ItemRarity };
  rawMods: Modifier[];          // PRESERVED for recalculation
  computedStats: ComputedItemStats;  // FILLED by stat-resolver
  sockets: SocketGroup[];
}
```

---

## Adapters Architecture

### Directory

```
apps/server/src/poe/adapters/
├── pob.adapter.ts          # pastebin URL → PoBXmlDTO
├── poe-api.adapter.ts      # GGG character-window API → CharacterDTO
├── trade.adapter.ts        # GGG Trade API → TradeSearchDTO, ExchangeRateDTO
├── ninja/
│   ├── currency.adapter.ts # poe.ninja → NinjaCurrencyDTO
│   └── item-price.adapter.ts
├── forum.adapter.ts        # pathofexile.com/forum → ForumMetaDTO
└── wiki.adapter.ts         # poewiki.net → WikiUniqueDTO, WikiSkillDTO

apps/server/src/poe/parsers/
├── pob-xml.parser.ts       # base64 → gzip → XML → PoBXmlDTO
└── forum.parser.ts         # HTML → structured DTO
```

### Rules
- **Adapters**: fetch external data, normalize to DTO, zero business logic
- **Parsers**: parse raw format (XML, HTML, JSON) into typed DTO
- **BuildFactory**: DTO → Build domain model (preserves rawMods, empty computedStats)
- Adapter data goes through `AdapterResult<T>`:
  ```ts
  type AdapterResult<T> = { ok: true; data: T; meta: AdapterMetadata }
                        | { ok: false; error: string; retryAfter?: number };
  ```

### PoB import flow

```
pastebin URL → fetch raw → base64 decode → pako.gunzip → XML string → PoBXmlDTO → BuildFactory → Build
```

Dependency: `pako` (25KB, pure JS, no native deps) for gzip decompression.

---

## AI Layer Architecture

### Principle

AI is an **optional explanation layer**. Core Analyzer provides complete functionality without any AI provider configured.

### Directory

```
apps/server/src/poe/ai/
├── config/
│   ├── ai-settings.ts           # Provider settings storage (no keys)
│   ├── provider-registry.ts     # Supported providers catalog
│   └── provider-types.ts        # ProviderDefinition interface
│
├── interfaces/
│   └── ai-provider.interface.ts # AiProvider contract
│
├── context/
│   └── ai-context.builder.ts    # AnalysisResult → AiBuildReviewInput
│
├── providers/
│   ├── deepseek.provider.ts
│   ├── claude.provider.ts
│   ├── openai.provider.ts
│   └── local.provider.ts        # LM Studio (no API key)
│
├── prompts/
│   ├── build-review.prompt.ts
│   ├── crafting.prompt.ts
│   ├── league-start.prompt.ts
│   └── versions/
│       ├── build-review.v1.ts
│       ├── crafting.v1.ts
│       └── league-start.v1.ts
│
├── ai-analyzer.service.ts       # High-level analysis orchestration
├── ai-manager.service.ts        # Provider lifecycle + fallback
└── tools.ts                     # AiTools — strictly read-only
```

### Two operating modes

```
NO AI MODE
    → Core Analyzer → AnalysisResult → RecommendationGenerator (local) → Structured output

AI ENABLED MODE
    → Core Analyzer → AnalysisResult → AiContextBuilder → AiBuildReviewInput → Provider → Human text
```

### AiProvider interface

```ts
interface AiCapabilities {
  supportsStreaming: boolean;
  supportsTools: boolean;
  contextWindow: number;
  supportsJson: boolean;
}

interface AiProvider {
  id: string;
  capabilities: AiCapabilities;
  chat(input: AiMessage[]): Promise<AiResponse>;
  stream(input: AiMessage[], onChunk: (text: string) => void): Promise<void>;
  testConnection(): Promise<TestResult>;
  models(): Promise<string[]>;
}
```

### AiManager

```ts
interface AiManager {
  getActiveProvider(): Promise<AiProvider | null>;
  testProvider(providerId: string, apiKey: string, endpoint?: string): Promise<TestResult>;
  enableProvider(providerId: string, model: string): Promise<void>;
  disableAI(): Promise<void>;
  reviewBuild(analysisId: number): Promise<AiReviewResult>;
}
```

### Fallback chain

```
AI Review → AiManager → Provider enabled? → API key exists? → Connection OK?
    │
    ├── YES → External AI answer
    │
    └── NO → Local Explanation Generator (deterministic)
```

### Security boundaries for AI

AI **can** read via tools:
- `getBuildFacts(buildAnalysisId)` — computed facts from DB
- `searchEconomy(currency, league)` — current market data
- `getMetaBuilds(league, ascendancy)` — meta context
- `getItemPrice(name, league)` — current valuation

AI **cannot**:
- Calculate DPS, EHP, or resistances
- Modify build data or passive trees
- Execute arbitrary actions or code
- Access adapters or external APIs directly
- Write to the database

AI **never receives**:
- POESESSID or session tokens
- OAuth credentials
- Raw GGG API responses
- Stash data
- Account names
- Full passive trees

### Provider registry

```ts
const providers: ProviderDefinition[] = [
  { id: 'deepseek', name: 'DeepSeek', requiresApiKey: true, defaultEndpoint: 'https://api.deepseek.com', models: ['deepseek-chat', 'deepseek-reasoner'] },
  { id: 'openai', name: 'OpenAI', requiresApiKey: true, defaultEndpoint: 'https://api.openai.com/v1', models: ['gpt-4o', 'gpt-4o-mini'] },
  { id: 'claude', name: 'Claude', requiresApiKey: true, defaultEndpoint: 'https://api.anthropic.com', models: ['claude-3-5-sonnet', 'claude-3-haiku'] },
  { id: 'local', name: 'LM Studio', requiresApiKey: false, defaultEndpoint: 'http://localhost:1234/v1', models: [] },
];
```

### AI mode selector (Settings UI)

| Mode | Behavior |
|------|----------|
| Disabled | Analyzer only, Local Explanation Generator |
| Local only | LM Studio (localhost, no key) |
| Cloud | DeepSeek / OpenAI / Claude (API key via safeStorage) |

---

## Services Architecture

### Directory

```
apps/server/src/services/poe/
├── builds.repo.ts           # CRUD for poe_builds
├── analyses.repo.ts         # CRUD for poe_build_analyses
├── currency.repo.ts         # Currency snapshots + economic events
├── market.repo.ts           # Market snapshots + item valuations
├── items.repo.ts            # Knowledge items + skills + leagues
├── meta.repo.ts             # Meta builds + crafting methods
├── trade-cache.repo.ts      # Trade search cache
└── ai.repo.ts               # AI requests + provider settings
```

### Pattern

All repos follow the existing server pattern:
```ts
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema } from '../../db/index.js';

export function findById(db: NodePgDatabase<typeof schema>, id: number) {
  return db.select().from(schema.table).where(eq(schema.table.id, id));
}
```

Services (Phase 3) will be added under `apps/server/src/services/poe/`:
```
build-analysis.service.ts, economy.service.ts, item-upgrade.service.ts,
league-start.service.ts, meta-analysis.service.ts, cache.service.ts
```

---

## Dependency Injection

Manual DI only:

```ts
// apps/server/src/poe/poe-module.ts
export class PoeModule {
  readonly repos = {
    builds: { findBuildByHash, insertBuild, listBuilds, deleteBuild },
    analyses: { findAnalysesByHash, insertAnalysis, ... },
    currency: { findCurrencySnapshots, insertCurrencySnapshot, ... },
    market: { findMarketSnapshots, insertItemValuation, ... },
    items: { findItemByName, upsertItem, ... },
    meta: { listMetaBuilds, insertMetaBuild, ... },
    tradeCache: { findTradeCacheByHash, insertTradeCache, ... },
    ai: { getActiveProvider, upsertProvider, insertAiRequest, ... },
  };
}
```

**Forbidden**: Nest, TSyringe, Inversify, decorators, reflection.

---

## Old Code Protection

- Existing `apps/client/src/renderer/features/poe-assistant/` remains untouched until Phase 5
- Existing IPC handlers in `apps/client/src/main/ipc/poe.ts` remain active
- Feature flag `POE_ANALYZER_ENABLED` controls migration
- New code lives in `apps/client/src/renderer/features/poe-analyzer/`

---

## Testing Strategy

### Unit tests (Phase 1+)
```
apps/server/src/poe/core/rules/__tests__/
├── damage.rules.test.ts
├── defense.rules.test.ts
└── scaling.rules.test.ts
```

### Integration test (Phase 1+)
```
apps/server/src/__tests__/
└── pob-import.integration.test.ts
```

### Golden fixtures
```
apps/server/src/__tests__/fixtures/
├── mageblood-boneshatter.pob
├── starter-dd-elementalist.pob
└── rf-jugg.pob
```

### Test constraints
- Core engine: testable without Electron, without API, without DB — pure functions
- Use existing Vitest setup with in-memory PostgreSQL or SQLite for DB tests
- No AI required for any test

---

## Security Constraints

| Layer | Can | Cannot |
|-------|-----|--------|
| Core | Calculate EHP/DPS | Access network, DB, AI |
| Adapters | Fetch & normalize data | Make recommendations |
| AI | Explain results | Calculate game mechanics |
| Repos | CRUD operations | Contain business logic |

- Secrets: `safeStorage` only, never in any database
- Rate limiting: 334ms minimum between GGG API calls (already implemented)
- Data freshness: 4h currency, 24h items, per AGENTS.md freshness table

---

## Implementation Phases

| Phase | Name | Files | Key deliverable |
|-------|------|-------|-----------------|
| 0 | Foundation | 20+ | PostgreSQL schema + shared types + repos (DONE) |
| 1 | Core Engine | 20+ | PoB import → Build → AnalysisResult |
| 2 | Adapters | 10+ | GGG/Trade/Ninja/Wiki/Forum data sources |
| 3 | Services | 7+ | Use case orchestration |
| 4 | AI Layer | 18+ | Provider registry + 4 providers + prompts + fallback |
| 5 | UI Migration | 30+ | Old poe-assistant → poe-analyzer + Settings UI |

Each phase is an independent mergeable PR. Typecheck + test before merge.

---

## Phase 0 Status: COMPLETED

| Commit | What |
|--------|------|
| `303a5d5` | AGENTS.md: PoE Database Rule + Database Architecture Rule + AI Architecture Rule |
| `f88f70b` | Schema: 13 PostgreSQL tables + migration `0001_sleepy_cyclops.sql` |
| `684074b` | Shared: 5 type files in `packages/shared/src/poe/` |
| `119b6e2` | Repos: 8 repository modules in `apps/server/src/services/poe/` |

Typecheck: **PASS** across all 4 packages. No SQLite, no native modules.

---

## Verification Checklist

- [x] No SQLite anywhere — all PoE data in PostgreSQL
- [x] AI does not depend on Core Analyzer
- [x] PostgreSQL is the single database
- [x] Old poe-assistant protected (no files modified)
- [x] Shared types contain no infrastructure imports
- [x] Repos follow existing server pattern (NodePgDatabase)
- [x] safeStorage for secrets only
- [x] Pipeline: math before AI
- [x] Manual DI only, no containers
- [x] pnpm typecheck passes

---

## Next Steps (Phase 1)

1. Add `pako` dependency for gzip decompression
2. Implement `parsers/pob-xml.parser.ts` — base64 → gzip → XML → PoBXmlDTO
3. Implement `adapters/pob.adapter.ts` — fetch pastebin → parser → AdapterResult
4. Implement `core/models/*` — Build, Character, Item, Skill, PassiveTree domain types
5. Implement `core/factory/build-factory.ts` — PoBXmlDTO → Build (rawMods, no computedStats)
6. Implement `core/resolvers/stat-resolver.ts` — rawMods → ComputedItemStats
7. Implement `core/calculators/*` + `core/rules/*`
8. Implement `core/engine/analyzer.engine.ts` — full pipeline
9. Unit tests for rules, integration test for PoB import
10. Typecheck, commit
