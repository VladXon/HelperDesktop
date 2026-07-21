# Phase 3 — Build Intelligence Layer

**Status**: PLANNING  
**Package**: `@helper/client` → `src/main/poe/core/`  
**Prerequisites**: Phase 1 (Core Engine), Phase 2 (Data Layer) — both COMPLETE

---

## Objective

Transform an imported PoB XML build into a fully resolved model for analysis. Replace all current approximations/hardcoded values with real, computed data from item text parsing, gem skill data, and passive tree resolution.

---

## Architecture

```
                              Phase 3 — Build Intelligence Layer

PoBXmlDTO (from Phase 1 parser)
    │
    ├─► 1. PoB Compatibility Layer (core/pob/)
    │       ├── version.detector.ts    → PoBVersion (3.22, 3.25, etc.)
    │       ├── item.parser.ts         → ParsedItem (mod groups, influence, quality)
    │       ├── gem.parser.ts          → ParsedGem (active/support, tags, quality effects)
    │       ├── tree.parser.ts         → ParsedTree (nodes, keystones, masteries, cluster jewels)
    │       └── config.parser.ts       → ParsedConfig (enemy resistances, charges, conditions)
    │
    ├─► 2. Item Intelligence (core/items/)
    │       ├── mod.classifier.ts      → implicit | explicit | crafted | veiled | enchant
    │       ├── mod.grouper.ts         → influence | fractured | corrupted | synthesised
    │       ├── mod.range.parser.ts    → text "12-24" → { min: 12, max: 24 }
    │       ├── item.text.parser.ts    → raw item tooltip → ModGroup[]
    │       └── item.stats.ts          → single item → ComputedItemStats
    │
    ├─► 3. Skill Resolver (core/skills/)
    │       ├── active.gem.resolver.ts  → SkillInfo (base damage, effectiveness, tags)
    │       ├── support.gem.resolver.ts → SupportMultiplier (more/less, added damage)
    │       ├── gem.tag.resolver.ts     → gem tags → damage type classification
    │       ├── conversion.resolver.ts  → phys→light→cold→fire chain
    │       └── quality.resolver.ts     → quality stat per variant/per level
    │
    ├─► 4. Passive Tree Resolver (core/tree/)
    │       ├── node.resolver.ts        → allocated node → stat bonuses
    │       ├── keystone.resolver.ts    → keystone effects (CI, MoM, EB, etc.)
    │       ├── mastery.resolver.ts     → mastery choice effects
    │       ├── cluster.jewel.resolver.ts → cluster jewel passive aggregation
    │       └── ascendancy.resolver.ts  → ascendancy node bonuses
    │
    ├─► 5. Stat Aggregation (core/stats/)
    │       ├── stat.merger.ts          → item stats + tree stats + gem stats + aura stats
    │       ├── local.vs.global.ts      → classify modifiers (local weapon mods vs. global)
    │       ├── conditional.evaluator.ts → "while leeching", "on full life", etc.
    │       └── ComputedItemStats       → existing type, now fully populated
    │
    ▼
BuildFactory (updated)
    │  Produces fully resolved Build with non-zero ComputedItemStats per item
    ▼
Calculators (updated)
    │  Real damage/defense math, not approximations
    ▼
Rules + Engine + Explanation (mostly unchanged)
```

**Architecture constraint**: All of Phase 3 lives in `core/` — pure TypeScript, no IO, no database, no `fetch()`, no Electron APIs. Testable in plain Node.js with vitest.

---

## 1. PoB Compatibility Layer (`core/pob/`)

Rationale: The current parser (`pob-xml.parser.ts`) is a regex-based XML extractor — it produces a flat `PoBXmlDTO` but doesn't interpret the content. The compatibility layer reads the raw DTO fields and produces structured intermediate types that the rest of the pipeline consumes.

### 1.1 Version Detector (`core/pob/version.detector.ts`)

```typescript
type PoBVersion = '3.22' | '3.23' | '3.24' | '3.25' | '3.26' | 'unknown';

function detectVersion(dto: PoBXmlDTO): PoBVersion;
```

- Parse `build.targetVersion` (e.g. "3_25")
- Map to known league patches
- Controls passive tree data loading, gem data version selection, league mechanic flags
- Fallback to "unknown" with warning

### 1.2 Item Parser (`core/pob/item.parser.ts`)

```typescript
interface ParsedItem {
  id: string;                         // "Weapon 1", "Helmet", etc.
  baseType: string;
  rarity: ItemRarity;
  influence: InfluenceType | null;     // shaper | elder | crusader | redeemer | hunter | warlord
  isFractured: boolean;
  isSynthesised: boolean;
  isCorrupted: boolean;
  quality: number;                     // 0–30 (30 for perfect fossil, 20+ for hillock)
  qualityType: string;                 // "physical" = armour quality, "elemental" = elemental damage, etc.
  sockets: SocketGroup[];
  abyssalSockets: number;
  implicitMods: ParsedMod[];
  explicitMods: ParsedMod[];
  craftedMods: ParsedMod[];
  enchantMods: ParsedMod[];
  fracturedMods: ParsedMod[];
  corruptedMods: ParsedMod[];
  scourgeMods: ParsedMod[];
}

interface ParsedMod {
  text: string;                        // raw mod text
  modId: string | null;                // GGG mod ID (e.g. "StrengthUniqueRing61")
  tier: number | null;                 // 1–8 for weighted mods, null for fixed
  values: { min: number; max: number } | null;
}
```

