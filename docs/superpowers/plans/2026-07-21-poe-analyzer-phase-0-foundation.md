# PoE Analyzer 2.0 — Phase 0 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the database schema (SQLite via Drizzle), shared type system, and DI foundation for the PoE Analyzer module.

**Architecture:** Adds `better-sqlite3` + `drizzle-orm` to the Electron main process, 13 tables under `main/database/poe/`, shared types in `packages/shared/src/poe/`, and a `PoeModule` class for dependency injection. Follows existing project patterns (server's Drizzle setup, shared's type layout).

**Tech Stack:** Drizzle ORM (sqlite dialect) + better-sqlite3 + TypeScript + Electron (main process)

## Global Constraints

- All PoE DB tables are SQLite, prefix `poe_`, in Electron userData directory
- Drizzle version pinned to match server: `drizzle-orm@^0.45.0`, `drizzle-kit@^0.30.0`
- Shared types follow `packages/shared/src/<domain>/` pattern (separate files, barrel index)
- Repositories follow existing service pattern: receive `db` instance, return typed results
- Zero test files in Phase 0 (follows existing "Zero client tests" state)
- Native module: `better-sqlite3` via `@electron/rebuild` + existing `@electron-forge/plugin-auto-unpack-natives`
- No AI integration, no external APIs — pure schema + types + DI
- Must pass: `pnpm typecheck` with zero errors

---

### Task 0: Add database dependencies to client

**Files:**
- Modify: `apps/client/package.json`
- Modify: `pnpm-lock.yaml` (automatic)

**Interfaces:**
- Produces: New deps available in `apps/client/node_modules`

- [ ] **Step 1: Add runtime dependencies**

```bash
cd apps/client
pnpm add better-sqlite3@^12.0.0 drizzle-orm@^0.45.0
pnpm add -D drizzle-kit@^0.30.0 @types/better-sqlite3
```

Expected: `package.json` updated with 2 new `dependencies` and 2 new `devDependencies`.

- [ ] **Step 2: Add @electron/rebuild for native module compilation**

```bash
pnpm add -D @electron/rebuild
```

- [ ] **Step 3: Add rebuild script to package.json**

Add to `apps/client/package.json` `scripts`:
```json
"rebuild": "electron-rebuild -f -w better-sqlite3"
```

- [ ] **Step 4: Run rebuild**

```bash
cd apps/client
pnpm rebuild
```

Expected: `better-sqlite3` compiled against Electron's Node version. Output shows "✔ Rebuild Complete".

- [ ] **Step 5: Verify module loads in Electron context**

Create a quick smoke test — add a temp console.log in main entry, then run `pnpm dev`:

In `apps/client/src/main/index.ts`, add temporarily:
```ts
import Database from 'better-sqlite3';
const testDb = new Database(':memory:');
console.log('better-sqlite3 loaded:', testDb.pragma('user_version'));
testDb.close();
```

Run `pnpm dev` from workspace root. Expected: no native module errors in console.

- [ ] **Step 6: Remove temp test code and commit**

```bash
cd apps/client
# Revert temp test code
git checkout src/main/index.ts
git add package.json pnpm-lock.yaml
git commit -m "chore(client): add better-sqlite3 + drizzle-orm + electron-rebuild"
```

---

### Task 1: Create Drizzle schema file

**Files:**
- Create: `apps/client/src/main/database/poe/schema.ts`
- Create: `apps/client/src/main/database/poe/index.ts`

**Interfaces:**
- Produces: `PoeDb` type, `getPoeDb()` function, `initPoeDb()` function, all 13 table definitions

- [ ] **Step 1: Create directory structure**

```bash
mkdir "apps\client\src\main\database"
mkdir "apps\client\src\main\database\poe"
```

- [ ] **Step 2: Write schema file (13 tables)**

Create `apps/client/src/main/database/poe/schema.ts`:

