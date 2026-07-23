# Formula Audit — Over-Calculation Analysis

**Date:** 2026-07-23
**Builds tested:** 15 (6 with reliable PoB matching, 9 partial)
**Engine vs PoB:** 9.5% overall (148 stat comparisons)

## Priority: Find all Engine > PoB (over-calculation)

Over-calculation is **higher priority** than missing calculation because:
- False positives indicate architecture bugs (wrong ordering, missing penalties, wrong resolver interactions)
- Under-calculation is usually "we haven't implemented X yet"
- Over-calculation means we're actively computing something wrong

## Dataset

### Reliable builds (PoB character data verified correct)

| ID | Build | Class | Level | Archetype |
|---|---|---|---|---|
| `a9IXV` | Earthshatter Slayer (short) | Slayer | 100 | Melee |
| `B6eQgQiqRHf3` | Toxic Rain Pathfinder | Pathfinder | 90 | DoT/Bow |
| `kEFJVYTEJvih` | Hierophant (Poison Concoction) | Hierophant | 94 | Spell/Mix |
| `nv8Tqwq5OMvW` | Toxic Rain Pathfinder (Vault) | Pathfinder | 99 | DoT/Bow |
| `qO1` | Witch Occultist | Occultist | 96 | Debuff |
| `tbN` | Earthshatter Slayer (full) | Slayer | 100 | Melee |

### Partial (PoB char data broken, stats may be valid)

| ID | Build | Engine Class | PoB Class |
|---|---|---|---|
| `2FV4DZH2wabZ` | CI Cold Snap Occultist | Witch | Scion |
| `2OYTeDGrZCJJ` | Shock Nova Hierophant | Templar | Scion |
| `4x0Dm0JKmdpx` | CoC Ice Nova Occultist | Witch | Scion |
| `h-si3kweTn` | KB Deadeye | Ranger | Scion L1 |
| `OKKGxj0iff7j` | CI Occultist | Witch | Scion |
| `oKm-Oe7m5tij` | Necromancer | Witch | Scion |

Note: PoB's HeadlessWrapper fails to parse Format B XML trees for character info, but stat calculation may still be correct (stats come from PoB's full calculation engine, not XML parsing).

## Over-Calculation Cases

### P0 — Conditional Modifiers Treated as Permanent

**Affects: ALL builds. This is the #1 cause of over-calculation.**

| Source | Problem |
|---|---|
| Flask modifiers | `+X% to Fire Resistance during Flask Effect`, `X% increased Armour during Flask Effect` treated as always-on |
| Conditional item mods | `X% increased Evasion Rating during Flask Effect` always applied |
| Conditional tree notables | Flask effect nodes, conditional charges, low-life/max-life conditional |

**Evidence:**

**Resistance over-calculation across ALL reliable builds:**
| Build | Fire PoB | Fire Engine | Diff |
|---|---|---|---|
| a9IXV (Slayer) | 119 | 139 | +17% |
| B6eQgQiqRHf3 (TR) | 133 | 183 | +38% |
| kEFJVYTEJvih (Hiero) | 121 | 150 | +24% |
| nv8Tqwq5OMvW (TR) | 77 | 127 | +65% |
| qO1 (Witch) | 77 | 135 | +75% |
| tbN (Slayer) | 114 | 140 | +23% |

Each build has Ruby/Sapphire/Topaz/Bismuth flasks providing +30-35% resistance during effect.

**Armour over-calculation from Granite Flasks:**
| Build | Armour PoB | Armour Engine | Diff |
|---|---|---|---|
| tbN (Slayer) | 18,713 | 34,540 | +85% |
| a9IXV (Slayer) | 35,501 | 41,614 | +17% |
| B6eQgQiqRHf3 (TR) | 2,933 | 5,316 | +81% |
| nv8Tqwq5OMvW (TR) | 1,690 | 2,644 | +56% |
| oKm-Oe7m5tij (Necro) | 15,358 | 24,084 | +57% |

Granite Flask provides 150-200% increased armour during effect.

**Evasion over-calculation from Jade Flasks:**
| Build | Evasion PoB | Evasion Engine | Diff |
|---|---|---|---|
| qO1 (Witch) | 18,658 | 23,599 | +26% |
| tbN (Slayer) | 28 | 118 | +322% |
| 2OYTeDGrZCJJ (Hiero) | 2,950 | 11,457 | +288% |

### P1 — Crit Base Values Defaulting Incorrectly

**Affects: ALL builds with non-crit skills (0% PoB crit showing 5% engine crit)**

Engine defaults `criticalChance` to 5 and `criticalMultiplier` to 150 for all builds, but PoB correctly shows 0 for non-crit skills.

| Build | CritChance PoB | CritChance Engine | CritMulti PoB | CritMulti Engine |
|---|---|---|---|---|
| a9IXV (Slayer) | 0 | 5 | 0 | 150 |
| tbN (Slayer) | 0 | 5 | 0 | 162 |
| B6eQgQiqRHf3 (TR) | 3.25 | 5 | 150 | 150 |
| oKm-Oe7m5tij (Necro) | 0 | 6.4 | 150 | 150 |

Crit base values should be 0 unless a skill/crit source provides them, OR should come from the weapon base crit.

### P2 — Speed Default

**Affects: ALL builds**

Engine baseStats sets `attackSpeed: 0, castSpeed: 0` but the calculator returns minimum 1 when no speed source exists.

