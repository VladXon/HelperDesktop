# PoE Analyzer 2.0 — Design Specification

**Status**: APPROVED  
**Date**: 2026-07-21  
**Scope**: Full redesign of PoE intelligence module from API tools to build intelligence system

---

## Architecture Overview

```
External Sources (PoB, GGG API, Trade, PoE Ninja, Wiki, Forums)
    │
    ▼
Adapters (fetch + normalize → DTO, no business logic)
    │
    ▼
Build Factory (DTO → Build domain model with rawMods, no computed stats)
    │
    ▼
Core Engine (Stat Resolution → Defense Calculator → Damage Calculator → Scaling → Upgrade → Score)
    │                           rules/*           rules/*         rules/*
    │
    ▼
AnalysisResult = { facts, insights, scores }
    │
    ├────► Database (cache + history + knowledge)
    │
    └────► AI Layer (gets AnalysisResult + Knowledge → human explanation)
              │
              providers: DeepSeek, Claude, OpenAI, Local LLM
              tools: getBuildFacts, searchEconomy, getMetaBuilds
```

**Core principle**: Math before AI. Core engine calculates exact EHP/DPS/resists. AI is an **optional explanation layer** — the analyzer works fully offline.

**Two operating modes:**

```
NO AI MODE
    │
    ▼
Core Analyzer
    │
    ▼
AnalysisResult
    │
    ▼
Built-in RecommendationGenerator (local, no network)
    │
    ▼
Structured recommendations (problem → solution)

AI ENABLED MODE
    │
    ▼
AnalysisResult
    │
    ▼
AI Provider (DeepSeek / Claude / OpenAI / LM Studio)
    │
    ▼
Human explanation (nuanced, contextual)
```

**Hard rule**: If AI is unavailable (no key, API down, credits exhausted) — analysis MUST continue via the built-in generator. AI is an enhancement, not a dependency.

---

## Directory Structure

```
apps/client/src/main/
├── database/
│   ├── core/                    # existing app DB
│   └── poe/                     # PoE namespace
│       ├── schema.ts            # 13 Drizzle tables
│       ├── migrations/
│       └── repositories/        # 8 repo classes
│
├── poe/
│   ├── adapters/                # External data sources → DTO
│   │   ├── pob.adapter.ts
│   │   ├── poe-api.adapter.ts
│   │   ├── trade.adapter.ts
│   │   ├── ninja/currency.adapter.ts
│   │   ├── ninja/item-price.adapter.ts
│   │   ├── forum.adapter.ts
│   │   └── wiki.adapter.ts
│   │
│   ├── parsers/                 # Raw format parsers
│   │   ├── pob-xml.parser.ts
│   │   └── forum.parser.ts
│   │
│   ├── core/                    # Pure TypeScript analysis
│   │   ├── models/              # Build, Character, Item, Skill, PassiveTree
│   │   ├── engine/
│   │   │   ├── analyzer.engine.ts     # pipeline orchestrator
│   │   │   └── pipeline.ts
│   │   ├── calculators/
│   │   │   ├── damage.calculator.ts
│   │   │   └── defense.calculator.ts
│   │   ├── resolvers/
│   │   │   └── stat-resolver.ts       # rawMods → ComputedItemStats
│   │   ├── rules/
│   │   │   ├── damage.rules.ts
│   │   │   ├── defense.rules.ts
│   │   │   ├── scaling.rules.ts
│   │   │   └── upgrade.rules.ts
  │   │   ├── explanation/
  │   │   │   ├── recommendation.generator.ts  # built-in offline recommendations
  │   │   │   ├── problem.explainer.ts         # explains why a problem matters
  │   │   │   └── upgrade.explainer.ts         # upgrade rationale + priority
│   │   ├── context/
│   │   │   └── analysis-context.ts
│   │   └── factory/
│   │       └── build-factory.ts
│   │
│   ├── services/                # Use case orchestration
│   │   ├── build-analysis.service.ts
│   │   ├── economy.service.ts
│   │   ├── item-upgrade.service.ts
│   │   ├── league-start.service.ts
│   │   ├── meta-analysis.service.ts
│   │   └── cache.service.ts
│   │
  │   └── ai/                      # AI abstraction layer (optional)
  │       ├── config/
  │       │   ├── ai-settings.ts         # provider settings storage
  │       │   ├── provider-registry.ts   # supported providers catalog
  │       │   └── provider-types.ts      # ProviderDefinition interface
  │       ├── context/
  │       │   └── ai-context.builder.ts  # AnalysisResult → AiBuildReviewInput
  │       ├── interfaces/ai-provider.interface.ts
  │       ├── providers/deepseek.provider.ts
  │       ├── providers/claude.provider.ts
  │       ├── providers/openai.provider.ts
  │       ├── providers/local.provider.ts
  │       ├── prompts/build-review.prompt.ts
  │       ├── prompts/crafting.prompt.ts
  │       ├── prompts/league-start.prompt.ts
  │       ├── prompts/versions/              # prompt versioning
  │       │   ├── build-review.v1.ts
  │       │   ├── crafting.v1.ts
  │       │   └── league-start.v1.ts
  │       ├── ai-analyzer.service.ts
  │       ├── ai-manager.service.ts      # provider lifecycle + fallback
  │       └── tools.ts                   # AiTools — strictly read-only

packages/shared/src/poe/
├── build.ts
├── analysis.ts
├── adapters.ts
├── economy.ts
├── ai.ts
└── index.ts

apps/client/src/renderer/features/poe-analyzer/    # Phase 5
├── index.ts
├── types.ts
├── api.ts
├── hooks/
├── components/
│   ├── PoeAnalyzerPage.tsx
│   ├── auth/AuthPanel.tsx
│   ├── dashboard/Dashboard.tsx
│   ├── build-analyzer/
│   ├── economy/
│   └── characters/

apps/client/src/renderer/features/settings/     # AI Provider Settings
└── components/
    └── ai/
        ├── AiProviderSettings.tsx
        ├── ProviderCard.tsx
        ├── ApiKeyInput.tsx
        └── ConnectionTest.tsx
```