```ts
import { sqliteTable, integer, real, text, uniqueIndex, index } from 'drizzle-orm/sqlite-core';

export const poeCurrencySnapshots = sqliteTable('poe_currency_snapshots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  league: text('league').notNull(),
  currencyType: text('currency_type').notNull(),
  chaosEquivalent: real('chaos_equivalent').notNull(),
  divineEquivalent: real('divine_equivalent').notNull(),
  change24h: real('change_24h'),
  listingCount: integer('listing_count'),
  snapshotTime: integer('snapshot_time').notNull(),
  source: text('source').notNull().default('ninja'),
}, (table) => ({
  leagueCurrencyTimeIdx: index('idx_cs_league_time').on(table.league, table.currencyType, table.snapshotTime),
}));

export const poeMarketSnapshots = sqliteTable('poe_market_snapshots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  league: text('league').notNull(),
  itemName: text('item_name').notNull(),
  itemType: text('item_type').notNull(),
  chaosValue: real('chaos_value').notNull(),
  divineValue: real('divine_value'),
  change24h: real('change_24h'),
  listingCount: integer('listing_count'),
  snapshotTime: integer('snapshot_time').notNull(),
  source: text('source').notNull().default('trade'),
}, (table) => ({
  leagueItemTimeIdx: index('idx_ms_league_time').on(table.league, table.itemName, table.snapshotTime),
}));

export const poeTradeSearchCache = sqliteTable('poe_trade_search_cache', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  queryHash: text('query_hash').notNull().unique(),
  queryJson: text('query_json').notNull(),
  league: text('league').notNull(),
  resultJson: text('result_json').notNull(),
  totalItems: integer('total_items').notNull(),
  createdAt: integer('created_at').notNull(),
  expiresAt: integer('expires_at').notNull(),
});

export const poeBuilds = sqliteTable('poe_builds', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  buildHash: text('build_hash').notNull().unique(),
  game: text('game').notNull(),
  name: text('name'),
  source: text('source').notNull(),
  characterClass: text('character_class'),
  ascendancy: text('ascendancy'),
  level: integer('level'),
  rawSourceHash: text('raw_source_hash'),
  createdAt: integer('created_at').notNull(),
});

export const poeBuildAnalyses = sqliteTable('poe_build_analyses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  buildHash: text('build_hash').notNull(),
  game: text('game'),
  league: text('league'),
  patchVersion: text('patch_version'),
  analyzerVersion: text('analyzer_version'),
  analysisContextJson: text('analysis_context_json'),
  resultJson: text('result_json').notNull(),
  overallScore: integer('overall_score').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  buildHashIdx: index('idx_ba_hash').on(table.buildHash),
  scoreIdx: index('idx_ba_score').on(table.overallScore),
}));

export const poeItemValuations = sqliteTable('poe_item_valuations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  league: text('league').notNull(),
  itemHash: text('item_hash').notNull(),
  itemName: text('item_name').notNull(),
  itemType: text('item_type').notNull(),
  chaosValue: real('chaos_value').notNull(),
  confidence: text('confidence').notNull(),
  listingCount: integer('listing_count'),
  minPrice: real('min_price'),
  medianPrice: real('median_price'),
  maxPrice: real('max_price'),
  valuedAt: integer('valued_at').notNull(),
  source: text('source').notNull().default('trade'),
});

export const poeItems = sqliteTable('poe_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  game: text('game').notNull(),
  name: text('name').notNull(),
  baseType: text('base_type'),
  itemType: text('item_type'),
  category: text('category'),
  level: integer('level'),
  requiredLevel: integer('required_level'),
  flavourText: text('flavour_text'),
  explicitStatsJson: text('explicit_stats_json'),
  dropSourcesJson: text('drop_sources_json'),
  icon: text('icon'),
  source: text('source').notNull().default('wiki'),
  sourceUrl: text('source_url'),
  version: text('version').notNull().default('1.0'),
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  gameNameUnique: uniqueIndex('idx_items_game_name').on(table.game, table.name),
}));

export const poeSkills = sqliteTable('poe_skills', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  game: text('game').notNull(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  tagsJson: text('tags_json').notNull(),
  gemLevel: integer('gem_level'),
  manaMultiplier: integer('mana_multiplier'),
  qualityStatsJson: text('quality_stats_json'),
  source: text('source').notNull().default('wiki'),
  sourceUrl: text('source_url'),
  version: text('version').notNull().default('1.0'),
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  gameNameTypeUnique: uniqueIndex('idx_skills_game_name').on(table.game, table.name, table.type),
}));

export const poeMetaBuilds = sqliteTable('poe_meta_builds', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  game: text('game').notNull(),
  league: text('league').notNull(),
  name: text('name').notNull(),
  class: text('class').notNull(),
  ascendancy: text('ascendancy'),
  mainSkill: text('main_skill'),
  budget: text('budget').notNull(),
  popularity: integer('popularity'),
  pastebinUrl: text('pastebin_url'),
  forumUrl: text('forum_url'),
  tagsJson: text('tags_json'),
  source: text('source').notNull().default('forum'),
  sourceUrl: text('source_url'),
  version: text('version').notNull().default('1.0'),
  updatedAt: integer('updated_at').notNull(),
});

export const poeCraftingMethods = sqliteTable('poe_crafting_methods', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  game: text('game').notNull(),
  methodName: text('method_name').notNull(),
  targetItem: text('target_item').notNull(),
  stepsJson: text('steps_json').notNull(),
  estimatedCostLow: real('estimated_cost_low'),
  estimatedCostHigh: real('estimated_cost_high'),
  requiredUnlocksJson: text('required_unlocks_json'),
  source: text('source').notNull().default('community'),
  sourceUrl: text('source_url'),
  version: text('version').notNull().default('1.0'),
  updatedAt: integer('updated_at').notNull(),
});

export const poeLeagueInfo = sqliteTable('poe_league_info', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  game: text('game').notNull(),
  leagueId: text('league_id').notNull(),
  leagueName: text('league_name').notNull(),
  isCurrent: integer('is_current', { mode: 'boolean' }).notNull().default(false),
  isHardcore: integer('is_hardcore', { mode: 'boolean' }).notNull().default(false),
  isSsf: integer('is_ssf', { mode: 'boolean' }).notNull().default(false),
  startDate: integer('start_date').notNull(),
  endDate: integer('end_date'),
  version: text('version').notNull().default('1.0'),
});

export const poeEconomicEvents = sqliteTable('poe_economic_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  league: text('league').notNull(),
  eventType: text('event_type').notNull(),
  currency: text('currency'),
  itemName: text('item_name'),
  description: text('description').notNull(),
  changePercent: real('change_percent'),
  occurredAt: integer('occurred_at').notNull(),
});

export const poeAiRequests = sqliteTable('poe_ai_requests', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  buildAnalysisId: integer('build_analysis_id'),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  promptVersion: text('prompt_version').notNull(),
  promptHash: text('prompt_hash').notNull(),
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  status: text('status').notNull(),
  responseText: text('response_text'),
  errorMessage: text('error_message'),
  createdAt: integer('created_at').notNull(),
}, (table) => ({
  analysisIdx: index('idx_ar_analysis').on(table.buildAnalysisId),
  statusIdx: index('idx_ar_status').on(table.status),
}));

export const poeAiProviderSettings = sqliteTable('poe_ai_provider_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  provider: text('provider').notNull().unique(),
  model: text('model').notNull(),
  endpoint: text('endpoint'),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
```

- [ ] **Step 3: Write database initialization**

Create `apps/client/src/main/database/poe/index.ts`:

