# Phase 3 — Build Intelligence Layer

**Status**: IMPLEMENTING (Phase 3a)  
**Package**: `@helper/client` → `src/main/poe/core/`  
**Prerequisites**: Phase 1 (Core Engine), Phase 2 (Data Layer) — both COMPLETE

---

## Objective

Transform an imported PoB XML build into a fully resolved model for analysis. Replace all current approximations/hardcoded values with real, computed data from item text parsing, gem skill data, and passive tree resolution.

---

## Architecture Rules (MANDATORY)

### R1: PoB Parsing Boundary

Parsers decode. Factory constructs. They are separate concerns.

```
PoB export (XML/pastebin)
    │
    ▼
core/pob/ (parsers)          ← decode only, no domain types
    │
    ▼
PoB Intermediate DTOs        ← structured but not domain objects
    │
    ▼
core/factory/ (BuildFactory)  ← domain construction ONLY here
    │
    ▼
Domain Build                  ← the canonical Build type
```

**Parsers never create**: `Build`, `EquippedItem`, `SkillSetup`, `Modifier`, `ComputedItemStats`

**Parsers only produce intermediate DTOs**: `ParsedItem`, `ParsedSkillSetup`, `ParsedTree`, `ParsedConfig`

**Factory owns domain construction** — it maps intermediate DTOs → domain types.

### R2: Item Modifier Model

Modifiers are structured objects, never raw strings.

```typescript
// core/items/modifier.model.ts
interface ModifierModel {
  id: string;                    // unique ID for traceability
  text: string;                  // raw mod text (e.g. "+99 to maximum life")
  category: ModCategory;        // 'life' | 'resist' | 'damage' | 'attribute' | 'defense' | 'speed' | 'critical' | 'other'
  tags: string[];               // 'skill', 'attack', 'caster', 'physical', etc.
  values: ModifierValue[];      // parsed values with units
  source: ModSource;            // { slot: 'helmet', domain: 'explicit' }
  weight?: number;              // mod weight (for crafting analysis, future)
}

interface ModifierValue {
  type: 'flat' | 'percent' | 'range';
  numberValue: number;          // parsed numeric value (e.g. 99)
  min?: number;                 // range min (e.g. 12 for "12 to 24")
  max?: number;                 // range max
  unit?: string;                // 'life', 'mana', 'damage', null for percent
}

type ModCategory =
  | 'life' | 'mana' | 'energyShield' | 'armour' | 'evasion' | 'ward'
  | 'resist' | 'attribute' | 'flatDamage' | 'increasedDamage'
  | 'attackSpeed' | 'castSpeed' | 'movementSpeed'
  | 'critical' | 'block' | 'suppression' | 'regen' | 'leech' | 'other';

interface ModSource {
  itemSlot: string;             // 'helmet', 'weapon', 'ring 1', etc.
  domain: ModDomain;            // explicit | implicit | crafted | enchant | fractured
  influence?: InfluenceType;
}

type ModDomain = 'implicit' | 'explicit' | 'crafted' | 'enchant' | 'fractured' | 'corrupted' | 'scourge' | 'veiled' | 'synthesised';
```

### R3: Stat Aggregation Pipeline

No `items + tree + skills = one object mutation`. Use a traceable pipeline.

```
ModifierSource[]                ← items, tree, gems, auras, character base
    │
    ▼
ModifierResolver                ← classifies each modifier, resolves text → stat entry
    │
    ▼
StatAccumulator                 ← sums, stacks, caps, applies multipliers
    │
    ▼
ResolvedBuildStats              ← array of stat entries, each with source trace
```

Every stat entry is traceable:

```typescript
interface StatEntry {
  stat: string;                  // 'life', 'fireResistance', 'physicalDamage', etc.
  value: number;
  source: string;                // 'helmet', 'passiveTree', 'determinationAura', etc.
  modifier: string;              // original mod text or node name
  category: 'flat' | 'increased' | 'more' | 'less' | 'conversion' | 'override';
}
```

**Why traceable**: AI explanation layer (Phase 5) needs to say "your helmet provides +120 maximum life (3x T1 life mods)" — not just "total life: 4500".

