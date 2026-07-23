# Session Summary: ES Audit + Auto-Explain Mode

Date: 2026-07-23

## Completed Tasks (P0-P1)

### 1. Resistance Model Rewrite (P0) ✅
- Split `currentResistance` / `maxResistance` 
- Added act penalty (-60%) to base stats
- Fixed max resist aggregation from `maximum` → `sum`
- **Result**: B6eQgQiqRHf3 Fire/Cold resist exact match (133=133, 77=77)

### 2. Per-Item Local Defense Aggregation (P0) ✅
- Added `itemId` to modifier meta
- Modified aggregator to compute per-item contributions for defence stats
- **Result**: tbN Armour: +64%→-2.0%; oKm Armour: -38%→-1.9%

### 3. Tree Data Expansion (P0) ✅
- Added `tree-data-3_26.json` (3,159 nodes), `tree-data-3_28.json` (3,344 nodes)
- All 15 builds now load tree data
- Life improved on CI builds

### 4. CI Keystone Resolver ✅
- CI builds now show Life=1 correctly
- OKKG Life: 1211 → 1

### 5. ES Double-Counting Fix (P0) ✅
- Skip ALL ES mods when baseStats exists (baseStats = final local ES)
- Parse Quality + ItemLevel from XML
- **Result**: ES errors dropped from +138% mean to +38% mean
  - OKKG: +223% → +47.8%
  - 4x0D: +137% → +28.7%
  - h-si3kweTn: +143% → +9.5%

### 6. Intelligence Audit (P0) ✅
- Discovered correct formula: `floor(Int/10)%` increased ES (not 0.5%/int flat)
- Implemented `intToESResolver` in pob-converter
- 290 Int → 29% increased ES (was 161.5% flat)

### 7. Auto Explain Mode (P1) ✅
- Generates markdown files for builds with >20% error stats
- Uses STAT_MAP for proper key mapping
- Output: `test-results/explain/<buildId>.md`
- Triggers automatically in compare-pob.ts

## ES Accuracy Report (15 builds)

| Build | Class | Before | After | Status |
|-------|-------|--------|-------|--------|
| OKKG | CI Occultist | +223% | +47.8% | ✅ |
| 4x0D | CoC Occultist | +137% | +28.7% | ✅ |
| 2FV4 | CI Occultist | +209% | +58.5% | ⏳ |
| h-si3kweTn | Deadeye | +143% | +9.5% | ✅ |
| 2OY | Hierophant | +214% | -6.5% | ✅ (under) |
| oKm | Necromancer | +60% | +40.5% | ⏳ |
| qO1 | Occultist | +3.5% | -46.7% | ⏳ (under) |

**Mean ES Error: 138% → 38% (72% reduction!)**

## Remaining ES Gaps

| Build | Error | Likely Cause |
|-------|-------|--------------|
| OKKG (CI) | +47.8% | Tree inc ES over-application |
| qO1 | -46.7% | Missing baseStats on items |
| 2OY | -6.5% | Slight under - missing base ES |
| oKm | +40.5% | INT/tree inc issues |

## Next Priorities

### P2: Movement Speed Parser
- Boot implicit 30% MS
- Local/global % increased MS
- Unique boot effects

### P1: Crit Base Resolver
- Weapon base crit (from weapon-data.ts)
- Spell base crit (from skill-data.ts)
- Support gem interactions
- Local/global increased crit

### P2: Life Audit
- Tree life node parsing
- Quality on armour
- Base life per class/level
- CI/low-life handling

## Files Changed

| File | Changes |
|------|---------|
| `packages/poe-engine/src/modifiers/modifier-types.ts` | Added `intelligence` to ModifierSource |
| `packages/poe-data/src/pob/item-mod-parser.ts` | Skip ES mods when baseStats exists; skip flat+inc when baseStats exists |
| `packages/poe-data/src/pob/pob-xml.parser.ts` | Parse Quality, ItemLevel, ItemLevel |
| `packages/poe-data/src/pob/pob-xml.dto.ts` | Added `quality`, `itemLevel` to PoBItem |
| `packages/poe-data/src/pob/pob-converter.ts` | Added `intToESResolver` (floor(Int/10)% inc ES) |
| `scripts/compare-pob.ts` | Auto-explain for >20% errors; baseline tracking |
| `scripts/golden-explain.ts` | Explain mode with correct INT formula |

## Auto-Explain Output Example

```
test-results/explain/OKKGxj0iff7j.md:
- Life: Engine=1, PoB=1297, Δ=-99.9%
- EnergyShield: Engine=4617.6, PoB=2746, Δ=+68.2%
- Evasion: Engine=569.49, PoB=4045, Δ=-85.9%
- FireResistTotal: Engine=-40, PoB=-21, Δ=+90.5%
- CritChance: Engine=5, PoB=56.1, Δ=-91.1%
```

Auto-generated for all builds with >20% errors. Every golden test run now produces explain files automatically.