```ts
import { app } from 'electron';
import path from 'path';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

let poeDb: BetterSQLite3Database<typeof schema> | null = null;

export function initPoeDb(): BetterSQLite3Database<typeof schema> {
  if (poeDb) return poeDb;
  const dbPath = path.join(app.getPath('userData'), 'poe-analyzer.db');
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  poeDb = drizzle(sqlite, { schema });
  return poeDb;
}

export function getPoeDb(): BetterSQLite3Database<typeof schema> {
  if (!poeDb) return initPoeDb();
  return poeDb;
}

export { schema };
export type PoeDb = typeof poeDb;
```

- [ ] **Step 4: Add Drizzle config for client**

Create `apps/client/drizzle.poe.config.ts`:

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/main/database/poe/schema.ts',
  out: './src/main/database/poe/migrations',
  dbCredentials: {
    url: './poe-analyzer.db',
  },
});
```

- [ ] **Step 5: Generate migration**

```bash
cd apps/client
npx drizzle-kit generate --config drizzle.poe.config.ts
```

Expected: creates `apps/client/src/main/database/poe/migrations/0000_*.sql`

- [ ] **Step 6: Generate migration and wire auto-migration**

Generate SQL migration:
```bash
cd apps/client
npx drizzle-kit generate --config drizzle.poe.config.ts
```

Expected: creates `apps/client/src/main/database/poe/migrations/0000_*.sql`

Update `apps/client/src/main/database/poe/index.ts` to run migrations on init:

```ts
import { app } from 'electron';
import path from 'path';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';

let poeDb: BetterSQLite3Database<typeof schema> | null = null;

export function initPoeDb(): BetterSQLite3Database<typeof schema> {
  if (poeDb) return poeDb;
  const dbPath = path.join(app.getPath('userData'), 'poe-analyzer.db');
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  poeDb = drizzle(sqlite, { schema });
  const migrationsFolder = path.join(__dirname, 'database', 'poe', 'migrations');
  migrate(poeDb, { migrationsFolder });
  return poeDb;
}

export function getPoeDb(): BetterSQLite3Database<typeof schema> {
  if (!poeDb) return initPoeDb();
  return poeDb;
}

export { schema };
export type PoeDb = typeof poeDb;
```

Note: The `__dirname` path for migrations depends on Vite build output. If migration fails at dev-time due to path issues, fall back to using `drizzle-kit push` for dev and run `migrate()` only in packaged builds. For Phase 0, the generated migration SQL file exists but auto-migration is optional — Drizzle's `push` handles schema sync during development.

- [ ] **Step 7: Commit**

```bash
git add apps/client/src/main/database/ apps/client/drizzle.poe.config.ts apps/client/package.json apps/client/pnpm-lock.yaml
git commit -m "feat(poe): add Drizzle schema with 13 tables + db init module"
```

---

### Task 2: Create shared PoE types

**Files:**
- Create: `packages/shared/src/poe/build.ts`
- Create: `packages/shared/src/poe/analysis.ts`
- Create: `packages/shared/src/poe/adapters.ts`
- Create: `packages/shared/src/poe/economy.ts`
- Create: `packages/shared/src/poe/ai.ts`
- Create: `packages/shared/src/poe/index.ts`
- Modify: `packages/shared/src/index.ts`

**Interfaces:**
- Produces: `Build`, `CharacterBase`, `PassiveTreeSnapshot`, `EquippedItem`, `EquipmentSlot`, `SkillSetup`, `BuildConfig`, `Modifier`, `ComputedItemStats`, `ItemRarity`, `Influence`, `SocketGroup`, `DamageRange`, `ChargeState`, `ClusterJewelSummary`, `AnalysisResult`, `BuildScores`, `OffenseReport`, `DefenseReport`, `ScalingReport`, `UpgradeRecommendation`, `Problem`, `Warning`, `AnalysisContext`, `AnalysisMetadata`, `BuildSummary`, `SkillSummary`, `LeechSummary`, `GuardSkillSummary`, `DamageProfile`, `ScalingVector`, `AdapterResult`, `AdapterMetadata`, `AiProviderConfig`, `AiBuildReviewInput`, `AiMessage`, `AiResponse`, `AiCapabilities`, `AiReviewResult`, `TestResult`, `EconomySnapshot`, `EconomyDashboard`, `MetaBuild`, `ItemValuation`, `LeagueInfo`

- [ ] **Step 1: Create directory**

```bash
mkdir "packages\shared\src\poe"
```

- [ ] **Step 2: Write build.ts — domain model types**

Create `packages/shared/src/poe/build.ts`:

```ts
export type EquipmentSlot = 'helm' | 'amulet' | 'chest' | 'ring1' | 'ring2' | 'belt' | 'gloves' | 'boots' | 'mainHand' | 'offHand' | 'flask1' | 'flask2' | 'flask3' | 'flask4' | 'flask5' | 'jewel' | 'abyss';

export type ItemRarity = 'normal' | 'magic' | 'rare' | 'unique';

export type Influence = 'shaper' | 'elder' | 'crusader' | 'hunter' | 'redeemer' | 'warlord';

export interface Modifier {
  name: string;
  values: string[];
  domain: string;
}

export interface SocketGroup {
  group: number;
  colours: string;
  links: number;
}

export interface DamageRange {
  type: 'physical' | 'fire' | 'cold' | 'lightning' | 'chaos';
  min: number;
  max: number;
}