- **Input**: `PoBItem` arrays from `PoBXmlDTO`
- **Responsibilities**:
  - Read item `rawMods` and classify each into the correct mod group (implicit/explicit/crafted)
  - Detect influence from mod text patterns ("Shaper Item", "Elder Item") or from PoB's `<Item>` attributes
  - Parse quality from item data (PoB stores it in separate XML elements)
  - Distinguish abyssal sockets from regular sockets
  - Detect fracture/synthesis/corruption from item text and mod patterns
  - Parse and classify item enchants (lab enchants, eldritch implicits)
- **Replaces**: Part of `build-factory.ts` → `buildEquippedItem()` and `mapMod()`
- **Key challenge**: PoB XML does not have a separate `<enchant>` section — enchant data is embedded as regular mods in v2 XML. Must detect them from context.
- **Key challenge**: Influence is often encoded in the `<Item>` tag attributes (e.g. `influence1="6"`) — the current regex parser captures attributes but doesn't interpret numeric influence IDs.

### 1.3 Gem Parser (`core/pob/gem.parser.ts`)

```typescript
interface ParsedSkillSetup {
  id: number;
  activeGem: ParsedActiveGem;
  supportGems: ParsedSupportGem[];
}

interface ParsedActiveGem {
  name: string;
  level: number;
  quality: number;
  variant: 'regular' | 'anomalous' | 'divergent' | 'phantasmal';
  isVaal: boolean;
  isAwakened: boolean;
  slot: string;                        // body armour, weapon 1, etc. (where gem is socketed)
  gemId: string | null;                // GGG gem ID
}

interface ParsedSupportGem {
  name: string;
  level: number;
  quality: number;
  variant: 'regular' | 'anomalous' | 'divergent' | 'phantasmal';
  isAwakened: boolean;
}
```

- **Input**: `PoBSkillSet[]` from `PoBXmlDTO`
- **Responsibilities**:
  - Distinguish Vaal gems from regular (PoB encodes `".name"` attribute — e.g. "Vaal Fireball")
  - Detect Awakened supports (prefix "Awakened" in name)
  - Map gem name → gem ID (reference data provided at build time, not fetched)
  - Parse gem quality stats per variant (anomalous/divergent/phantasmal have different quality effects)
  - Identify which item the gem is socketed in (PoB stores `slot` attribute on `SkillSet`)
- **Replaces**: Part of `build-factory.ts` → `mapSkillGem()` and `buildSkillSetups()`

### 1.4 Tree Parser (`core/pob/tree.parser.ts`)

```typescript
interface ParsedPassiveTree {
  version: string;                     // "3.25"
  allocatedNodes: number[];            // passive node hashes
  masteryChoices: Map<number, string>; // mastery node → selected effect name
  keystones: string[];                 // allocated keystone names
  ascendancyNodes: string[];           // ascendancy allocations
  clusterJewelNodes: ClusterJewelAllocation[];
}

interface ClusterJewelAllocation {
  socketNodeId: number;                // node where cluster jewel is socketed
  type: 'small' | 'medium' | 'large';
  passives: number[];                  // nodes inside the cluster
  notables: string[];                  // notable names
}
```

- **Input**: `PoBTree` from `PoBXmlDTO` + cluster jewel item data
- **Responsibilities**:
  - Decode masteries from `masteryEffects: Record<number, string>` — current parser extracts this
  - Detect cluster jewels from item pool (jewel items with "Adds X passive skills")
  - Resolve cluster jewel inner passives (PoB encodes these in the base64 tree blob — needs decoding)
  - Validate tree version matches league
  - Produce a flat list of stat bonuses from all allocated nodes
- **Key challenge**: The passive tree is base64-encoded. The current 4-byte placeholder fixture is not real. A real PoB export contains the complete tree as a compressed base64 string. Phase 3 must decode this and query against loaded tree data. **Tree data itself is external** (data layer, Phase 2) — the resolver only processes it.

### 1.5 Config Parser (`core/pob/config.parser.ts`)

```typescript
interface ParsedConfig {
  isBoss: boolean;
  isGuardian: boolean;
  isUber: boolean;
  enemyResistances: { fire: number; cold: number; lightning: number; chaos: number };
  charges: { frenzy: number; power: number; endurance: number };
  onslaught: boolean;
  isLowLife: boolean;
  isFullLife: boolean;
  isLeeching: boolean;
  hasConsecratedGround: boolean;
  isPhasing: boolean;
  isFortified: boolean;
  flaskUptime: Record<string, number>;  // flask name → uptime% (0–100)
  customModifiers: string[];            // PoB custom config modifiers
}
```

- **Input**: `PoBConfig` from `PoBXmlDTO`
- **Responsibilities**:
  - Parse `<Input>` fields in `<Config>`: PoB stores enemy type, map mods, custom config as name="X" string="Y" attributes
  - Detect boss type (`isEnemyBoss`, `bossLevel`, `bossType`)
  - Parse custom modifiers (user-added stat lines in PoB config tab)
  - Determine character-level conditions (low life, full life, leeching, etc.) for conditional modifier evaluation
