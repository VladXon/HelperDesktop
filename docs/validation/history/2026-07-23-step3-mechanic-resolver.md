# Step 3.2 — Mechanic Resolver + Item Mod Parser

**Date:** 2026-07-23
**Builds tested:** 5 (2 valid, 3 excluded — Format B tree / classId mismatch)
**Total comparisons:** 25
**Overall accuracy:** 16.0%

## Changes Since Baseline v0.1

1. **Item Mod Parser** (`item-mod-parser.ts`): config-driven pattern table (~30 patterns)
   - Coverage: 45% → 71% (28→44 parsed mods on Templar)
   - Fixes: regex strictness, negative values, `{crafted}` prefix, ranged values, max resist case, life regen ordering, spell crit / global crit multi
   - Architecture: increased mods now target base stat (`defense.armour` with `type: 'increased'`) instead of `*Increased` stats — matches engine aggregator

2. **Act Resistance Penalty**: Added `'game'` source to `ModifierSource`, penalty modifiers for chaos (-60) in `convertPobDto`. Validated: Templar ChaosResistTotal 25/25 ✓, Witch 27/27 ✓

3. **Mechanic Resolver Architecture**:
   - `MechanicResolver` interface with trigger-based activation
   - `collectMechanicTriggers` scans raw mod texts pre-parsing
   - `buildSlotLookup` fixed: uses only first (active) item set instead of merging all sets
   - `es-to-life-resolver`: The Apostate ES→Life conversion implemented but produces only partial effect (Templar Life: 6,855→10,110, +47%)

## Results

### Accuracy by Stat

| Stat | Comparisons | Within 1% | Accuracy | Mean Error |
|---|---|---|---|---|
| Resistances (chaos) | 2 | 2 | 100.0% | 0.0% |
| Armour | 2 | 1 | 50.0% | 43.0% |
| CritMultiplier | 2 | 1 | 50.0% | 28.1% |
| Life | 2 | 0 | 0.0% | 43.8% |
| FireResistTotal | 2 | 0 | 0.0% | 26.9% |
| ColdResistTotal | 2 | 0 | 0.0% | 30.3% |
| Speed | 2 | 0 | 0.0% | 59.7% |
| CastRate | 1 | 0 | 0.0% | 60.3% |
| LightningResistTotal | 2 | 0 | 0.0% | 61.2% |
| CritChance | 2 | 0 | 0.0% | 69.8% |
| EnergyShield | 2 | 0 | 0.0% | 97.7% |
| Evasion | 2 | 0 | 0.0% | 100.0% |
| MovementSpeedMod | 2 | 0 | 0.0% | 100.0% |

### Per-Build Summary

| Build | Class | Level | Comparisons | Pass | Accuracy | Mean Error | Status |
|---|---|---|---|---|---|---|---|
| boneshatter-jugg | Scion | 90 | — | — | — | — | EXCLUDED |
| firetrap-elementalist | Scion | 92 | — | — | — | — | EXCLUDED |
| kEFJVYTEJvih | Templar | 94 | 13 | 1 | 7.7% | 52.5% | |
| qO1 | Witch | 96 | 12 | 3 | 25.0% | 48.7% | |
| Vt0egZ5HIREa | Scion | 1 | — | — | — | — | EXCLUDED |

### Key Discrepancies

| Build | Stat | PoB | Engine | Diff% |
|---|---|---|---|---|
| Templar | Life | 20,854 | 10,110 | -51.5% |
| Templar | Armour | 414 | 58 | -86.1% |
| Templar | CritChance | 64.95 | 8.20 | -87.4% |
| Templar | CritMultiplier | 397 | 174 | -56.2% |
| Templar | Evasion | 413 | 0 | -100.0% |
| Templar | Speed | 3.80 | 1.00 | -73.7% |
| Witch | Life | 6,148 | 3,929 | -36.1% |
| Witch | ES | 935 | 42 | -95.5% |
| Witch | Evasion | 18,658 | 0 | -100.0% |
| Witch | CritChance | 12.55 | 6.00 | -52.2% |

## Remaining Gaps

1. **Life gap (primary)**: Templar 10,110 vs 20,854. ES→Life converter adds ~3,255 of the missing 14,000. Remaining ~10,744 from passive tree life nodes not yet parsed — passive tree coverage is estimated ~30%.
2. **ES gap (Witch)**: 42 vs 935. Missing ES mod patterns (flat ES on body, helm, increased ES clusters), plus missing tree ES nodes.
3. **Crit gap**: Missing base crit from weapon/skill gems, missing global crit multi from tree.
4. **Speed gap**: No skill gem base data. Engine uses default 1.0 base speed instead of skill-specific values.
5. **Evasion**: No evasion from items parsed (missing flat/increased evasion patterns for armour/evasion hybrids).

## Files Changed

- `packages/poe-data/src/pob/item-mod-parser.ts` — created
- `packages/poe-data/src/pob/resolvers/mechanic-resolver.ts` — created
- `packages/poe-data/src/pob/resolvers/es-to-life-resolver.ts` — created
- `packages/poe-data/src/pob/pob-converter.ts` — updated (resolver pipeline, game penalties)
- `packages/engine/src/modifier/types.ts` — updated (`'game'` source)

## Next Priority

Step 3.3 — Skill gem data import (base attack/cast speed, base crit, base damage from weapon→skill interaction)