export interface ComputedItemStats {
  armour: number;
  evasion: number;
  energyShield: number;
  ward: number;
  life: number;
  mana: number;
  resistances: { fire: number; cold: number; lightning: number; chaos: number };
  maxResistances: { fire: number; cold: number; lightning: number };
  attributes: { str: number; dex: number; int: number };
  flatDamage: DamageRange[];
  increasedDamage: Record<string, number>;
  castSpeed: number;
  attackSpeed: number;
  criticalChance: number;
  criticalMultiplier: number;
  spellSuppression: number;
  blockChance: { attack: number; spell: number };
  lifeRegen: number;
  onBlockGain: number;
  movementSpeed: number;
  implicits: Modifier[];
  explicits: Modifier[];
  crafts: Modifier[];
}

export interface EquippedItem {
  slot: EquipmentSlot;
  identity: { name: string; baseType: string; rarity: ItemRarity };
  rawMods: Modifier[];
  computedStats: ComputedItemStats;
  sockets: SocketGroup[];
}

export interface ClusterJewelSummary {
  name: string;
  baseType: string;
  stats: Record<string, number>;
  socketIndex: number;
}

export interface PassiveTreeSnapshot {
  version: string;
  allocatedHashes: number[];
  masteryChoices: Record<number, string>;
  keystones: string[];
  clusterJewels: ClusterJewelSummary[];
  ascendancyNodes: string[];
}

export interface CharacterBase {
  class: string;
  ascendancy: string | null;
  level: number;
  bandits: 'oak' | 'kraityn' | 'aliya' | 'kill-all';
}

export interface ChargeState {
  frenzy: number;
  power: number;
  endurance: number;
}

export interface BuildConfig {
  isBoss: boolean;
  enemyResistances: number;
  charges: ChargeState;
  curses: string[];
  customMods: string[];
}

export interface SkillGem {
  name: string;
  level: number;
  quality: number;
  variant: 'regular' | 'anomalous' | 'divergent' | 'phantasmal';
}

export interface SkillSetup {
  id: string;
  activeGem: SkillGem;
  supportGems: SkillGem[];
  isEnabled: boolean;
}

export interface Build {
  game: 'poe1' | 'poe2';
  name: string;
  source: 'pob' | 'api' | 'manual';
  character: CharacterBase;
  passiveTree: PassiveTreeSnapshot;
  items: EquippedItem[];
  skills: SkillSetup[];
  config: BuildConfig;
}
```

- [ ] **Step 3: Write analysis.ts — AnalysisResult types**

Create `packages/shared/src/poe/analysis.ts`:

```ts
import type { EquipmentSlot } from './build';

export interface Problem {
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  category: string;
}

export interface Warning {
  message: string;
  category: string;
}

export interface LeechSummary {
  totalLeech: number;
  leechRate: number;
  duration: number;
}

export interface GuardSkillSummary {
  name: string;
  uptime: number;
  mitigation: number;
}

export interface SkillSummary {
  name: string;
  hitRate: number;
  averageHit: number;
  penetration: number;
}

export interface OffenseReport {
  mainSkill: SkillSummary;
  totalDps: number;
  bossDps: number;
  uberDps: number;
  damageBreakdown: { physical: number; fire: number; cold: number; lightning: number; chaos: number };
  penetration: number;
  resistanceReduction: number;
  critChance: number;
  critMultiplier: number;
  attackSpeed: number;
  isDotBuild: boolean;
  dotDps: number;
  witherStacks: number;
  shockEffect: number;
}

export interface DefenseReport {
  life: number;
  energyShield: number;
  combinedPool: number;
  resistances: {
    fire: { uncapped: number; capped: number; overcap: number };
    cold: { uncapped: number; capped: number; overcap: number };
    lightning: { uncapped: number; capped: number; overcap: number };
    chaos: { uncapped: number; capped: number; overcap: number };
  };
  maxResistances: { fire: number; cold: number; lightning: number };
  armour: number;
  physicalReduction: number;
  evasion: number;
  evadeChance: number;
  block: { attack: number; spell: number };
  spellSuppression: number;
  recovery: {
    lifeRegen: number;
    lifeRegenPercent: number;
    leech: LeechSummary;
    lifeOnHit: number;
    lifeOnBlock: number;
    energyShieldRecharge: number;
    esRechargeDelay: number;
    recoupPercent: number;
  };
  ehp: { physicalMaxHit: number; elementalMaxHit: number; chaosMaxHit: number };
  ailmentImmunity: Record<string, boolean>;
  guardSkill: GuardSkillSummary | null;
}

export interface UpgradeRecommendation {
  itemSlot: EquipmentSlot;
  currentScore: number;
  upgradePriority: number;
  targetStats: string[];
  estimatedBudgetLow: number;
  estimatedBudgetHigh: number;
  improvementPercent: number;
}

export interface ScalingReport {
  primaryScalar: string;
  secondaryScalars: string[];
  diminishingReturns: string[];
  gemLevelImpact: number;
  criticalScalingEfficiency: number;
}

export interface BuildScores {
  overall: number;
  offense: number;
  defense: number;
  sustain: number;
  mapping: number;
  bossing: number;
  leagueStart: number;
  scaling: number;
}

export interface BuildSummary {
  buildName: string;
  game: string;
  class: string;
  ascendancy: string;
  level: number;
  mainSkill: string;
}

export interface AnalysisMetadata {
  analyzerVersion: string;
  patchVersion: string;
  analyzedAt: number;
  buildHash: string;
}

export interface AnalysisContext {
  patch: string;
  enemy: { type: 'normal' | 'rare' | 'boss' | 'uber'; resistance: number };
  budget: 'league-start' | 'budget' | 'endgame';
}