- **Current state**: `parseConfig()` only reads `charges` and hardcodes `enemyResistances: 30`, `isBoss: false`
- **Key challenge**: PoB's `<Config>` section is free-form — attribute names depend on the PoB version. Need a version-aware config parser.

---

## 2. Item Intelligence (`core/items/`)

Rationale: The current code aggregates stats from mods using regex pattern matching (45 patterns in `StatResolver`). This misses complex mods, conditional mods, and fails to distinguish local weapon mods from global character mods. Phase 3 replaces this with structured item text parsing.

### 2.1 Mod Classifier (`core/items/mod.classifier.ts`)

```typescript
type ModDomain = 'implicit' | 'explicit' | 'crafted' | 'enchant' | 'fractured' | 'corrupted' | 'scourge';

function classifyMod(text: string, item: ParsedItem): ModDomain;
function isVeiled(text: string): boolean;
function isEldritchImplicit(text: string): boolean;
```

- Uses the PoB `rawMods` property flags (`implicit`, `explicit`, `crafted`) plus text heuristics
- Detects veiled modifiers ("Veiled" suffix)
- Distinguishes eldritch implicits (Eater of Worlds / Searing Exarch)

### 2.2 Mod Grouper (`core/items/mod.grouper.ts`)

```typescript
type InfluenceType = 'shaper' | 'elder' | 'crusader' | 'redeemer' | 'hunter' | 'warlord';

interface ModGroup {
  domain: ModDomain;
  mods: ParsedMod[];
  influence?: InfluenceType;
  isFractured?: boolean;
  isSynthesised?: boolean;
}

function groupMods(item: ParsedItem): ModGroup[];
```

- Groups mods by domain (implicit/explicit/crafted) and influence
- Extracts fractured mods from the explicit pool (text contains "Fractured" or item flag)
- Extracts synthesised implicits (synth items have 1-3 synth implicits)
- Extracts corruption mods

### 2.3 Mod Range Parser (`core/items/mod.range.parser.ts`)

```typescript
interface ModRange {
  min: number;
  max: number;
}

function parseModRange(text: string): ModRange | null;
```

- **Replaces**: The broken `parseModText()` in `build-factory.ts`
- Recognizes patterns:
  - `"+99 to maximum life"` → `{ value: 99 }` (single value)
  - `"Adds 12 to 24 fire damage"` → `{ min: 12, max: 24 }` (range)
  - `"12% increased attack speed"` → `{ value: 12 }` (percent)
  - `"-9 to Total Mana Cost of Skills"` → `{ value: -9 }` (negative)
  - `"+23% to Chaos Resistance"` → `{ value: 23 }` (preceding sign)
- Handles edge cases: "nearby enemies", "you and nearby allies", "per X strength"

### 2.4 Item Text Parser (`core/items/item.text.parser.ts`)

```typescript
function parseItemText(rawItemText: string): ParsedItem;
```

- Takes raw item tooltip text (as PoB exports it) and produces structured `ParsedItem`
- Handles PoE's item rendering format:
  - `--------` separators between mod groups
  - `Item Class:` header
  - `Quality: +20%` line
  - Implicit mods above first separator
  - Explicit mods between separators
  - Crafted mods after "Master Crafted" marker
  - Enchant mods prefixed differently
- **Alternative approach**: Use PoB XML data directly (current method) since the XML already tags individual mods. The text parser is a fallback for raw clipboard imports.

### 2.5 Item Stats Computer (`core/items/item.stats.ts`)

```typescript
function computeItemStats(
  item: ParsedItem,
  passiveTreeStats: Record<string, number>,
  config: ParsedConfig
): ComputedItemStats;
```

- **Takes all item mods** (implicits + explicits + crafts + enchants + fractures) and produces a `ComputedItemStats`
- Classifies each mod as **local** or **global** (see section 5.2)
- **Local mods** affect the item itself: `increased armour`, `added physical damage`, `increased attack speed` on weapons
- **Global mods** affect the character: `increased maximum life`, `increased elemental damage`
- Applies quality effects (armour quality → increased armour%, elemental quality → increased elemental damage)
- Produces `ComputedItemStats` to replace the current `emptyComputedStats()`

---

## 3. Skill Resolver (`core/skills/`)

Rationale: The current engine has `damageRanges()` returning `[]` (empty) and `attackTime` hardcoded to `0.8`. Skill interactions (support gems, damage conversion, quality effects) are not modeled.

### 3.1 Active Gem Resolver (`core/skills/active.gem.resolver.ts`)

```typescript
interface GemSkillData {
  gemId: string;
  name: string;
  level: number;
  quality: number;
  qualityVariant: GemQualityVariant;
  tags: string[];                      // "attack", "aoe", "fire", "spell", etc.
  baseDamageRanges: DamageRange[];     // per level
  damageEffectiveness: number;
  attackTime: number | null;           // null for spells (use cast time)
  castTime: number | null;            // null for attacks
  damageConversion: ConversionChain;   // phys → lightning → cold → fire
  addedDamageMultiplier: number;       // "Deals 120% of base damage"
  reservation: { type: string; amount: number; percent: number } | null;
  isTrap: boolean;
  isMine: boolean;
  isTotem: boolean;
  isMinion: boolean;
  isBrand: boolean;
  isChannelling: boolean;
  isTrigger: boolean;
  isVaalskill: boolean;
}

function resolveActiveGem(parsed: ParsedActiveGem, gemData: Record<string, any>): GemSkillData;
```