---

## Data Model

### Build (domain entity)
```ts
interface Build {
  game: 'poe1' | 'poe2';
  name: string;
  source: 'pob' | 'api' | 'manual';
  character: CharacterBase;
  passiveTree: PassiveTreeSnapshot;
  items: EquippedItem[];     // rawMods + computedStats
  skills: SkillSetup[];
  config: BuildConfig;
}

interface EquippedItem {
  slot: EquipmentSlot;
  identity: { name, baseType, rarity };
  rawMods: Modifier[];          // preserved for recalculation
  computedStats: ComputedItemStats;  // filled by stat-resolver
  sockets: SocketGroup[];
}
```

### AnalysisResult
```ts
interface AnalysisResult {
  facts: {
    offense: OffenseReport;
    defense: DefenseReport;
    scaling: ScalingReport;
  };
  insights: {
    problems: Problem[];
    warnings: Warning[];
    recommendations: UpgradeRecommendation[];
  };
  scores: BuildScores;
  metadata: AnalysisMetadata;
}
```

---

## Data Flow

```
pastebin URL
    │
    ▼
pob.adapter (fetch raw → parse XML → PoBXmlDTO)
    │
    ▼
BuildFactory.fromPoB()          # DTO → Build with rawMods, empty computedStats
    │
    ▼
Analyzer Engine pipeline:
  1. Validation
  2. Stat Resolution (rawMods → computedStats via stat-resolver)
  3. Defense Calculator (EHP, resists, layers via defense.rules)
  4. Damage Calculator (DPS per tier via damage.rules)
  5. Scaling Analysis (marginal gains via scaling.rules)
  6. Upgrade Detection (weakest slots via upgrade.rules)
  7. Score Aggregation
    │
    ▼
AnalysisResult { facts, insights, scores }
    │
    ├────► Database (build_analyses table)
    │
    └────► AI Layer
              getBuildFacts() → structured facts
              build-review.prompt → formatted prompt
              provider.complete() → human explanation
```

---

## Database Schema (13 tables)

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
| `poe_ai_provider_settings` | Config | Active provider + model (NO API KEYS) |

