# Passive Tree Phase 1 — Minimal Implementation

Date: 2026-07-23
Builds tested: 5 (3 valid pobb.in + 2 manual)

## Changes

### Fixed
- `pob-xml.parser.ts`: parseTreeSection now reads `nodes` attribute (comma-separated node IDs) instead of only socket node IDs
- Created `stat-string-parser.ts`: maps PoB stat strings to engine modifiers
- Created `tree-converter.ts`: loads tree JSON data, looks up node IDs, generates modifiers
- Created `tree-data-3_16/3_25/3_27.json`: extracted from PoB Community tree.lua via LuaJIT
- Increased modifiers now target base stat (e.g., `defense.life`) not separate `Increased` variant, enabling proper aggregation

### What's Covered

Stats parsed from tree nodes:
| Category | Stats |
|----------|-------|
| Attributes | Strength, Dexterity, Intelligence (flat +) |
| Life | flat + to maximum Life, % increased maximum Life |
| Defence | Energy Shield (flat +), Armour (flat +, % inc), Evasion (flat +, % inc) |
| Resistances | Fire, Cold, Lightning, Chaos, All Elemental |
| Offence | Generic/Elemental/Physical/Chaos/Spell damage (%), Attack/Cast Speed (%), Crit Chance (%), Crit Multiplier (%), Accuracy (flat), Movement Speed (%) |

## Results

### Before (baseline v0.1)
- Overall accuracy: 16.7%
- Mean absolute error: 88.70%
- Templar Life: ENG=1867 vs POB=20854 (-91.05%)
- Witch Life: ENG=1598 vs POB=6148 (-74.01%)

### After (passive tree)
- Overall accuracy: 16.7% (unchanged — accuracy is binary within 1%)
- Mean absolute error: 93.91% (slight increase due to Shadow broken build)

But per-build direction is correct:
- **Templar Life**: 1867 → 6662 (-91% → -68%) ✓
- **Witch Life**: 1598 → 3787 (-74% → -38%) ✓
- **Templar ES**: 79 → 129 (+63%) ✓
- **Witch ES**: 0 → 42 (now has ES from tree) 
- **Shadow Life**: 1518 → 3228 (broken build, class/level mismatch worsens)

### Per-Build Mean Error
| Build | Before | After | Change |
|-------|--------|-------|--------|
| Templar L94 | 69.29% | 65.92% | −3.37pp |
| Witch L96 | 48.64% | 50.81% | +2.17pp (ES now counted vs 0) |
| Shadow L1(broken) | 75.85% | 101.39% | +25.54pp (life tree on wrong base) |
| Boneshatter(manual) | 124.82% | 124.82% | 0pp (no tree data in Format B) |
| Firetrap(manual) | 140.36% | 140.36% | 0pp (no tree data in Format B) |

### Top remaining gaps
1. Resists: act penalty (-60%) not modeled — affects manual builds
2. Life: still ~2-3× short due to missing item mods
3. EnergyShield: ~20× short due to missing item ES
4. Evasion: 0 in engine, tree gives none for Templar/Witch
5. Crit Chance: 5 engine vs 12-65 PoB — missing tree + item crit
6. Speed: engine base 1.0 vs PoB 2.76-4.56 — missing skill/support/gear speed
7. ChaosResist: capped at 75 in engine, should be lower

## Next Steps

**Step 3 — Item Parser coverage** will be the next biggest gain:
- Life/ES/Armour/Evasion from gear (flat + inc)
- Resists from gear
- Speed from gear
- Crit from gear

Commit: (pending)
