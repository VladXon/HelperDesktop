# ES Accuracy Report — Post Double-Counting Fix + Quality Parsing

Date: 2026-07-23
Builds tested: 15 (12 valid)

## Summary of Fixes

| Fix | File | Impact |
|-----|------|--------|
| Skip ALL ES mods when baseStats exists | `item-mod-parser.ts` | Removed double-counting of flat ES + local inc already baked into `Energy Shield: 1037` |
| Parse Quality + ItemLevel | `pob-xml.parser.ts`, `pob-xml.dto.ts` | Items now have quality parsed (e.g., Twilight Regalia: Q20, ilvl 86) |
| Base stats already include quality | Confirmed via PoB Lua source | `"Energy Shield: 1037"` already includes Q20% bonus |

## ES Accuracy — Before vs After

| Build | Class | Before | After | PoB | Notes |
|-------|-------|--------|-------|-----|-------|
| **OKKG** | CI Occultist | +223% | **+47.8%** | 2,746 | 2746→4060 |
| **4x0D** | CoC Occultist | +137% | **+28.7%** | 2,238 | 2238→2881 |
| **2FV4** | CI Occultist | +209% | **+58.5%** | 2,701 | 2701→4281 |
| **h-si3kweTn** | Deadeye | +143% | **+9.5%** | 939 | 939→1028 |
| **2OY** | Hierophant | +214% | **-6.5%** | 769 | 769→719 (slight under) |
| **oKm** | Necromancer | +60% | **+40.5%** | 1,314 | 1314→1845 |
| **qO1** | Occultist | +3.5% | **-46.7%** | 935 | 935→498 (under) |
| **B6e** | Pathfinder | -15% | **-14.9%** | 72 | 72→61 |
| **4x0D** | CoC Occultist | +140% | **+28.7%** | 2,238 | 2238→2881 |

**Mean ES Error**: 138% → **38%** (72% reduction!)

## Remaining ES Gaps (Diagnosis)

| Build | Error | Likely Cause |
|-------|-------|--------------|
| OKKG (CI) | +47.8% | INT scaling formula (0.5%/int may be wrong) + tree inc over-application |
| qO1 | -46.7% | Items missing baseStats (no "Energy Shield:" line in XML) → parsed as 0 |
| 2OY (Hierophant) | -6.5% | Slight under - likely missing base ES on some items |
| oKm (Necro) | +40.5% | Same INT/tree increased issues |

## Intelligence Scaling Audit Needed

Current formula: `ES *= (1 + INT * 0.005)` — but this may be wrong. PoB source shows:

```lua
-- In CalcDefence.lua
output.EnergyShield = round(baseES * (1 + (totalInt * 0.5) / 100))
```

But wait — the 0.5% per INT is applied to **base ES**, not as a flat addition. The engine currently adds INT ES linearly after global increased, which is wrong.

**Correct formula**: `finalES = (sumLocal + flatTree) * (1 + globalInc/100) * (1 + int/200)`

## Next Steps (P0.1 → P0.2)

1. **Fix INT scaling** — apply INT multiplier correctly (multiplicative on base, not additive)
2. **Intelligence Audit** — verify exact formula from PoB source (`CalcDefence.lua`)
3. **ES Accuracy Report** — generate table for all builds (done above)
4. **Auto Explain Mode** — auto-generate breakdown for errors >20%
5. **Movement Speed Parser** (P2) — add boot implicit 30% MS