- **Input**: `ParsedActiveGem` (from PoB compatibility layer) + gem library data (from data layer, loaded at runtime)
- **Gem data**: Stored as static JSON in `apps/client/src/main/poe/data/` or loaded from server API (Phase 4). The resolver itself is pure — gem data is passed in.
- Produces `GemSkillData` with base damage, effectiveness, tags, conversion chain, etc.
- Maps quality stats per variant: anomalous/divergent/phantasmal have different quality effects
- Loads per-level gem data (base damage scaling, mana cost scaling)

### 3.2 Support Gem Resolver (`core/skills/support.gem.resolver.ts`)

```typescript
interface SupportGemEffect {
  gemId: string;
  name: string;
  level: number;
  quality: number;
  moreDamageMultiplier: number;        // "Supported Skills deal 40% more damage"
  lessDamageMultiplier: number;       // "Supported Skills deal 20% less damage"
  addedDamage: DamageRange[];         // "Supported Skills deal 5 to 10 added fire damage"
  increasedDamagePercent: number;
  increasedAttackSpeedPercent: number;
  increasedCastSpeedPercent: number;
  increasedCritChancePercent: number;
  increasedCritMultiplier: number;
  damageConversion: ConversionChain;
  addedTags: string[];               // support adds tags (e.g. "Greater Multiple Projectiles" adds "projectile")
  otherEffects: string[];            // special support effects (chain, fork, pierce, etc.)
}

function resolveSupportGems(supports: ParsedSupportGem[], gemData: Record<string, any>): SupportGemEffect[];
```

- Combines multiple support gems into a compound effect
- Handles "Less" multipliers that stack multiplicatively: `1.0 × (1 - less1) × (1 - less2) ...`
- Handles "More" multipliers: `1.0 × (1 + more1) × (1 + more2) ...`
- Volatility support (Ruthless, etc.) — average-case effective damage
- Quality bonuses on support gems

### 3.3 Gem Tag Resolver (`core/skills/gem.tag.resolver.ts`)

```typescript
type DamageType = 'physical' | 'fire' | 'cold' | 'lightning' | 'chaos';
type SkillType = 'attack' | 'spell' | 'secondary' | 'herald' | 'aura' | 'curse' | 'warcry' | 'banner' | 'guard';

interface SkillClassification {
  damageTypes: DamageType[];           // which damage types does this skill deal
  skillType: SkillType;
  requiresMeleeWeapon: boolean;
  requiresBow: boolean;
  requiresShield: boolean;
  isProjectile: boolean;
  isAoE: boolean;
  isStrike: boolean;                   // "strike" target type
  isDuration: boolean;
  isMovement: boolean;
  isTravel: boolean;
  isNova: boolean;
}

function classifySkillTags(tags: string[], gemName: string): SkillClassification;
```

- Maps gem tags to mechanical classification
- Tag combos: "attack" + "aoe" + "melee" → melee AoE attack (affected by melee damage, area damage, attack damage)
- "spell" + "projectile" + "physical" → phys projectile spell (affected by spell damage, projectile damage, physical damage)
- Determines which damage modifiers apply

### 3.4 Conversion Resolver (`core/skills/conversion.resolver.ts`)

```typescript
type ConversionStep = { from: DamageType; to: DamageType; percent: number };
type ConversionChain = ConversionStep[];

// Phys → Lightning → Cold → Fire → Chaos (fixed order, cannot skip)
function resolveConversionChain(
  skillConversion: ConversionChain,
  itemConversion: { from: DamageType; to: DamageType; percent: number }[],
  treeConversion: { from: DamageType; to: DamageType; percent: number }[]
): ConversionChain;

function calculateDamageAfterConversion(
  flatDamage: Record<DamageType, { min: number; max: number }>,
  conversionChain: ConversionChain
): Record<DamageType, { min: number; max: number }>;
```

- Conversion order is fixed: Physical → Lightning → Cold → Fire → Chaos
- Each step converts a percentage of the damage
- Multiple sources stack additively (e.g. 50% phys→lightning from gem + 50% phys→cold from tree = 100% converted: 50% light, 50% cold)
- "Gain X% of Y as extra Z" is NOT conversion — it's added as extra damage without reducing the source
- Extra damage modifiers: "Gain 25% of physical as extra fire" → adds fire based on physical BEFORE conversion

### 3.5 Quality Resolver (`core/skills/quality.resolver.ts`)

```typescript
interface GemQualityEffect {
  variant: GemQualityVariant;
  stat: string;                        // "+1% increased area of effect" per quality
  perQuality: number;                  // effect per 1% quality
}

function resolveQualityEffects(gemId: string, quality: number, variant: GemQualityVariant, level: number): Record<string, number>;
```

- Maps quality → stat bonuses per gem and variant
- Some qualities scale with level (e.g. "1% increased damage per 1% quality per level")
- Anomalous/Divergent/Phantasmal have entirely different quality stats
- Quality data is provided as static reference data (not fetched at runtime)

---

## 4. Passive Tree Resolver (`core/tree/`)

Rationale: Tree nodes are parsed as node IDs and mastery effects, but no stat bonuses are computed from them. Phase 3 resolves actual stat values from tree node data.