**Secrets** (POESESSID, OAuth tokens, AI API keys) → `safeStorage` encrypted files, NOT in SQLite:
```
userData/
├── poe-session.json          # POESESSID (encrypted)
├── poe-oauth.json            # OAuth tokens (encrypted)
└── ai/
    └── providers.json.enc    # { "deepseek": { "apiKey": "encrypted" }, ... }
```

SQLite `poe_ai_provider_settings` stores only:
```
{ provider: "deepseek", model: "deepseek-chat", enabled: true, createdAt: timestamp }
```
No keys, no tokens, no secrets.

---

## AI Provider Registry

### Supported providers

```ts
interface AiProviderConfig {
  id: 'deepseek' | 'openai' | 'claude' | 'local';
  name: string;
  requiresApiKey: boolean;
  defaultEndpoint: string;
  models: string[];
}

const providers: AiProviderConfig[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    requiresApiKey: true,
    defaultEndpoint: 'https://api.deepseek.com',
    models: ['deepseek-chat', 'deepseek-reasoner'],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    requiresApiKey: true,
    defaultEndpoint: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini'],
  },
  {
    id: 'claude',
    name: 'Claude',
    requiresApiKey: true,
    defaultEndpoint: 'https://api.anthropic.com',
    models: ['claude-3-5-sonnet', 'claude-3-haiku'],
  },
  {
    id: 'local',
    name: 'LM Studio',
    requiresApiKey: false,
    defaultEndpoint: 'http://localhost:1234/v1',
    models: [],  // discovered via /v1/models
  },
];
```

### Fallback system

```
AI Review requested
    │
    ▼
AiManager.getActiveProvider()
    │
    ├─ provider exists & enabled & key valid ──► AI answer
    │
    └─ no provider / disabled / API error ────► recommendation.generator.ts
                                                    │
                                                    ▼
                                              Structured local explanation
```

### AiManager interface

```ts
interface AiManager {
  getActiveProvider(): Promise<AiProvider | null>;
  testProvider(providerId: string, apiKey: string, endpoint?: string): Promise<TestResult>;
  enableProvider(providerId: string, model: string): Promise<void>;
  disableAI(): Promise<void>;
  reviewBuild(analysisId: number): Promise<AiReviewResult>;
}
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

Streaming is required for Phase 5 UI — the "AI Review" button shows live text as it arrives instead of waiting for the full response.

### AI Mode selector

User setting in Settings → AI Providers:

| Mode | Behavior |
|------|----------|
| **Disabled** | Analyzer only → Local Explanation Generator. No AI calls. |
| **Local only** | LM Studio only (`http://localhost:1234`). No API key needed. |
| **Cloud** | Any cloud provider (DeepSeek / OpenAI / Claude). API key required. |

### AI Request History table

```ts
export const aiRequests = sqliteTable('poe_ai_requests', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  buildAnalysisId: integer('build_analysis_id'),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  promptVersion: text('prompt_version').notNull(),  // e.g. "build-review.v1"
  promptHash: text('prompt_hash').notNull(),
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  status: text('status').notNull(),                 // 'success' | 'failed' | 'fallback'
  responseText: text('response_text'),
  errorMessage: text('error_message'),
  createdAt: integer('created_at').notNull(),
}, (table) => ({
  analysisIdx: index('idx_ai_analysis').on(table.buildAnalysisId),
  statusIdx: index('idx_ai_status').on(table.status),
}));
```

### Security: what AI never receives

AI providers are strictly firewalled. They never get:
- POESESSID or session tokens
- OAuth credentials
- Raw GGG API responses
- Stash data
- Account name
- Full passive tree (only score summaries)

AI receives only: `AiBuildReviewInput` (summary + key stats + problems).

### Provider Registry — factory pattern

```ts
interface ProviderDefinition {
  id: string;
  displayName: string;
  factory: (config: { apiKey: string; endpoint?: string; model: string }) => AiProvider;
  requiresKey: boolean;
  defaultEndpoint: string;
  defaultModels: string[];
}
```

Registry is a simple map: `{ deepseek: ProviderDefinition, openai: ..., claude: ..., local: ... }`.

Adding a new provider = adding one new `ProviderDefinition` entry + one provider implementation file.