### R4: Calculator Separation

Calculators are pure functions from `ResolvedBuildStats` to a report. No mixing.

```typescript
// damage.calculator.ts
function calculateDamage(stats: ResolvedBuildStats): DamageReport;

// defense.calculator.ts
function calculateDefense(stats: ResolvedBuildStats): DefenseReport;
```

Calculators do NOT: parse items, resolve tree, classify mods, determine slot assignments, fetch data, or compute scores.

Scoring belongs in the engine (existing `computeScores`). Rules consume `DamageReport` + `DefenseReport`.

### R5: Version Compatibility

PoB format changes between leagues. Supported versions declared explicitly.

```typescript
// core/pob/version/version.detector.ts
type PoBVersion = '3.25' | '3.26' | 'unknown';

interface VersionCapabilities {
  version: PoBVersion;
  supportsClusterJewels: boolean;
  supportsPassiveMasteries: boolean;
  supportsEldritchImplicits: boolean;
  supportsTimelessJewels: boolean;
  supportsTinctures: boolean;        // 3.25 Settlers mechanic
  hasTransfiguredGems: boolean;      // 3.23 Affliction onwards
  gemQualityVariant: boolean;
  itemInfluence: boolean;
}

const SUPPORTED_VERSIONS: Record<PoBVersion, VersionCapabilities>;

function detectVersion(dto: PoBXmlDTO): PoBVersion;
function getCapabilities(version: PoBVersion): VersionCapabilities;
function isSupported(version: PoBVersion): boolean;
```

Unknown versions: parsers return `RecoveryResult` with warnings, no crash. Domain construction proceeds with `version: 'unknown'` and minimal capability flags (`all false`).

### R6: Testing Strategy — Every Layer Tested

| Layer | Test file | Input | Output | Tests |
|-------|----------|-------|--------|-------|
| PoB XML Parser | `parsers/__tests__/` | XML string | `PoBXmlDTO` | 6 (existing) |
| Version Detector | `pob/__tests__/version.detector.test.ts` | `PoBXmlDTO` | `PoBVersion` | 4 |
| Item Parser | `pob/__tests__/item.parser.test.ts` | `PoBItem` | `ParsedItemDto` | 8 |
| Gem Parser | `pob/__tests__/gem.parser.test.ts` | `PoBSkillSet[]` | `ParsedSkillSetupDto[]` | 6 |
| Tree Parser | `pob/__tests__/tree.parser.test.ts` | `PoBTree` | `ParsedTreeDto` | 5 |
| Config Parser | `pob/__tests__/config.parser.test.ts` | `PoBConfig` | `ParsedConfigDto` | 5 |
| Mod Model | `items/__tests__/modifier.model.test.ts` | mod text | `ModifierModel` | 8 |
| Mod Resolver | `items/__tests__/mod.resolver.test.ts` | `ModifierModel[]` | `StatEntry[]` | 8 |
| Stat Accumulator | `stats/__tests__/stat.accumulator.test.ts` | `StatEntry[]` | `ResolvedBuildStats` | 6 |
| Damage Calc | `calculators/__tests__/damage.calculator.test.ts` | `ResolvedBuildStats` | `DamageReport` | 6 |
| Defense Calc | `calculators/__tests__/defense.calculator.test.ts` | `ResolvedBuildStats` | `DefenseReport` | 6 |
| Integration | `core/__tests__/pob-import.integration.test.ts` | PoB XML | `AnalysisResult` | 6 (expanded) |

No test tests two layers at once except integration tests.

### R7: Incremental Implementation — Gate on Green

Each sub-phase must pass `typecheck + tests` before the next begins.

---

## Phase 3a — PoB Compatibility Foundation

**Status**: IN PROGRESS  
**Scope**: DTO contracts, version detector, parser foundation, real fixtures  
**Gate**: `pnpm typecheck && vitest run` — all green

### 3a Deliverables