export interface AnalysisResult {
  build: BuildSummary;
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

export interface DamageProfile {
  hits: { physical: number; fire: number; cold: number; lightning: number; chaos: number };
  ailments: { ignite: number; bleed: number; poison: number };
  final: { dps: number; bossDps: number };
}

export interface ScalingVector {
  category: 'gear' | 'passive' | 'gem' | 'jewel' | 'cluster';
  stat: string;
  currentValue: number;
  marginalGain: number;
  efficiency: number;
}
```
```

- [ ] **Step 4: Write adapters.ts — adapter types**

Create `packages/shared/src/poe/adapters.ts`:

```ts
export interface AdapterMetadata {
  source: string;
  fetchedAt: number;
  requestId?: string;
  version?: string;
  cached: boolean;
}

export interface AdapterSuccess<T> {
  ok: true;
  data: T;
  meta: AdapterMetadata;
}

export interface AdapterError {
  ok: false;
  error: string;
  retryAfter?: number;
}

export type AdapterResult<T> = AdapterSuccess<T> | AdapterError;
```

- [ ] **Step 5: Write economy.ts — economy types**

Create `packages/shared/src/poe/economy.ts`:

```ts
export interface ExchangeRatePoint {
  timestamp: number;
  rate: number;
}

export interface EconomySnapshot {
  league: string;
  currency: string;
  chaosEquivalent: number;
  divineEquivalent: number;
  change24h: number;
  listingCount: number;
  snapshotTime: number;
  history: ExchangeRatePoint[];
}

export interface EconomyDashboard {
  league: string;
  divinePrice: number;
  updatedAt: number;
  topMovers: { currency: string; change24h: number }[];
  snapshotCount: number;
}

export interface ItemValuation {
  league: string;
  itemName: string;
  itemType: string;
  chaosValue: number;
  confidence: 'high' | 'medium' | 'low';
  minPrice: number;
  medianPrice: number;
  maxPrice: number;
  listingCount: number;
  valuedAt: number;
}

export interface MetaBuild {
  game: string;
  league: string;
  name: string;
  class: string;
  ascendancy: string;
  mainSkill: string;
  popularity: number;
  budget: 'budget' | 'mid' | 'high' | 'mirror';
  pastebinUrl: string | null;
}

export interface LeagueInfo {
  game: string;
  leagueId: string;
  leagueName: string;
  isCurrent: boolean;
  isHardcore: boolean;
  isSsf: boolean;
  startDate: number;
  endDate: number | null;
}
```

- [ ] **Step 6: Write ai.ts — AI types**

Create `packages/shared/src/poe/ai.ts`:

```ts
import type { Problem, UpgradeRecommendation, BuildSummary } from './analysis';
import type { MetaBuild } from './economy';

export interface AiCapabilities {
  supportsStreaming: boolean;
  supportsTools: boolean;
  contextWindow: number;
  supportsJson: boolean;
}

export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiResponse {
  text: string;
  usage: { promptTokens: number; completionTokens: number };
  model: string;
}

export interface TestResult {
  success: boolean;
  latencyMs: number;
  model: string;
  error?: string;
}

export interface AiProviderConfig {
  id: 'deepseek' | 'openai' | 'claude' | 'local';
  name: string;
  requiresApiKey: boolean;
  defaultEndpoint: string;
  models: string[];
}

export interface AiBuildReviewInput {
  summary: BuildSummary;
  problems: Problem[];
  upgrades: UpgradeRecommendation[];
  keyStats: {
    dps: number;
    ehp: number;
    resistances: Record<string, number>;
  };
  metaContext?: { popularBuilds: MetaBuild[]; ascendancyTier: string };
  budgetTier: 'budget' | 'mid' | 'high' | 'mirror';
}

export interface AiReviewResult {
  text: string;
  provider: string;
  model: string;
  tokensUsed: number;
  mode: 'ai' | 'local-fallback';
}
```

- [ ] **Step 7: Write barrel index**

Create `packages/shared/src/poe/index.ts`:

```ts
export * from './build';
export * from './analysis';
export * from './adapters';
export * from './economy';
export * from './ai';
```

- [ ] **Step 8: Update shared package index**

Modify `packages/shared/src/index.ts` — add at the end:

```ts
export * from './poe';
```

- [ ] **Step 9: Commit**

```bash
git add packages/shared/src/poe/ packages/shared/src/index.ts
git commit -m "feat(shared): add PoE domain types (build, analysis, adapters, economy, ai)"
```

---

### Task 3: Create repository classes

**Files:**
- Create: `apps/client/src/main/database/poe/repositories/builds.repo.ts`
- Create: `apps/client/src/main/database/poe/repositories/analyses.repo.ts`
- Create: `apps/client/src/main/database/poe/repositories/currency.repo.ts`
- Create: `apps/client/src/main/database/poe/repositories/market.repo.ts`
- Create: `apps/client/src/main/database/poe/repositories/items.repo.ts`
- Create: `apps/client/src/main/database/poe/repositories/meta.repo.ts`
- Create: `apps/client/src/main/database/poe/repositories/trade-cache.repo.ts`
- Create: `apps/client/src/main/database/poe/repositories/ai.repo.ts`

**Interfaces:**
- Consumes: `PoeDb` from `database/poe/index.ts`, shared types from `@helper/shared`
- Produces: Typed repository functions for CRUD + query operations

- [ ] **Step 1: Write builds.repo.ts**

Create `apps/client/src/main/database/poe/repositories/builds.repo.ts`:

```ts
import { eq } from 'drizzle-orm';
import type { PoeDb } from '../index';
import { schema } from '../index';

export function findBuildByHash(db: PoeDb, buildHash: string) {
  return db.select().from(schema.poeBuilds).where(eq(schema.poeBuilds.buildHash, buildHash)).get();
}

export function insertBuild(db: PoeDb, data: typeof schema.poeBuilds.$inferInsert) {
  return db.insert(schema.poeBuilds).values(data).returning().get();
}

export function listBuilds(db: PoeDb, limit = 50) {
  return db.select().from(schema.poeBuilds).orderBy(schema.poeBuilds.createdAt).limit(limit).all();
}

export function deleteBuild(db: PoeDb, buildHash: string) {
  return db.delete(schema.poeBuilds).where(eq(schema.poeBuilds.buildHash, buildHash)).run();
}
```

- [ ] **Step 2: Write analyses.repo.ts**

Create `apps/client/src/main/database/poe/repositories/analyses.repo.ts`:

```ts
import { eq, desc } from 'drizzle-orm';
import type { PoeDb } from '../index';
import { schema } from '../index';

export function findAnalysesByHash(db: PoeDb, buildHash: string) {
  return db.select().from(schema.poeBuildAnalyses).where(eq(schema.poeBuildAnalyses.buildHash, buildHash)).orderBy(desc(schema.poeBuildAnalyses.createdAt)).all();
}

export function findLatestAnalysis(db: PoeDb, buildHash: string) {
  return db.select().from(schema.poeBuildAnalyses).where(eq(schema.poeBuildAnalyses.buildHash, buildHash)).orderBy(desc(schema.poeBuildAnalyses.createdAt)).limit(1).get();
}

export function insertAnalysis(db: PoeDb, data: typeof schema.poeBuildAnalyses.$inferInsert) {
  return db.insert(schema.poeBuildAnalyses).values(data).returning().get();
}

export function findAnalysisById(db: PoeDb, id: number) {
  return db.select().from(schema.poeBuildAnalyses).where(eq(schema.poeBuildAnalyses.id, id)).get();
}

export function deleteAnalysesForBuild(db: PoeDb, buildHash: string) {
  return db.delete(schema.poeBuildAnalyses).where(eq(schema.poeBuildAnalyses.buildHash, buildHash)).run();
}

export function listRecentAnalyses(db: PoeDb, limit = 20) {
  return db.select().from(schema.poeBuildAnalyses).orderBy(desc(schema.poeBuildAnalyses.createdAt)).limit(limit).all();
}
```

- [ ] **Step 3: Write currency.repo.ts**

Create `apps/client/src/main/database/poe/repositories/currency.repo.ts`:

```ts
import { eq, and, desc, gte } from 'drizzle-orm';
import type { PoeDb } from '../index';
import { schema } from '../index';

export function findCurrencySnapshots(db: PoeDb, league: string, currencyType: string, since: number) {
  return db.select().from(schema.poeCurrencySnapshots)
    .where(and(
      eq(schema.poeCurrencySnapshots.league, league),
      eq(schema.poeCurrencySnapshots.currencyType, currencyType),
      gte(schema.poeCurrencySnapshots.snapshotTime, since),
    ))
    .orderBy(desc(schema.poeCurrencySnapshots.snapshotTime))
    .all();
}

export function findLatestCurrencySnapshot(db: PoeDb, league: string, currencyType: string) {
  return db.select().from(schema.poeCurrencySnapshots)
    .where(and(eq(schema.poeCurrencySnapshots.league, league), eq(schema.poeCurrencySnapshots.currencyType, currencyType)))
    .orderBy(desc(schema.poeCurrencySnapshots.snapshotTime))
    .limit(1)
    .get();
}

export function insertCurrencySnapshot(db: PoeDb, data: typeof schema.poeCurrencySnapshots.$inferInsert) {
  return db.insert(schema.poeCurrencySnapshots).values(data).returning().get();
}

export function purgeOldCurrencySnapshots(db: PoeDb, before: number) {
  return db.delete(schema.poeCurrencySnapshots).where(schema.poeCurrencySnapshots.snapshotTime.lt(before)).run();
}

export function findEconomicEvents(db: PoeDb, league: string, limit = 20) {
  return db.select().from(schema.poeEconomicEvents)
    .where(eq(schema.poeEconomicEvents.league, league))
    .orderBy(desc(schema.poeEconomicEvents.occurredAt))
    .limit(limit)
    .all();
}

export function insertEconomicEvent(db: PoeDb, data: typeof schema.poeEconomicEvents.$inferInsert) {
  return db.insert(schema.poeEconomicEvents).values(data).returning().get();
}
```

- [ ] **Step 4: Write market.repo.ts**

Create `apps/client/src/main/database/poe/repositories/market.repo.ts`:

```ts
import { eq, and, desc, gte } from 'drizzle-orm';
import type { PoeDb } from '../index';
import { schema } from '../index';

export function findMarketSnapshots(db: PoeDb, league: string, itemName: string, since: number) {
  return db.select().from(schema.poeMarketSnapshots)
    .where(and(eq(schema.poeMarketSnapshots.league, league), eq(schema.poeMarketSnapshots.itemName, itemName), gte(schema.poeMarketSnapshots.snapshotTime, since)))
    .orderBy(desc(schema.poeMarketSnapshots.snapshotTime))
    .all();
}

export function insertMarketSnapshot(db: PoeDb, data: typeof schema.poeMarketSnapshots.$inferInsert) {
  return db.insert(schema.poeMarketSnapshots).values(data).returning().get();
}

export function insertItemValuation(db: PoeDb, data: typeof schema.poeItemValuations.$inferInsert) {
  return db.insert(schema.poeItemValuations).values(data).returning().get();
}

export function findLatestItemValuation(db: PoeDb, league: string, itemHash: string) {
  return db.select().from(schema.poeItemValuations)
    .where(and(eq(schema.poeItemValuations.league, league), eq(schema.poeItemValuations.itemHash, itemHash)))
    .orderBy(desc(schema.poeItemValuations.valuedAt))
    .limit(1)
    .get();
}
```

- [ ] **Step 5: Write items.repo.ts**

Create `apps/client/src/main/database/poe/repositories/items.repo.ts`:

```ts
import { eq, and } from 'drizzle-orm';
import type { PoeDb } from '../index';
import { schema } from '../index';

export function findItemByName(db: PoeDb, game: string, name: string) {
  return db.select().from(schema.poeItems).where(and(eq(schema.poeItems.game, game), eq(schema.poeItems.name, name))).get();
}

export function upsertItem(db: PoeDb, data: typeof schema.poeItems.$inferInsert) {
  const existing = findItemByName(db, data.game, data.name);
  if (existing) {
    return db.update(schema.poeItems).set({ ...data, id: existing.id }).where(eq(schema.poeItems.id, existing.id)).returning().get();
  }
  return db.insert(schema.poeItems).values(data).returning().get();
}

export function findSkillByNameType(db: PoeDb, game: string, name: string, type: string) {
  return db.select().from(schema.poeSkills).where(and(eq(schema.poeSkills.game, game), eq(schema.poeSkills.name, name), eq(schema.poeSkills.type, type))).get();
}

export function upsertSkill(db: PoeDb, data: typeof schema.poeSkills.$inferInsert) {
  const existing = findSkillByNameType(db, data.game, data.name, data.type);
  if (existing) {
    return db.update(schema.poeSkills).set({ ...data, id: existing.id }).where(eq(schema.poeSkills.id, existing.id)).returning().get();
  }
  return db.insert(schema.poeSkills).values(data).returning().get();
}

export function listLeagues(db: PoeDb, game: string) {
  return db.select().from(schema.poeLeagueInfo).where(eq(schema.poeLeagueInfo.game, game)).all();
}

export function getCurrentLeague(db: PoeDb, game: string) {
  return db.select().from(schema.poeLeagueInfo).where(and(eq(schema.poeLeagueInfo.game, game), eq(schema.poeLeagueInfo.isCurrent, true))).get();
}

export function upsertLeague(db: PoeDb, data: typeof schema.poeLeagueInfo.$inferInsert) {
  const existing = db.select().from(schema.poeLeagueInfo).where(eq(schema.poeLeagueInfo.leagueId, data.leagueId)).get();
  if (existing) {
    return db.update(schema.poeLeagueInfo).set({ ...data, id: existing.id }).where(eq(schema.poeLeagueInfo.id, existing.id)).returning().get();
  }
  return db.insert(schema.poeLeagueInfo).values(data).returning().get();
}
```

- [ ] **Step 6: Write meta.repo.ts**

Create `apps/client/src/main/database/poe/repositories/meta.repo.ts`:

```ts
import { eq, and } from 'drizzle-orm';
import type { PoeDb } from '../index';
import { schema } from '../index';

export function listMetaBuilds(db: PoeDb, game: string, league: string) {
  return db.select().from(schema.poeMetaBuilds).where(and(eq(schema.poeMetaBuilds.game, game), eq(schema.poeMetaBuilds.league, league))).all();
}

export function upsertMetaBuild(db: PoeDb, data: typeof schema.poeMetaBuilds.$inferInsert) {
  const existing = db.select().from(schema.poeMetaBuilds)
    .where(and(eq(schema.poeMetaBuilds.game, data.game), eq(schema.poeMetaBuilds.league, data.league), eq(schema.poeMetaBuilds.name, data.name)))
    .get();
  if (existing) {
    return db.update(schema.poeMetaBuilds).set({ ...data, id: existing.id }).where(eq(schema.poeMetaBuilds.id, existing.id)).returning().get();
  }
  return db.insert(schema.poeMetaBuilds).values(data).returning().get();
}

export function replaceMetaBuildsForLeague(db: PoeDb, game: string, league: string) {
  return db.delete(schema.poeMetaBuilds).where(and(eq(schema.poeMetaBuilds.game, game), eq(schema.poeMetaBuilds.league, league))).run();
}

export function listCraftingMethods(db: PoeDb, game: string) {
  return db.select().from(schema.poeCraftingMethods).where(eq(schema.poeCraftingMethods.game, game)).all();
}

export function upsertCraftingMethod(db: PoeDb, data: typeof schema.poeCraftingMethods.$inferInsert) {
  const existing = db.select().from(schema.poeCraftingMethods)
    .where(and(eq(schema.poeCraftingMethods.game, data.game), eq(schema.poeCraftingMethods.methodName, data.methodName)))
    .get();
  if (existing) {
    return db.update(schema.poeCraftingMethods).set({ ...data, id: existing.id }).where(eq(schema.poeCraftingMethods.id, existing.id)).returning().get();
  }
  return db.insert(schema.poeCraftingMethods).values(data).returning().get();
}
```

- [ ] **Step 7: Write trade-cache.repo.ts**

Create `apps/client/src/main/database/poe/repositories/trade-cache.repo.ts`:

```ts
import { eq, lt } from 'drizzle-orm';
import type { PoeDb } from '../index';
import { schema } from '../index';

export function findTradeCacheByHash(db: PoeDb, queryHash: string) {
  return db.select().from(schema.poeTradeSearchCache).where(eq(schema.poeTradeSearchCache.queryHash, queryHash)).get();
}

export function insertTradeCache(db: PoeDb, data: typeof schema.poeTradeSearchCache.$inferInsert) {
  return db.insert(schema.poeTradeSearchCache).values(data).returning().get();
}

export function purgeExpiredTradeCache(db: PoeDb) {
  return db.delete(schema.poeTradeSearchCache).where(lt(schema.poeTradeSearchCache.expiresAt, Date.now())).run();
}
```

- [ ] **Step 8: Write ai.repo.ts**

Create `apps/client/src/main/database/poe/repositories/ai.repo.ts`:

```ts
import { eq } from 'drizzle-orm';
import type { PoeDb } from '../index';
import { schema } from '../index';

export function getActiveProvider(db: PoeDb) {
  return db.select().from(schema.poeAiProviderSettings).where(eq(schema.poeAiProviderSettings.enabled, true)).get();
}

export function upsertProvider(db: PoeDb, data: typeof schema.poeAiProviderSettings.$inferInsert) {
  return db.insert(schema.poeAiProviderSettings).values(data).onConflictDoUpdate({
    target: schema.poeAiProviderSettings.provider,
    set: { model: data.model, endpoint: data.endpoint, enabled: data.enabled, updatedAt: data.updatedAt },
  }).returning().get();
}

export function disableAllProviders(db: PoeDb) {
  return db.update(schema.poeAiProviderSettings).set({ enabled: false, updatedAt: Date.now() }).run();
}

export function insertAiRequest(db: PoeDb, data: typeof schema.poeAiRequests.$inferInsert) {
  return db.insert(schema.poeAiRequests).values(data).returning().get();
}

export function listAiRequests(db: PoeDb, buildAnalysisId: number, limit = 10) {
  return db.select().from(schema.poeAiRequests).where(eq(schema.poeAiRequests.buildAnalysisId, buildAnalysisId)).orderBy(schema.poeAiRequests.createdAt).limit(limit).all();
}
```

- [ ] **Step 9: Create repositories barrel index**

Create `apps/client/src/main/database/poe/repositories/index.ts`:

```ts
export * as buildsRepo from './builds.repo';
export * as analysesRepo from './analyses.repo';
export * as currencyRepo from './currency.repo';
export * as marketRepo from './market.repo';
export * as itemsRepo from './items.repo';
export * as metaRepo from './meta.repo';
export * as tradeCacheRepo from './trade-cache.repo';
export * as aiRepo from './ai.repo';
```

- [ ] **Step 10: Commit**

```bash
git add apps/client/src/main/database/poe/repositories/
git commit -m "feat(poe): add 8 repository classes for PoE DB tables"
```

---

### Task 4: Create PoE module DI container

**Files:**
- Create: `apps/client/src/main/poe/poe-module.ts`

**Interfaces:**
- Consumes: All repos, `PoeDb`
- Produces: `PoeModule` class — single entry point for PoE subsystem

- [ ] **Step 1: Write PoeModule**

Create `apps/client/src/main/poe/poe-module.ts`:

```ts
import { initPoeDb, getPoeDb, type PoeDb } from '../database/poe/index';
import * as repos from '../database/poe/repositories/index';

export class PoeModule {
  readonly db: PoeDb;
  readonly repos = repos;

  constructor() {
    this.db = initPoeDb();
  }

  static getDb(): PoeDb {
    return getPoeDb();
  }
}

let poeModule: PoeModule | null = null;

export function initPoeModule(): PoeModule {
  if (!poeModule) {
    poeModule = new PoeModule();
  }
  return poeModule;
}

export function getPoeModule(): PoeModule {
  if (!poeModule) {
    return initPoeModule();
  }
  return poeModule;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/client/src/main/poe/poe-module.ts
git commit -m "feat(poe): add PoeModule DI container"
```

---

### Task 5: Wire PoE module into main process initialization

**Files:**
- Modify: `apps/client/src/main/index.ts`

**Interfaces:**
- Consumes: `initPoeModule` from `poe/poe-module`
- Produces: PoE DB initialized on app startup

- [ ] **Step 1: Read existing main entry**

Read `apps/client/src/main/index.ts` to find the initialization spot.

- [ ] **Step 2: Add PoE module initialization**

After the existing initialization code (after `app.whenReady()`), add:

```ts
import { initPoeModule } from './poe/poe-module';

app.whenReady().then(() => {
  // ... existing initialization ...
  initPoeModule();
});
```

If `app.whenReady()` already exists, add `initPoeModule()` call inside it. If not, add:
```ts
import { initPoeModule } from './poe/poe-module';

app.on('ready', () => {
  initPoeModule();
});
```

- [ ] **Step 3: Run typecheck**

```bash
cd apps/client
npx tsc --noEmit -p tsconfig.node.json
```

Expected: zero errors. Fix any import or type issues.

- [ ] **Step 4: Commit**

```bash
git add apps/client/src/main/index.ts
git commit -m "feat(poe): wire PoeModule initialization into main process"
```

---

### Task 6: Full workspace typecheck + database smoke test

**Files:**
- (no new files — verification only)

- [ ] **Step 1: Run workspace typecheck**

```bash
cd D:\repos\ElectronHelper
pnpm typecheck
```

Expected: all 4 packages pass.

- [ ] **Step 2: Smoke test DB creation**

Add a temporary test in `apps/client/src/main/index.ts` after `initPoeModule()`:

```ts
const mod = getPoeModule();
const leagues = mod.repos.itemsRepo.listLeagues(mod.db, 'poe1');
console.log('PoE DB smoke test — leagues:', leagues.length);
```

Run `pnpm dev` from workspace root. Expected: no errors, console shows `leagues: 0`.

- [ ] **Step 3: Remove smoke test code**

```bash
git checkout apps/client/src/main/index.ts
```

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore(poe): verify full typecheck passes, Phase 0 foundation complete"
```

---

## Verification Checklist

- [ ] `pnpm typecheck` passes with zero errors across all 4 packages
- [ ] All 13 tables defined in `schema.ts` with correct types
- [ ] All 8 repository files exist with CRUD operations
- [ ] Shared types barrel exports work (`packages/shared/src/poe/index.ts`)
- [ ] `PoeModule` initializes without errors in Electron context
- [ ] `poe-analyzer.db` created in `userData` directory on first run
- [ ] No native module errors from `better-sqlite3`
- [ ] No secrets, keys, or tokens in any committed file
- [ ] Existing features (notes, presets, sidebar, API) unaffected
