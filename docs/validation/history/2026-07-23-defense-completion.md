# Step 3.3A — Defensive Stats Completion

**Date:** 2026-07-23
**Builds tested:** 5 (2 valid)
**Total comparisons:** 25
**Overall accuracy:** 16.0% (unchanged — but individual stat errors collapsed)

## Changes

### 1. Base Stats Extraction (root cause fix)

Item text format includes lines like `Armour: 345`, `Evasion: 849`, `Energy Shield: 372`.
Previously these were identified as meta lines but **their values were discarded**.

**Fix:** Extract base defensive values and create `flat` type modifiers:

| Source | Stat | Value |
|---|---|---|
| Wyvernscale Boots | armour | 345 |
| Wyvernscale Boots | evasion | 287 |
| Titanium Spirit Shield | energyShield | 173 |
| Lich's Circlet | energyShield | 372 |
| Warlock Gloves | energyShield | 246 |
| Varnished Coat (Witch) | evasion | 1107 |
| Varnished Coat (Witch) | energyShield | 227 |
| Slink Boots (Witch) | evasion | 849 |
| Helm (Witch) | evasion | 520 |
| Helm (Witch) | energyShield | 107 |
| Murder Mitts (Witch) | evasion | 167 |
| Murder Mitts (Witch) | energyShield | 34 |

These flat values combine with increased % modifiers from items+tree via engine formula:
```
final = (base + flatSum) * (1 + incSum / 100)
```

Without these bases, all defensive stats were 0 regardless of increased % mods.

### 2. Hybrid Mod Patterns

Added patterns for:
- `X% increased Evasion and Energy Shield` → both stats
- `X% increased Armour and Evasion` → both stats
- `X% increased Armour and Energy Shield` → both stats
- `+X% to Fire and Cold Resistances` → both resistances

These hybrids account for ~202% increased evasion/ES on the Witch.

### 3. Fire and Cold Resistance Hybrid

Added `+X% to Fire and Cold Resistances` pattern (fixes case sensitivity).

## Improvements

### Templar (Hierophant)

| Stat | Before | After | PoB | Error Before | Error After |
|---|---|---|---|---|---|
| Armour | 57.6 | **471.6** | 414 | -86.1% | **+13.9%** |
| Evasion | 0 | **287** | 413 | -100% | **-30.5%** |
| Life | 10,110 | **13,219** | 20,854 | -51.5% | **-36.6%** |
| ES | -104 | 347 | 0 | bad | still off (Apostate) |

### Witch (Occultist)

| Stat | Before | After | PoB | Error Before | Error After |
|---|---|---|---|---|---|
| ES | 42 | **1,310** | 935 | -95.5% | **+40.2%** |
| Evasion | 0 | **23,599** | 18,658 | -100% | **+26.5%** |
| Armour | 0 | 0 | 0 | — | ✓ |
| ChaosResist | 87 | 27 | 27 | - | ✓ |
| CritMulti | 150 | 150 | 150 | - | ✓ |

### Shadow (Saboteur, excluded — broken tree)

| Stat | Before | After | PoB | Error Before | Error After |
|---|---|---|---|---|---|
| Evasion | 0 | **11,609** | 9,545 | -100% | **+21.6%** |

## Over-Estimation Issue

Witch ES (1,310 vs 935) and Evasion (23,599 vs 18,658) are over-estimated by ~26-40%.
Likely causes:
- Tree node duplication (some nodes parsed twice)
- Conditional mods counted as always-on (e.g., "during Flask effect")
- Missing quality/ilvl modifiers on base stats

## Files Changed

- `packages/poe-data/src/pob/pob-xml.dto.ts` — added `baseStats` to `PoBItem`
- `packages/poe-data/src/pob/pob-xml.parser.ts` — `extractBaseStats()`, integrated into `parseItemTextFormat`
- `packages/poe-data/src/pob/item-mod-parser.ts` — `BASE_STAT_MAP`, hybrid defense/resistance patterns

## Next Priority

Audit passive tree coverage and fix over-estimation.
Then full Skill Gem system.