### AiContextBuilder — strips AnalysisResult for AI

AI never gets the raw `AnalysisResult`. It gets `AiBuildReviewInput`:

```ts
interface AiBuildReviewInput {
  summary: {
    buildName: string;
    mainSkill: string;
    ascendancy: string;
  };
  problems: Problem[];
  upgrades: UpgradeRecommendation[];
  keyStats: {
    dps: number;
    ehp: number;
    resistances: Record<string, number>;
  };
  metaContext?: MetaContext;
  budgetTier: 'budget' | 'mid' | 'high' | 'mirror';
}
```

`ai-context.builder.ts` takes `AnalysisResult` + `MetaContext` → produces `AiBuildReviewInput`. AI never sees raw items, passive tree, or full damage breakdowns.

### AI Tools — strict read-only boundaries

AI can call (`tools.ts`):
- `getBuildFacts(buildAnalysisId)` — read computed facts from DB
- `searchEconomy(currency, league)` — current market data
- `getMetaBuilds(league, ascendancy)` — meta context
- `getItemPrice(name, league)` — current valuation

AI CANNOT:
- Calculate DPS or EHP
- Modify Build
- Execute arbitrary code
- Access raw GGG API or adapters
- Write to the database

**Rule**: Core calculates. AI explains.

### Local Explanation Generator (no AI mode)

Three modules replacing AI when disabled:

```
core/explanation/
├── recommendation.generator.ts   # AnalysisResult → structured recommendations
├── problem.explainer.ts          # Problem → why it matters + how to fix
└── upgrade.explainer.ts          # Upgrade item → rationale + priority score
```

Example output:
```
Problem: Low chaos resistance (-20%)
Why: Chaos damage bypasses most defenses.
Fix: Get chaos resistance on ring, belt, or boots.
Impact: +18% effective HP against chaos damage.

Upgrade: Replace ring
Reason: +35 chaos resistance
Priority: 87/100
```

No AI, no network, deterministic — built directly from `core/rules/` calculations. AI enriches this, but never replaces it.

---

## Implementation Phases

| Phase | Name | Deliverable | Files |
|-------|------|------------|-------|
| 0 | Foundation | DB schema + types + DI | ~30 |
| 1 | Core Engine | PoB import → Build → AnalysisResult | ~20 |
| 2 | Adapters | GGG/Trade/Ninja/Wiki/Forum data sources | ~10 |
| 3 | Services | Use case orchestration | ~7 |
| 4 | AI Layer | Provider registry + context builder + 4 providers + prompts + fallback + local explainers | ~22 |
| 5 | UI Integration | Old poe-assistant → poe-analyzer migration + AI Provider Settings page | ~30 |

Each phase is an independent mergeable PR. Existing `poe-assistant/` remains untouched until Phase 5.

---

## Security Constraints

- Core engine: zero I/O, zero AI, zero external deps — pure TS calculations
- Adapters: only data acquisition, no business logic, no recommendations
- AI: explanation only, never calculates DPS/EHP directly
- AI: optional — analysis MUST work without any AI provider configured
- AI tools: strictly read-only (getBuildFacts, searchEconomy, getMetaBuilds, getItemPrice)
- AI CANNOT: calculate DPS, modify Build, execute arbitrary code, access adapters, write to DB
- Secrets: `safeStorage` encrypted files, never in SQLite
- Data freshness: per AGENTS.md PoE Data Freshness table (4h currency, 24h items)
- Feature flag: `POE_ANALYZER_ENABLED` for safe UI migration

---

## Testing Strategy

- **Unit**: `core/rules/*.test.ts` — golden tests with fixed fixtures
- **Integration**: `pob-import.integration.test.ts` — real pastebin → AnalysisResult
- **Golden fixtures**: `tests/fixtures/*.pob` — known builds with expected scores
- **Core**: testable without Electron, without API, without DB — pure functions

---

## Open Decisions (v2+)

- Community Fork Lua engine for DPS verification
- Passive tree heatmap visualization
- Crafting calculator with live prices
- Atlas tree analyzer
- Farming profitability calculator
- PoE2 full parity
- WebSocket live price streaming
- Mobile/Telegram bot integration