| # | File | Purpose |
|---|------|---------|
| 1 | `core/pob/dto/version.dto.ts` | `PoBVersion`, `VersionCapabilities`, `SUPPORTED_VERSIONS` |
| 2 | `core/pob/dto/item.dto.ts` | `ParsedItemDto` — intermediate between PoBItem and EquippedItem |
| 3 | `core/pob/dto/gem.dto.ts` | `ParsedSkillSetupDto`, `ParsedActiveGemDto`, `ParsedSupportGemDto` |
| 4 | `core/pob/dto/tree.dto.ts` | `ParsedTreeDto` — intermediate between PoBTree and PassiveTreeSnapshot |
| 5 | `core/pob/dto/config.dto.ts` | `ParsedConfigDto` — intermediate between PoBConfig and BuildConfig |
| 6 | `core/pob/dto/index.ts` | Barrel re-export |
| 7 | `core/pob/version/version.detector.ts` | `detectVersion()`, `getCapabilities()`, `isSupported()` |
| 8 | `core/pob/item.parser.ts` | `parsePoBItems(PoBItem[]) → ParsedItemDto[]` |
| 9 | `core/pob/gem.parser.ts` | `parsePoBSkills(PoBSkillSet[]) → ParsedSkillSetupDto[]` |
| 10 | `core/pob/tree.parser.ts` | `parsePoBTree(PoBTree) → ParsedTreeDto` |
| 11 | `core/pob/config.parser.ts` | `parsePoBConfig(PoBConfig) → ParsedConfigDto` |
| 12 | `core/pob/index.ts` | Barrel re-export (parsers + version + DTOs) |
| 13 | `core/__tests__/fixtures/boneshatter-3.25.xml` | Real PoB export fixture |
| 14 | `core/__tests__/fixtures/firetrap-3.25.xml` | Real PoB export fixture |
| 15 | `core/pob/__tests__/version.detector.test.ts` | 4+ tests |
| 16 | `core/pob/__tests__/item.parser.test.ts` | 8+ tests (real XML) |
| 17 | `core/pob/__tests__/gem.parser.test.ts` | 6+ tests (real XML) |
| 18 | `core/pob/__tests__/tree.parser.test.ts` | 4+ tests (real XML) |
| 19 | `core/pob/__tests__/config.parser.test.ts` | 4+ tests (real XML) |

### 3a DTO Contracts

```typescript
// ===== core/pob/dto/version.dto.ts =====
type PoBVersion = '3.25' | '3.26' | 'unknown';

interface VersionCapabilities {
  version: PoBVersion;
  supportsClusterJewels: boolean;
  supportsPassiveMasteries: boolean;
  supportsEldritchImplicits: boolean;
  supportsTimelessJewels: boolean;
  supportsTinctures: boolean;
  hasTransfiguredGems: boolean;
  gemQualityVariant: boolean;
  itemInfluence: boolean;
}

// ===== core/pob/dto/item.dto.ts =====
interface ParsedItemDto {
  id: string;
  baseType: string;
  rarity: ItemRarity;
  influence: InfluenceType | null;
  isFractured: boolean;
  isSynthesised: boolean;
  isCorrupted: boolean;
  quality: number;
  sockets: SocketGroup[];
  implicitMods: RawModDto[];
  explicitMods: RawModDto[];
  craftedMods: RawModDto[];
  enchantMods: RawModDto[];
  fracturedMods: RawModDto[];
  corruptedMods: RawModDto[];
}

interface RawModDto {
  text: string;
  implicit: boolean;
  explicit: boolean;
  crafted: boolean;
}

// ===== core/pob/dto/gem.dto.ts =====
interface ParsedSkillSetupDto {
  id: number;
  slot: string;                    // socketed item slot name
  activeGem: ParsedActiveGemDto;
  supportGems: ParsedSupportGemDto[];
}

interface ParsedActiveGemDto {
  name: string;
  level: number;
  quality: number;
  variant: GemQualityVariant;
  isVaal: boolean;
  isAwakened: boolean;
}

interface ParsedSupportGemDto {
  name: string;
  level: number;
  quality: number;
  variant: GemQualityVariant;
  isAwakened: boolean;
}

type GemQualityVariant = 'regular' | 'anomalous' | 'divergent' | 'phantasmal';

// ===== core/pob/dto/tree.dto.ts =====
interface ParsedTreeDto {
  version: string;
  allocatedNodes: number[];
  masteryChoices: Record<number, string>;
  keystones: string[];
  ascendancyNodes: string[];
}

// ===== core/pob/dto/config.dto.ts =====
interface ParsedConfigDto {
  isBoss: boolean;
  enemyResistances: number;
  charges: { frenzy: number; power: number; endurance: number };
  isGuardian: boolean;
  isUber: boolean;
}
```