### 4.1 Node Resolver (`core/tree/node.resolver.ts`)

```typescript
interface PassivTreeNode {
  nodeId: number;
  name: string;
  type: 'normal' | 'notable' | 'keystone' | 'mastery' | 'ascendancy' | 'jewelSocket';
  stats: string[];                     // raw stat texts: "+10 to Strength", "12% increased Maximum Life"
  connections: number[];
}

interface PassiveTreeData {
  version: string;
  nodes: Record<number, PassivTreeNode>;
  classes: Record<string, { startNodeId: number }>;
  ascendancies: Record<string, { nodes: number[] }>;
  keystoneMap: Record<string, number>; // keystone name → nodeId
}

function resolveAllocatedStats(
  allocatedNodes: number[],
  treeData: PassiveTreeData
): Record<string, number>;
```

- **Tree data** is loaded externally (Phase 2 data layer or static JSON). The resolver is pure.
- Tallies stat bonuses from every allocated node
- Handles stat lines using the same `StatResolver` patterns (Phase 1 — unified mod matching)
- Excludes keystone nodes (special cases, resolved separately)
- Handles masteries: each mastery wheel has a chosen effect, the resolver extracts only the chosen one
- Handles ascendancy notables and small nodes
- **Key challenge**: Tree data changes every league. Need versioned loading.

### 4.2 Keystone Resolver (`core/tree/keystone.resolver.ts`)

```typescript
interface KeystoneEffect {
  name: string;
  description: string;
  effects: Record<string, string | number | boolean>;
}

const KEYSTONE_EFFECTS: Record<string, KeystoneEffect>;
```

- Static registry of keystone effects (about 40 keystones in PoE1)
- Keystones are special because they change game mechanics, not just add stats:
  - `Chaos Inoculation` → max life = 1, chaos immunity
  - `Mind Over Matter` → 40% damage taken from mana before life
  - `Eldritch Battery` → ES protects mana, not life
  - `Zealot's Oath` → life regen applies to ES instead
  - `Elemental Overload` → no crit multi, 40% more elemental damage on crit
- Some keystones disable other mechanics entirely (CI disables life nodes on tree)
- The resolver returns structured effects that the calculators consume

### 4.3 Mastery Resolver (`core/tree/mastery.resolver.ts`)

```typescript
function resolveMasteryEffects(
  masteryChoices: Map<number, string>,
  treeData: PassiveTreeData
): Record<string, number>;
```

- Each mastery wheel offers 6 options, one is selected
- Resolver extracts only the chosen option's stats
- Mastery effects include stats (e.g. "+50 to maximum life") and mechanical effects (e.g. "30% of chaos damage does not bypass energy shield")

### 4.4 Cluster Jewel Resolver (`core/tree/cluster.jewel.resolver.ts`)

```typescript
function resolveClusterJewelStats(
  clusterJewels: ClusterJewelAllocation[],
  clusterJewelTreeData: PassiveTreeData
): Record<string, number>;
```

- Cluster jewels add additional passive tree nodes beyond the base tree
- Small/medium/large cluster jewels each add 2-6 passives + 0-2 notables
- Resolver aggregates stats from all cluster jewel passives
- Requires cluster jewel tree data per jewel type (loaded externally)
- Tracks cluster jewel socket count (limited by outer tree sockets)

### 4.5 Ascendancy Resolver (`core/tree/ascendancy.resolver.ts`)

```typescript
function resolveAscendancyStats(
  ascendancyNodes: string[],
  ascendancyName: string,
  treeData: PassiveTreeData
): Record<string, number>;
```

- Maps ascendancy node names → stat bonuses
- Ascendancy notables often provide strong conditional effects
- Some ascendancy nodes fundamentally alter mechanics (same as keystones)

---

## 5. Stat Aggregation (`core/stats/`)

Rationale: The current `StatResolver` aggregates all equipment mods into one `ComputedItemStats` using 45 regex patterns. Phase 3 replaces this with a multi-source aggregation that combines item stats, tree stats, gem stats, and conditional effects.

### 5.1 Stat Merger (`core/stats/stat.merger.ts`)

```typescript
interface CharacterStats {
  // Full ComputedItemStats from all sources merged
  // Plus calculated passives
}

function mergeStats(
  itemStats: ComputedItemStats[],      // one per equipped item (including jewels)
  treeStats: Record<string, number>,   // from passive tree resolver
  ascendancyStats: Record<string, number>,
  auraStats: Record<string, number>,   // from skill resolver (future)
  characterBase: CharacterBase         // level, class, attributes
): ComputedItemStats;
```

- Combines stats from all sources:
  1. Equipment items (helm, chest, gloves, boots, weapon, off-hand, rings, amulet, belt)
  2. Jewels (regular + abyss + cluster)
  3. Passive tree (base nodes + cluster jewels + masteries + ascendant)
  4. Auras and buffs (resolved from skill data)
  5. Character base (life per level, mana per level, attributes)
- **Adds** flat values (life, ES, armour)
- **Sums** percentages (resists, increased damage)
- **Multiplies** multipliers (more/less from support gems and conditions)
- **Caps** values (resists at 90% max, but tracks uncapped for Wise Oak, etc.)
- Produces the final `ComputedItemStats` that feeds into calculators

