# PoE Character Domain Model

**Status: IMPLEMENTED** | Character Normalizer layer (Phase 1b)

---

## 1. Data Flow

```
GGG API (raw JSONB)
       |
GGGClient (typed fetch, error handling)
       |
CharacterProvider (persistence, snapshots)
       |
CharacterNormalizer (this layer — stable DTOs)
       |
API Routes (/api/poe/characters/*)
       |
Electron UI (consumes DTOs, never raw GGG structures)
```

## 2. Why a Normalizer

GGG API responses are:
- **Unstable** — field shapes change between leagues/patches
- **Deeply nested** — items contain socketed gems inside socketedItems
- **Inconsistent** — property values use display strings, socket colors use opaque codes
- **Overexposed** — raw JSONB leaks GGG's internal field names to the frontend

The normalizer:
- **Freezes the contract** — Electron UI depends on stable DTOs, not GGG internals
- **Parses semantics** — `sColour: "I"` → `color: "R"`, `frameType: 3` → `rarity: "unique"`
- **Flattens structure** — socketed gems extracted into `skills` array by item slot
- **Validates** — missing fields default safely, no undefined leaks

## 3. DTOs

### PoeCharacterSummary

```ts
interface PoeCharacterSummary {
  id: number;             // DB primary key
  name: string;           // Character name
  level: number;
  class: string;          // "Ranger", "Marauder", etc.
  ascendancy: string | null;  // "Deadeye", "Juggernaut", null if not ascended
  league: string;         // "Settlers", "Standard", "Hardcore"
  lastSync: string;       // ISO 8601 timestamp of last GGG fetch
}
```

### PoeCharacterDetails

```ts
interface PoeCharacterDetails {
  id: number;
  name: string;
  level: number;
  class: string;
  ascendancy: string | null;
  league: string;

  equipment: PoeEquipmentItem[];   // All equipped items
  skills: PoeSkillGroup[];         // Gems grouped by item slot
  rawData: Record<string, unknown>; // For UI extensibility (poe-engine input)
}
```

### PoeEquipmentItem

```ts
interface PoeEquipmentItem {
  slot: string;            // "Weapon", "BodyArmour", "Ring", "Ring2", "Gloves", etc.
  name: string;            // Display name (rare item name or base type)
  baseType: string;        // Item type line ("Spine Bow", "Zodiac Leather")
  rarity: ItemRarity;      // 'normal' | 'magic' | 'rare' | 'unique' | 'relic' | 'currency' | 'gem'
  icon: string | null;     // GGG item art URL
  sockets: PoeItemSocket[];
  socketedGems: PoeGem[];  // Gems directly socketed in this item (not recursive)
  explicitMods: string[];  // Affix text
  implicitMods: string[];  // Base item implicits
  craftedMods: string[];   // Bench craft
  enchantMods: string[];   // Lab enchant / corrupted implicit
  propertyValues: Record<string, number>;  // Stat name → parsed numeric value
}
```

### PoeGem

```ts
interface PoeGem {
  name: string;      // "Tornado Shot", "Greater Multiple Projectiles Support"
  level: number;
  quality: number;
  support: boolean;  // true for support gems, false for active gems
}
```

### PoeSkillGroup

```ts
interface PoeSkillGroup {
  itemSlot: string;  // Which equipment item these gems are socketed in
  gems: PoeGem[];
}
```

## 4. Normalization Rules

### FrameType → Rarity

| frameType | rarity |
|-----------|--------|
| 0 | normal |
| 1 | magic |
| 2 | rare |
| 3 | unique |
| 4 | gem |
| 5 | currency |
| 6 | relic |
| 8 | relic |

### Socket Color Codes

| sColour | color |
|---------|-------|
| R | R |
| G | G |
| B | B |
| W | W |
| A | A (Abyss) |
| I | R (GGG uses 'I' for red in some responses) |
| D | G (GGG uses 'D' for green in some responses) |
| S | B (GGG uses 'S' for blue in some responses) |

### Gem Level/Quality Parsing

Extracted from `properties[]` array:
- **Level**: parsed from `{ name: "Level", values: [["21", 0]] }` → `21`
- **Quality**: parsed from `{ name: "Quality", values: [["+23%", 1]] }` → `23` (strips `+` and `%`)
- Missing properties default to `0`

### Property Value Parsing

GGG properties use display strings like `["1892", 1]` where `[0]` is the human-readable text and `[1]` is a formatting indicator. The normalizer extracts numeric values from the display text:
- `"1892"` → `1892`
- `"90-180"` → `0` (non-numeric, defaults to 0)
- Empty values default to `0`

### Skill Extraction

Gems are extracted from `item.socketedItems[]` and grouped by `item.inventoryId` into `skills[]`. Only items with socketed gems appear in skills. Empty sockets without gems are excluded.

## 5. Error Handling

| Condition | Behavior |
|-----------|----------|
| Missing `items` array | `equipment: []`, `skills: []` |
| Missing `socketedItems` on item | `socketedGems: []` |
| Missing `properties` on item/gem | `propertyValues: {}`, level/quality default to 0 |
| Missing `sockets` | `sockets: []` |
| Missing `explicit/implicit/crafted/enchantMods` | `[]` |
| Unknown `frameType` | `rarity: 'normal'` |
| Unknown `sColour` | Pass through as-is |

The normalizer **never throws**. All missing/unknown data degrades gracefully.

## 6. Test Coverage

**20 tests** covering:
- Full Deadeye build (1 weapon + 6 items + 2 flasks)
- Empty character (level 2, no items)
- Minimal character (single normal item)
- Corrupted unique item
- Missing items array
- Missing socketedItems
- Missing properties
- Missing sockets
- Socket color mapping (I→R, D→G, S→B)
- Gem level/quality parsing
- Support gem detection (`support: true`)
- Quality of 0% (not missing, actual 0)
- Implicit mods, crafted mods, explicit mods
- Equipment slot enumeration
- `normalizeCharacterSummary` (list view)
- `normalizeCharacterDetails` (detail view)

## 7. Files

| File | Purpose |
|------|---------|
| `apps/server/src/services/poe/normalizer/types.ts` | DTO interfaces |
| `apps/server/src/services/poe/normalizer/character-normalizer.ts` | Normalization functions |
| `apps/server/src/services/poe/normalizer/__tests__/fixtures.ts` | Mock GGG responses |
| `apps/server/src/services/poe/normalizer/__tests__/character-normalizer.test.ts` | Unit tests (20) |
| `apps/server/src/routes/poe-characters.ts` | Routes pipe through normalizer |

## 8. Future

- `PoeEquipmentItem.propertyValues` feeds into `poe-engine` for computed stats (PoB-like calculations)
- `skills` may be enriched with DPS estimation (requires passive tree data, Phase 1e)
- `rawData` preserved for UI features not yet modeled in DTOs (divination card drops, incubators, etc.)
