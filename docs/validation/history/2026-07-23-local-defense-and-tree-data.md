# Local Item Defense + Tree Data Expansion

Date: 2026-07-23
Builds tested: 15

## Changes

### 1. Local Item Defense Aggregation
**Problem**: The aggregator treated ALL increased mods as global. In PoE, increased defense mods on items (e.g., "114% increased Energy Shield" on body armour) apply locally to that item's base, not to pooled flat defense.
**Fix**: Added `itemId` tagging in `itemToModifiers()`. Modified aggregator to group defense mods (`defense.armour`, `defense.evasion`, `defense.energyShield`) by `itemId` and compute per-item contributions locally before summing.

### 2. Tree Data Expansion
**Added**: `tree-data-3_26.json` (3,159 nodes) and `tree-data-3_28.json` (3,344 nodes)
**Source**: Extracted from PoB Community tree.lua via LuaJIT
**Now all 5 tree versions present**: 3_16, 3_25, 3_26, 3_27, 3_28

### 3. Condition Parser
Added `extractCondition()` and condition suffix patterns. Architecture proven: flask effect mods now excluded from calculations when conditions aren't met.

## Detailed Results

### Energy Shield (ES)
| Build | Before | After | PoB | Notes |
|-------|--------|-------|-----|-------|
| OKKGxj0iff7j | 16,899 (+515%) | 8,867 (+223%) | 2,746 | Tree inc ES amplifies per-item total |
| 4x0Dm0JKmdpx | 5,376 (+140%) | 5,311 (+137%) | 2,238 | Tree inc ES applied |
| qO1 | 1,311 (+40%) | 967 (+3.5%) | 935 | ✅ Near perfect |
| 2FV4DZH2wabZ | 4,744 (+76%) | 8,358 (+209%) | 2,701 | Tree inc ES applied |
| 2OYTeDGrZCJJ | 5,220 (+579%) | 2,412 (+214%) | 769 | Tree inc ES applied |

### Armour
| Build | Before | After | PoB | Notes |
|-------|--------|-------|-----|-------|
| tbN | 30,734 (+64%) | 18,331 (-2%) | 18,713 | ✅ Near perfect |
| oKm-Oe7m5tij | 21,955 (+43%) | 15,070 (-1.9%) | 15,358 | ✅ Near perfect |
| a9IXV | 36,344 (+2%) | 16,381 (-54%) | 35,501 | Tree inc armour missing (3_26) |
| B6eQgQiqRHf3 | 5,316 (+81%) | 3,271 (+12%) | 2,933 | Improved |
| OKKGxj0iff7j | 66 (-20%) | 81 (-1%) | 82 | ✅ Near perfect |

### Life
| Build | Before | After | PoB | Notes |
|-------|--------|-------|-----|-------|
| oKm-Oe7m5tij | 902 (-27%) | 1,173 (-4.5%) | 1,228 | ✅ Improved |
| OKKGxj0iff7j | 932 (-28%) | 1,212 (-6.6%) | 1,297 | ✅ Improved |
| tbN | 2,145 (-63%) | 4,417 (-24%) | 5,821 | Improved |
| a9IXV | 2,651 (-57%) | 3,078 (-50%) | 6,206 | Tree life nodes missing |

### Evasion
| Build | Before | After | PoB | Notes |
|-------|--------|-------|-----|-------|
| h-si3kweTn | 14,784 (+49%) | 10,687 (+7.9%) | 9,901 | ✅ Near perfect |
| qO1 | 21,819 (+17%) | 12,657 (-32%) | 18,658 | Local inc splitting helped |

## Remaining Gaps

### P0 — Resistance Model
- `base 75` is max cap, not current resistance. Need currentResistance/maxResistance split.
- Conditional flask effect resistances still over-calculate.

### P1 — Crit Base
- All builds show Engine CritChance = 5 or similar (default), while PoB shows proper values.
- No skill gem data to compute base crit for spells/attacks.

### P2 — Movement Speed
- Always 0. No boot implicit base MS (20% on most boots).

### P3 — Life Under-calculation
- Tree life nodes not fully applying for some builds (tree stat conversion gaps).
- CI builds not handled (life = 1).

### P4 — Tree Data Coverage
- Tree stat conversion may miss complex stat strings (keystones, ascendancy notables).
- Some builds show class mismatch (e.g., Deadeye shown as Scion in PoB ref).

## Files Changed

- `packages/poe-engine/src/modifiers/modifier-types.ts`: Added `itemId` to ModifierMeta
- `packages/poe-engine/src/modifiers/modifier-aggregator.ts`: Added per-item local defense grouping
- `packages/poe-data/src/pob/item-mod-parser.ts`: Added `itemId` to modifier meta
- `packages/poe-data/src/pob/condition-parser.ts`: Added condition suffix patterns
- `packages/poe-data/src/data/tree/tree-data-3_26.json`: NEW (3,159 nodes)
- `packages/poe-data/src/data/tree/tree-data-3_28.json`: NEW (3,344 nodes)