### 3a Parser Functions

```typescript
// item.parser.ts
function parsePoBItems(items: PoBItem[]): ParsedItemDto[];
// Reads PoBItem.rawMods → classifies into implicit/explicit/crafted groups
// Detects influence from item text ("Shaper Item", "Elder Item")
// Maps sockets to SocketGroup[] format

// gem.parser.ts
function parsePoBSkills(skillSets: PoBSkillSet[]): ParsedSkillSetupDto[];
// Identifies active gem (PoBSkill.active === true)
// Separates support gems
// Detects Vaal prefix ("Vaal " in name)
// Detects Awakened prefix ("Awakened " in name)

// tree.parser.ts
function parsePoBTree(tree: PoBTree): ParsedTreeDto;
// Direct mapping with validation (non-empty nodes array)

// config.parser.ts
function parsePoBConfig(config: PoBConfig): ParsedConfigDto;
// Maps existing config + derives isGuardian/isUber from context
```

---

## Phase 3b — Item Intelligence

**Status**: PLANNING  
**Depends on**: Phase 3a green

### 3b Deliverables

| File | Purpose |
|------|---------|
| `core/items/modifier.model.ts` | `ModifierModel`, `ModifierValue`, `ModCategory`, `ModSource` types |
| `core/items/mod.range.parser.ts` | `parseModRange(text) → ModifierValue[]` — replaces broken `parseModText()` |
| `core/items/mod.classifier.ts` | `classifyMod(text) → ModCategory` — 40+ pattern registry |
| `core/items/mod.factory.ts` | `createModifier(rawMod, source) → ModifierModel` — raw text → structured model |
| `core/items/item.mods.ts` | `extractItemMods(parsedItem) → ModifierModel[]` — all mods from one item |
| `core/items/__tests__/modifier.model.test.ts` | 8 tests |
| `core/items/__tests__/mod.resolver.test.ts` | 8 tests |

---

## Phase 3c — Skill Resolver

**Status**: PLANNING  
**Depends on**: Phase 3a green

### 3c Deliverables

| File | Purpose |
|------|---------|
| `core/skills/gem.tag.resolver.ts` | `classifySkillTags(tags[]) → SkillClassification` |
| `core/skills/conversion.resolver.ts` | `resolveConversionChain(skill, items, tree) → ConversionChain` |
| `core/skills/active.gem.resolver.ts` | `resolveActiveGem(parsed, gemData) → GemSkillData` |
| `core/skills/support.gem.resolver.ts` | `resolveSupportGems(supports, gemData) → SupportGemEffect[]` |
| `core/skills/quality.resolver.ts` | `resolveQualityEffects(gemId, quality, variant, level) → Record<string, number>` |
| `core/skills/__tests__/active.gem.resolver.test.ts` | 5 tests |
| `core/skills/__tests__/support.gem.resolver.test.ts` | 5 tests |
| `core/skills/__tests__/conversion.resolver.test.ts` | 6 tests |

---

## Phase 3d — Passive Tree Resolver

**Status**: PLANNING  
**Depends on**: Phase 3a green

### 3d Deliverables

| File | Purpose |
|------|---------|
| `core/tree/keystone.resolver.ts` | `KEYSTONE_EFFECTS` registry + `resolveKeystoneEffect(name)` |
| `core/tree/node.resolver.ts` | `resolveAllocatedStats(nodes[], treeData) → StatEntry[]` |
| `core/tree/mastery.resolver.ts` | `resolveMasteryEffects(choices, treeData) → StatEntry[]` |
| `core/tree/ascendancy.resolver.ts` | `resolveAscendancyStats(nodes[], treeData) → StatEntry[]` |
| `core/tree/__tests__/node.resolver.test.ts` | 4 tests |
| `core/tree/__tests__/keystone.resolver.test.ts` | 5 tests |