### 5.2 Local vs Global Classifier (`core/stats/local.vs.global.ts`)

```typescript
function isLocalMod(modText: string, itemSlot: EquipmentSlot): boolean;
function applyLocalMod(stats: ComputedItemStats, modText: string, itemType: string): ComputedItemStats;
```

Critical distinction in PoE:

| Mod | On Item | Effect |
|-----|---------|--------|
| "Adds 12 to 24 physical damage" | Weapon | **Local** — modifies weapon's base damage |
| "Adds 12 to 24 physical damage" | Ring | **Global** — adds to character's attack damage |
| "+100 to armour" | Body Armour | **Local** — modifies the armour piece itself |
| "+40% increased armour" | Body Armour | **Local** — same piece only (if not "global defences") |
| "+40% increased armour" | Passive tree | **Global** — affects total armour from all sources |

Rules:
- Weapon mods that add flat damage, increased physical damage%, increased attack speed% are **local** to the weapon
- Armour mods that add flat armour, increased armour%, increased evasion% are **local** to that armour piece (unless "global")
- All other mods are **global**
- "Global" keyword explicitly marks global mods

### 5.3 Conditional Evaluator (`core/stats/conditional.evaluator.ts`)

```typescript
interface ConditionalMod {
  condition: string;                   // "while leeching", "on full life", "against burning enemies"
  modText: string;                     // the actual mod text
  isActive: boolean;                   // evaluated state
}

function evaluateConditions(
  conditionalMods: ConditionalMod[],
  config: ParsedConfig,
  characterStats: ComputedItemStats
): ComputedItemStats;
```

- PoE has many conditional modifiers: "X while leeching", "X on full life", "X against unique enemies"
- The config parser determines the character state (isLeeching, isFullLife, etc.)
- Conditional evaluator applies only active modifiers
- If state is uncertain (not in config), provides both scenarios: with/without

---

## 6. Real Calculators

Replace the current approximations with computed values from resolved stats.

### 6.1 Damage Calculator (`core/calculators/damage.calculator.ts` — replace)

**What changes from current:**

| Current | Phase 3 |
|---------|---------|
| `damageRanges()` returns `[]` | Uses `GemSkillData.baseDamageRanges` per level |
| `attackTime` hardcoded `0.8` | Uses `GemSkillData.attackTime` or `castTime` |
| `effectiveness` always `1.0` | Uses `GemSkillData.damageEffectiveness` |
| No conversion | Uses `ConversionChain` from conversion resolver |
| No support gems | Applies multipliers from `SupportGemEffect[]` |
| 3 damage types (phys/elem/attack) | Full damage type classification (fire/cold/lightning/chaos/physical + projectile/area/melee etc.) |
| Boss penalty hardcoded `0.6` | Reads from `ParsedConfig.isGuardian/isUber` |

**New damage formula:**

```
totalDamage = SUM over damage types (
    baseFlatDamage[type]
    × (1 + SUM of increased_damage[type] / 100)
    × effectiveness
    × SUM of added_damage_from_supports[type]
) × PRODUCT of more_multipliers × (1 - less1) × (1 - less2) ...

hitRate = 1 / (attackTime or castTime)
dps = totalDamage × hitRate × (1 + critChance × (critMultiplier - 1))
```

Damage types are additive within each type, then summed:
```
Physical: (weapon_flat + added_flat_phys) × (1 + inc_phys/100 + inc_melee/100 + inc_attack/100)
Fire: (added_flat_fire + extra_from_phys) × (1 + inc_fire/100 + inc_elemental/100 + inc_spell/100)
... etc.
```

### 6.2 Defense Calculator (`core/calculators/defense.calculator.ts` — replace)

**What changes from current:**

| Current | Phase 3 |
|---------|---------|
| Base life: `38 + level×12` (average) | Actual class-based formula per level |
| `increasedLife` from `increasedDamage['life']` (always 0) + 5% fallback | From `ComputedItemStats` resolved mods |
| Flat ES only from mods | Base ES from items × (1 + quality%) + flat ES from mods |
| Armour formula: `armour/(armour+5000)` | Uses actual hit damage for phys reduction calculation |
| No auras | Reads aura effects from skill resolver (Determination, Grace, etc.) |
| Guard skills always `null` | Detection + uptime calculation |
| Leech all zeros | Leech rate: `maxLife × maxTotalRecovery%/100` per second, per instance |
| No ailment immunity | Aggregate from items + tree + ascendancy |
| No flasks | Include flask effects based on `ParsedConfig.flaskUptime` |

**New defense formula:**

```
finalLife = (baseLifeByClass(level) + statLife + flatLifeMods + attrLife(str×0.5))
            × (1 + increasedLife%/100)
            × (1 + moreLifeMultiplier)

finalES = (SUM(itemBaseES × (1 + qualityES%/100)) + flatESMods)
          × (1 + increasedES%/100 + increasedDefencesFromShield%/100)
          × (1 + moreESMultiplier)

combinedPool = CI ? finalES : (MoM ? finalLife + (finalMana × 0.4) + finalES : finalLife + finalES)

armour = (SUM itemArmour × (1 + quality_armour%)) + flatArmourMods
         × (1 + increasedArmour%/100 + aura_bonus)
physReduction = armour / (armour + (hitDamage × 5))  // per hit size
```

---

## 7. Testing Strategy