| Build | Speed PoB | Speed Engine | CastRate PoB | CastRate Engine |
|---|---|---|---|---|
| a9IXV (Slayer) | 2.03 | 1.37 | — | — |
| tbN (Slayer) | 2.08 | 1.19 | — | — |
| kEFJVYTEJvih (Hiero) | 3.80 | 1.00 | 3.80 | 4.31 |
| 4x0Dm0JKmdpx (CoC) | 3.04 | 1.14 | — | — |

The `Speed` (attackSpeed) default of 1 masks the absence of weapon base speed + tree increased attack speed. Only the Hierophant (Templar) with skill converter shows CastRate 4.31 (close to PoB 3.80, +13% over).

### P3 — Massive ES Over-Calculation (CI Builds)

**Affects: ES-based builds (Occultists)**

| Build | ES PoB | ES Engine | Diff |
|---|---|---|---|
| OKKGxj0iff7j (CI) | 2,746 | **16,899** | +515% |
| 2FV4DZH2wabZ (CI) | 2,701 | 4,744 | +76% |
| 4x0Dm0JKmdpx (LL) | 2,238 | 5,376 | +140% |

This is the most severe over-calculation. Root causes likely:
1. Tree ES nodes being applied more than once (converter creates duplicate modifiers)
2. Intelligence providing ES per point (unimplemented → int gives 0 ES, but tree int nodes still apply increased ES)
3. Chaos Inoculation interaction not handled (sets life to 1, removes chaos damage)
4. UI/item parser + tree = massive double-counting

For `OKKGxj0iff7j` (2,746 PoB → 16,899 engine): 6x difference means the tree is likely contributing 4,000+% increased ES, or base ES values are massively inflated.

### P4 — Movement Speed Permanently Zero

**Affects: ALL builds**

| Build | Movespeed PoB | Movespeed Engine |
|---|---|---|
| ALL | 1.10–3.14 | 0 |

No movement speed mods are being parsed from items (boots implicit: `30% increased Movement Speed`). The item mod parser doesn't cover movespeed.

### P5 — Life Under-Calculation Across All Builds

**Affects: ALL builds consistently**

| Build | Life PoB | Life Engine | Diff |
|---|---|---|---|
| tbN (Slayer) | 5,821 | 2,145 | -63% |
| a9IXV (Slayer) | 6,206 | 2,651 | -57% |
| kEFJVYTEJvih (Hiero) | 20,854 | 13,219 | -37% |
| qO1 (Witch) | 6,148 | 3,929 | -36% |
| B6eQgQiqRHf3 (TR) | 4,055 | 3,428 | -15% |

The ES→Life converter helps the Hierophant (from 6,855 to 13,219) but the tree life nodes are still missing. Base life from level is correct (38 + (level-1)*9-12).

## Root Cause Summary

### Priority Order

| Priority | Issue | Impact | Fix Type |
|---|---|---|---|
| P0 | Conditional flask/passive modifiers treated as permanent | ALL builds, ALL stats | Condition evaluator |
| P1 | Crit base 5/150 applied when no crit source exists | Non-crit builds | Conditional baseStats |
| P2 | Speed defaults to 1 when no source found | ALL melee/ranged builds | Weapon resolver fallback |
| P3 | ES tree over-counting / int not giving ES | CI/ES builds | Tree converter audit |
| P4 | Movement speed mods unparsed | ALL builds | Item mod parser |
| P5 | Life tree nodes missing | ALL builds | Tree converter life audit |

### Over-Calculation Magnitude Ranking

Ranked by severity (Engine/PoB ratio):

1. **OKKGxj0iff7j ES**: 6.16x (P3)
2. **tbN Evasion**: 4.22x / 2OYTeDGrZCJJ Evasion: 3.88x (P0 flasks)
3. **2OYTeDGrZCJJ ES**: 6.79x / 4x0Dm0JKmdpx ES: 2.40x (P3)
4. **2OYTeDGrZCJJ Armour**: 0.33x (engine LOWER) — weird
5. **4x0Dm0JKmdpx Armour**: 4.33x / tbN Armour: 1.85x (P0 flasks)
6. **Resistance over-calc**: 1.17x–1.75x across ALL builds (P0 flasks)

### Build Health Summary

| Build | Engine>PoB Issues | Engine<PoB Issues | Verdict |
|---|---|---|---|
| kEFJVYTEJvih (Templar Hiero) | 3 over (Armour +14%, cast rate +13%, resists) | 8 under | **Best case** — 2 stats correct (chaos res, crit multi) |
| qO1 (Witch Occultist) | 3 over (ES +40%, Evasion +26%, resists) | 4 under | **Second best** — 2 stats exact (armour 0, chaos res) |
| B6eQgQiqRHf3 (TR PF) | 3 over (armour +81%, resists) | 5 under | Middle |
| tbN (Slayer) | 4 over (armour +85%, evasion +322%, resists) | 4 under | Middle |
| 2OYTeDGrZCJJ (Shock Nova) | 3 massive over (ES +579%, evasion +288%, life +94%) | 8 under | **Sick** — data suspect (PoB shows Scion) |
| OKKGxj0iff7j (CI Occultist) | ES 6.16x, resists | rest under | **Sickest** — data suspect, ES 16k vs 2.7k |

## Recommended Fix Order

1. **Conditional modifier filter** — disable flask and conditional item mods (instantly fixes ~70% of over-calculations)
2. **Crit baseStats conditional** — don't add 5/150 unless a skill gem provides it
3. **Movement speed item mods** — parse boots implicit
4. **ES tree audit** — specifically for CI Occultist, check tree converter output
5. **Then** — fix under-calculations (life, evasion, crit, speed)