---

## Phase 3e — Stat Aggregation

**Status**: PLANNING  
**Depends on**: Phase 3b, 3c, 3d

### 3e Deliverables

| File | Purpose |
|------|---------|
| `core/stats/mod.resolver.ts` | `resolveModifiers(ModifierModel[]) → StatEntry[]` — classify + measure |
| `core/stats/stat.accumulator.ts` | `accumulate(StatEntry[]) → ResolvedBuildStats` — sum/stack/cap |
| `core/stats/local.vs.global.ts` | `isLocalMod(mod, slot) → boolean` |
| `core/stats/conditional.evaluator.ts` | `evaluateConditions(entries, config) → StatEntry[]` |
| `core/stats/types.ts` | `StatEntry`, `ResolvedBuildStats` |
| `core/stats/__tests__/stat.accumulator.test.ts` | 6 tests |
| `core/stats/__tests__/local.vs.global.test.ts` | 6 tests |

```typescript
// core/stats/types.ts
interface StatEntry {
  stat: string;
  value: number;
  source: string;              // 'helmet', 'tree_node_12345', 'hatred_aura'
  modifier: string;            // original text
  category: 'flat' | 'increased' | 'more' | 'less' | 'conversion' | 'override';
}

interface ResolvedBuildStats {
  version: string;             // for cache invalidation
  entries: StatEntry[];
  totals: Record<string, number>;
  uncappedResistances: { fire: number; cold: number; lightning: number; chaos: number };
  life: { base: number; flat: number; increased: number };
  energyShield: { base: number; flat: number; increased: number };
  armour: { base: number; flat: number; increased: number };
  evasion: { base: number; flat: number; increased: number };
}
```

---

## Phase 3f — Real Calculators

**Status**: PLANNING  
**Depends on**: Phase 3e

### 3f Deliverables

| File | Purpose |
|------|---------|
| `core/calculators/damage.calculator.ts` | `calculateDamage(ResolvedBuildStats) → DamageReport` — full rewrite |
| `core/calculators/defense.calculator.ts` | `calculateDefense(ResolvedBuildStats) → DefenseReport` — full rewrite |
| `core/calculators/__tests__/damage.calculator.test.ts` | 6 tests |
| `core/calculators/__tests__/defense.calculator.test.ts` | 6 tests |

Calculators receive `ResolvedBuildStats` and return `DamageReport`/`DefenseReport`. No parsing, no resolving, no scoring.

---

## Phase 3g — Factory Update + Integration

**Status**: PLANNING  
**Depends on**: Phase 3f

Update `BuildFactory` to use new parsers (3a) and item intelligence (3b). Wire full pipeline: PoB XML → DTOs → Domain Build → Resolved Stats → Reports → Analysis.

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Real PoB export parsing more complex than fixtures | Parser fails | Use real 3.25 league PoB exports as fixtures; parse before implementing |
| Passive tree data 500KB+ JSON | Test memory | Static JSON snapshot; lazy resolver |
| Damage conversion edge cases | Calculation bugs | 6 conversion test cases covering double-conversion, extra-as-chaos |
| PoB version format drift (3.22 vs 3.25 XML) | Backward compat | Version detector gates behavior; unknown versions = safe defaults |
| Incremental build breaking Phase 1 tests | Regression | Run full test suite after each sub-phase |

---

## Acceptance Criteria

1. All tests pass after each sub-phase (3a → 3g)
2. 6 real PoB fixtures parse without error
3. Damage calc within ±15% of PoB DPS display (simple builds)
4. Defense calc within ±10% of PoB EHP
5. CI keystone: life=1, chaos immune
6. Conversion: phys→lightning produces lightning DPS
7. Support gems: 5-link > 4-link DPS
8. No Phase 1/2 regression
9. Typecheck clean
10. No IO/DB/Electron in `core/`

---

## Out of Scope (Phase 4+)

Gem data storage/fetching, passive tree data loading, AI explanations, economy, UI migration, flask effects, minion DPS, auras, timeless jewels.