### 7.1 Real PoB Export Fixtures

Replace hand-crafted fixtures with real PoB exports:

| Fixture | Build Type | Source |
|---------|-----------|--------|
| `boneshatter-jugg-3.25.pob.xml` | Melee physical | PoB export → pastebin → base64 decode |
| `firetrap-elementalist-3.25.pob.xml` | Spell DoT + ES hybrid | PoB export |
| `lightning-strike-champion-3.25.pob.xml` | Conversion attack (phys → lightning) | PoB export |
| `righteous-fire-inquisitor-3.25.pob.xml` | DoT spell + life regen | PoB export |
| `chaos-inoculation-trickster-3.25.pob.xml` | CI + ES + evasion | PoB export |
| `minion-necromancer-3.25.pob.xml` | Minion build (exercises minion tag resolver) | PoB export |

**Fixture pipeline:**
1. Export build from Path of Building Community Edition
2. "Share" → pastebin URL
3. `fetch(pastebin.com/raw/{id})` → base64 content
4. Decode → XML → save as `.pob.xml` fixture

### 7.2 Test Files

| Test File | Scope | Tests (min) |
|-----------|-------|-------------|
| `core/pob/__tests__/version.detector.test.ts` | PoB version detection across leagues | 4 |
| `core/pob/__tests__/item.parser.test.ts` | Item parsing: influence, quality, mod groups | 8 |
| `core/pob/__tests__/gem.parser.test.ts` | Gem parsing: Vaal, Awakened, variants | 6 |
| `core/pob/__tests__/tree.parser.test.ts` | Tree parsing: nodes, masteries, cluster detection | 5 |
| `core/pob/__tests__/config.parser.test.ts` | Config: boss types, conditions, charges | 5 |
| `core/items/__tests__/mod.range.parser.test.ts` | Mod range parsing: all patterns | 10 |
| `core/items/__tests__/mod.classifier.test.ts` | Mod domain classification | 6 |
| `core/items/__tests__/item.stats.test.ts` | Per-item stats computation | 8 |
| `core/skills/__tests__/active.gem.resolver.test.ts` | Gem resolution: base damage, tags, conversion | 5 |
| `core/skills/__tests__/support.gem.resolver.test.ts` | Support multiplier calculation | 5 |
| `core/skills/__tests__/conversion.resolver.test.ts` | Damage conversion chains | 6 |
| `core/tree/__tests__/node.resolver.test.ts` | Tree stat aggregation | 4 |
| `core/tree/__tests__/keystone.resolver.test.ts` | Keystone effects (CI, MoM, EB) | 5 |
| `core/stats/__tests__/stat.merger.test.ts` | Multi-source stat merge | 4 |
| `core/stats/__tests__/local.vs.global.test.ts` | Local/global mod classification | 6 |
| `core/stats/__tests__/conditional.evaluator.test.ts` | Conditional mod evaluation | 4 |
| `core/calculators/__tests__/damage.calculator.test.ts` | Full damage calc (updated) | 6 |
| `core/calculators/__tests__/defense.calculator.test.ts` | Full defense calc (updated) | 6 |
| `core/__tests__/pob-import.integration.test.ts` | End-to-end pipeline with real fixtures | 6 |
| **Total** | | **109 new tests** |

### 7.3 Reference Data

Test fixtures need minimal reference data (passed as parameters, not fetched):

| Data | Size estimate | Format |
|------|--------------|--------|
| Gem library (level 20 only for tests) | ~200 KB | JSON — `{ [gemId]: GemSkillData }` |
| Passive tree snapshot (3.25) | ~500 KB | JSON — `PassiveTreeData` |
| Keystone effects registry | ~5 KB | Hardcoded in `keystone.resolver.ts` |
| Ascendancy node effects | ~20 KB | Hardcoded in `ascendancy.resolver.ts` |

Reference data is **not fetched** in tests but passed as fixture objects. In production (Phase 4), data comes from the server API.

---

## File Structure (all under `core/`)

```
apps/client/src/main/poe/core/
├── pob/                                    # NEW — PoB Compatibility Layer
│   ├── version.detector.ts
│   ├── item.parser.ts
│   ├── gem.parser.ts
│   ├── tree.parser.ts
│   ├── config.parser.ts
│   └── __tests__/
│       ├── version.detector.test.ts
│       ├── item.parser.test.ts
│       ├── gem.parser.test.ts
│       ├── tree.parser.test.ts
│       └── config.parser.test.ts
├── items/                                  # NEW — Item Intelligence
│   ├── mod.classifier.ts
│   ├── mod.grouper.ts
│   ├── mod.range.parser.ts
│   ├── item.text.parser.ts
│   ├── item.stats.ts
│   └── __tests__/
│       ├── mod.range.parser.test.ts
│       ├── mod.classifier.test.ts
│       └── item.stats.test.ts
├── skills/                                 # NEW — Skill Resolver
│   ├── active.gem.resolver.ts
│   ├── support.gem.resolver.ts
│   ├── gem.tag.resolver.ts
│   ├── conversion.resolver.ts
│   ├── quality.resolver.ts
│   └── __tests__/
│       ├── active.gem.resolver.test.ts
│       ├── support.gem.resolver.test.ts
│       └── conversion.resolver.test.ts
├── tree/                                   # NEW — Passive Tree Resolver
│   ├── node.resolver.ts
│   ├── keystone.resolver.ts
│   ├── mastery.resolver.ts
│   ├── cluster.jewel.resolver.ts
│   ├── ascendancy.resolver.ts
│   └── __tests__/
│       ├── node.resolver.test.ts
│       └── keystone.resolver.test.ts
├── stats/                                  # NEW — Stat Aggregation
│   ├── stat.merger.ts
│   ├── local.vs.global.ts
│   ├── conditional.evaluator.ts
│   └── __tests__/
│       ├── stat.merger.test.ts
│       ├── local.vs.global.test.ts
│       └── conditional.evaluator.test.ts
├── dto/                                    # (existing)
├── parsers/                                # (existing — may extend, not rewrite)
├── adapters/                               # (existing)
├── factory/                                # (existing — will be significantly updated)
├── resolvers/                              # (existing — StatResolver will be retired)
├── calculators/                            # (existing — will be rewritten)
├── rules/                                  # (existing — may need minor adjustments)
├── engine/                                 # (existing — pipeline updated)
├── explanation/                           # (existing)
├── models/                                 # (existing)
└── __tests__/
    ├── fixtures/                           # Real PoB exports (6 new)
    └── pob-import.integration.test.ts      # (existing — expanded)
```

