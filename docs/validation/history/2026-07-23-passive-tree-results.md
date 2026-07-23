# Passive Tree Results — Step 2 Analysis

Date: 2026-07-23
Builds tested: 5
Valid builds: 2 (Templar L94 Hierophant, Witch L96 Occultist)
Broken builds: 2 (manual Format B tree, no tree data), 1 (Shadow class/level mismatch)

## What Improved

### Life — Huge improvement
| Build | Before | After | PoB Ref | Gap change |
|-------|--------|-------|---------|------------|
| Templar L94 | 1867 (-91%) | 6662 (-68%) | 20854 | **+23pp** closer |
| Witch L96 | 1598 (-74%) | 3787 (-38%) | 6148 | **+36pp** closer |

Tree passives now correctly apply `(baseLife + flatLife) * (1 + incLife/100)`. The remaining gap (~14k Templar, ~2.4k Witch) is from item life mods.

### Energy Shield
| Build | Before | After | PoB Ref |
|-------|--------|-------|---------|
| Templar L94 | 79 | 129 (+63%) | 0 (PoB shows 0 ES) |
| Witch L96 | 0 | 42 | 935 |

Now correctly applies tree ES nodes (flat + increased) to the same `defense.energyShield` stat.

### Attack/Cast Speed
| Build | Before | After | PoB Ref |
|-------|--------|-------|---------|
| Templar CastRate | 1.0 | 1.51 | 3.8 |
| Witch Speed | 1.0 | 1.5 | 2.76 |

Tree attack/cast speed nodes now apply as increased on the base 1.0.

### Crit Chance
| Build | Before | After | PoB Ref |
|-------|--------|-------|---------|
| Witch L96 | 5 | 6 | 12.56 |

Tree crit nodes contribute, but most comes from items.

### Match Rate (accurate builds only)
- Witch L96: **4/12 → 5/12** (33.3% → 41.7%) ✓
- Templar L94: 0/13 unchanged (life still well outside 1%)

## What Did NOT Improve

### Evasion — still 0
Both Templar and Witch have 0 evasion. Tree has evasion nodes but stat-string-parser doesn't cover all patterns.
- Templar: POB=413, ENG=0
- Witch: POB=18658, ENG=0

### Armour — still from items only
Templar: POB=414, ENG=48 (from tree, but no item armour mods parsed yet)

### ChaosResist — worse after tree
Templar: POB=25, ENG=75 (was 25 from gear, now 75 from tree nodes + no act penalty)
Witch: POB=27, ENG=75 (was 0, now tree chaos resist capped at 75)

Root cause: tree adds chaos resist nodes (+17% each), but without the act penalty (-60%), the capped value is 75 instead of PoB's actual ~25.

### Manual builds (boneshatter-jugg, firetrap-elementalist) — 0 improvement
Format B (Base64 encoded) tree specs not parsed. No tree data applied.

## Remaining Biggest Gaps (by diff magnitude on valid builds)

### #1: Missing Item Mods
**Affects:** Life, ES, Armour, Evasion, Crit, Speed
**Impact:** Largest gap for all valid builds
**Evidence:**
- Templar Life: 6662 vs 20854 — 68% error, ~14k life missing from items
- Witch ES: 42 vs 935 — 96% error, ES entirely from items
- Templar Crit: 5 vs 64.95 — 92% error, most crit from gear/tree unsupported
- Witch Evasion: 0 vs 18658 — 100% error, evasion from items

### #2: Resist Act Penalty
**Affects:** Fire/Cold/Lightning/Chaos Resist
**Impact:** 110-152% mean error, top 6 of top 10 discrepancies
**Evidence:** -60 penalty not applied → engine overestimates all resists by 60 points

### #3: Skill Base Data
**Affects:** Speed, CastRate, Crit
**Impact:** 46-60% mean error
**Evidence:** Engine uses base 1.0/5%, PoB uses actual skill stats with weapon base + gem + supports

### #4: MovementSpeed — unimplemented
**Affects:** All builds, 100% error
**Impact:** Low direct impact on validation priority

## Recommended Next Priority

**Step 3 — Item Mod Parser coverage** is confirmed by data as the #1 gap.

The critical mods to cover (by diff impact):
| Priority | Mod Type | Affected Stats | Expected Gain |
|----------|----------|----------------|---------------|
| P0 | flat +life, %inc life | Life | +20% (closes 68%→30% gap) |
| P0 | flat resists | Fire/Cold/Lightning/Chaos | +15% (closes resist gaps) |
| P1 | flat ES, %inc ES | EnergyShield | +10% |
| P1 | flat Armour, %inc Armour | Armour | +5% |
| P1 | flat Evasion | Evasion | +5% |
| P2 | %inc speed | Attack/Cast Speed | +5% |
| P2 | %inc crit | Crit Chance | +5% |

After Step 3, the act penalty (-60%) should be added to the resist model, which will fix the remaining resist gap.