---

## Implementation Order

| Step | Scope | Depends on | Description |
|------|-------|-----------|-------------|
| **3a** | `core/pob/` | Nothing | PoB compatibility layer: version, item, gem, tree, config parsers |
| **3b** | `core/items/` | 3a | Item intelligence: mod classification, range parsing, per-item stats |
| **3c** | `core/skills/` | 3a | Skill resolver: active gems, supports, conversion, quality |
| **3d** | `core/tree/` | 3a | Passive tree resolver: nodes, keystones, masteries, clusters, ascendancy |
| **3e** | `core/stats/` | 3b, 3c, 3d | Stat aggregation: merge, local/global, conditional evaluation |
| **3f** | `core/calculators/` | 3e | Rewrite damage + defense calculators with real data |
| **3g** | `core/factory/` | 3a-3f | Update BuildFactory to use new parsers/resolvers |
| **3h** | `core/engine/` | 3g | Update analyzer pipeline |
| **3i** | Tests | 3h | Final integration tests, cleanup |

Steps 3a–3d can be started in parallel (no dependencies between them). 3e depends on all three. 3f depends on 3e.

---

## Architecture Constraint Verification

Before any implementation:

- [ ] Every new file is in `core/` — pure TypeScript, no IO, no DB
- [ ] All external data (gem library, tree data) is passed as parameters, not imported/fetched
- [ ] No new npm dependencies
- [ ] All shared types in `packages/shared/src/poe/` (interfaces only, no runtime code)
- [ ] Import paths use `.js` extension for vitest/esbuild
- [ ] Test files excluded from tsc via `"**/__tests__/**"` in tsconfig
- [ ] Existing Phase 1 + Phase 2 tests continue to pass

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Real PoB export parsing is much more complex than hand-crafted fixtures | Parser may fail on real data | Use 6 real PoB exports from 3.25 league as fixtures; parse first, implement later |
| Passive tree data is 500KB+ JSON | Test performance, memory | Use static JSON snapshot; resolver is lazy |
| Gem data per level is large (200+ gems × 20 levels) | Maintenance burden | Tests use level 20 only; production data from server API |
| Damage conversion edge cases (double conversion, extra as chaos) | Calculation bugs | Write 6 conversion test cases covering edge cases |
| PoB version differences (3.22 vs 3.25 XML format) | Backward compat | Version detector gates parser behavior; unknown versions use safe defaults |
| Breaking existing Phase 1 tests | Regression | Keep existing test fixtures; run full suite after each step |

---

## Acceptance Criteria

1. **All 109 new tests pass**
2. **6 real PoB fixtures parse successfully** (no fallback to error states)
3. **Damage calculator produces values within ±15% of PoB's own DPS display** (for simple builds without conditional enemy configurables)
4. **Defense calculator computes EHP within ±10% of PoB for life/ES/armour**
5. **CI keystone correctly sets life=1 and chaos immunity**
6. **Conversion chain: phys→lightning on Lightning Strike produces lightning DPS, not physical**
7. **Support gems multiply damage correctly** (5-link Fire Trap DPS > 4-link)
8. **All Phase 1 + Phase 2 tests still pass** (no regressions)
9. **Typecheck clean** (`pnpm typecheck`)
10. **No new imports from Electron, node:*, or external APIs in `core/`**

---

## Out of Scope (deferred to Phase 4+)

| Item | Reason |
|------|--------|
| Gem data storage & fetching | Data layer — Phase 4 (server API for gem library) |
| Passive tree data storage & fetching | Data layer — Phase 4 (server API for tree snapshots) |
| AI-based explanation enrichment | AI Layer — Phase 5 |
| Real-time economy integration | Services Layer — Phase 4 |
| UI migration to new analyzer | UI Migration — Phase 6 |
| Flask effect computation (full) | Complex; needs uptime modeling |
| Minion DPS calculation | Separate damage formula |
| Aura effect computation | Needs reservation + aura effect scaling |
| Timeless jewel seed-based passive override | Extremely complex — requires tree diffing |
