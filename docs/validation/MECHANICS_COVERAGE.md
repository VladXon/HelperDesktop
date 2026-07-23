# PoE Engine Mechanics Coverage Checklist

**Purpose**: Track which game mechanics are modeled in the engine vs. missing/stubbed.  
**Goal**: Zero P0 gaps before release; P1 tracked for post-launch.

---

## Coverage Legend
| Status | Meaning |
|--------|---------|
| ✅ **Done** | Fully implemented, tested, matches PoB |
| ⚠️ **Partial** | Core logic works, edge cases missing |
| 🔧 **Stub** | Returns 0/placeholder, acknowledged gap |
| ❌ **Missing** | No implementation at all |

---

## Defense Layer

| Mechanic | Status | Engine Location | PoB Reference | Notes |
|----------|--------|-----------------|---------------|-------|
| Life (flat + %inc + base) | ✅ | `defense.calculator.ts:27-35` | `Calcs.life` | Class-avg base life (12/lvl) |
| Energy Shield (flat + %inc) | ✅ | `defense.calculator.ts:37-39` | `Calcs.energyShield` | No ward support |
| Mana (flat + %inc + base) | ✅ | `defense.calculator.ts:28-30` | `Calcs.mana` | |
| Armour | ✅ | `defense.calculator.ts:72` | `Calcs.armour` | +dex conversion ✅ |
| Evasion | ✅ | `defense.calculator.ts:73` | `Calcs.evasion` | +dex conversion ✅ |
| **Block (Attack/Spell)** | ✅ | `stat-resolver.ts:207-210` | `Calcs.blockChance` | From mods |
| **Spell Suppression** | ✅ | `stat-resolver.ts:206` | `Calcs.spellSuppression` | From mods |
| **Resistances (Ele/Chaos)** | ✅ | `stat-resolver.ts:184-189` | `Calcs.resistances` | All res / ele res / max res |
| **Max Resistances** | ✅ | `stat-resolver.ts:190-194` | `Calcs.maxResistances` | |
| Phys Reduction (armour formula) | ⚠️ | `defense.calculator.ts:76-78` | `Calcs.physReduction` | Fixed 1000 dmg assumption |
| Evade Chance | ⚠️ | `defense.calculator.ts:81-83` | `Calcs.evadeChance` | Fixed 10k accuracy |
| **Life Regen (flat + %/s)** | ✅ | `stat-resolver.ts:211` / `defense:85` | `Calcs.lifeRegen` | |
| **Life on Block** | ✅ | `stat-resolver.ts:212` / `defense:116` | `Calcs.lifeOnBlock` | |
| ES Recharge | ⚠️ | `defense.calculator.ts:117-118` | `Calcs.esRecharge` | Fixed 20%/2s delay |
| **Leech** | 🔧 | `defense.calculator.ts:87-92` | `Calcs.leech` | **STUB: returns 0** |
| **Recoup** | 🔧 | `defense.calculator.ts:119` | `Calcs.recoup` | **STUB: returns 0** |
| **Ailment Immunity** | 🔧 | `defense.calculator.ts:140` | `Calcs.ailmentImmunity` | **STUB: empty object** |
| **Guard Skills** | 🔧 | `defense.calculator.ts:94-95` | `Calcs.guardSkill` | **STUB: null** |

---

## Offense Layer

| Mechanic | Status | Engine Location | PoB Reference | Notes |
|----------|--------|-----------------|---------------|-------|
| **Hit Damage (Phys/Ele/Chaos)** | ⚠️ | `damage.calculator.ts:93-116` | `Calcs.averageHit` | No skill gem data integration |
| **Flat Damage (adds X-Y)** | ✅ | `stat-resolver.ts:123-159` | `Calcs.flatDamage` | All 5 types parsed |
| **% Increased Damage** | ✅ | `stat-resolver.ts:161-169` | `Calcs.incDamage` | By type + generic |
| **% More Damage** | ✅ | `poe-engine/modifiers` | `Calcs.moreDamage` | Via modifier pipeline |
| **Crit Chance** | ✅ | `stat-resolver.ts:204-205` | `Calcs.critChance` | Base + global |
| **Crit Multiplier** | ✅ | `stat-resolver.ts:205` | `Calcs.critMultiplier` | Base + global |
| **Attack/Cast Speed** | ✅ | `stat-resolver.ts:202-203` | `Calcs.attackSpeed/castSpeed` | |
| **Penetration** | ✅ | `damage.calculator.ts:28-30` | `Calcs.penetration` | Only fire implemented |
| **Enemy Resistance** | ⚠️ | `damage.calculator.ts:25-26` | `Calcs.enemyResist` | Config-driven, no map mods |
| **Damage Conversion** | ⚠️ | `stat-resolver.ts` (partial) | `Calcs.conversion` | **Only X→Y, not chains** |
| **Gain as Extra** | ❌ | — | `Calcs.gainAsExtra` | **NOT IMPLEMENTED** |
| **Damage Taken As** | ❌ | — | `Calcs.takenAs` | **NOT IMPLEMENTED** |

---

## Damage over Time (DoT)

| Mechanic | Status | Engine Location | Notes |
|----------|--------|-----------------|-------|
| **Poison** | 🔧 | `damage.calculator.ts:85-86` | **STUB: dotDps=0** |
| **Ignite** | 🔧 | `damage.calculator.ts:85-86` | **STUB: dotDps=0** |
| **Bleed** | 🔧 | `damage.calculator.ts:85-86` | **STUB: dotDps=0** |
| **Cruelty** | ❌ | — | Not modeled |
| **Wither Stacks** | 🔧 | `damage.calculator.ts:87` | **STUB: 0** |
| **Shock Effect** | 🔧 | `damage.calculator.ts:88` | **STUB: 0** |
| **Ailment Stacking Rules** | ❌ | — | No stack tracking |

---

## Advanced Mechanics

| Mechanic | Status | Notes |
|----------|--------|-------|
| **Impale** | ❌ | Phys reduction per stack (max 5) |
| **Overwhelm** | ❌ | % phys reduction penetration |
| **Exposure** | ❌ | -% res per hit (fire/cold/lightning) |
| **Conversion Chains** | ⚠️ | Phys→Fire→Lightning not supported |
| **Taken As** | ❌ | "X% of Y Damage taken as Z" |
| **Gain as Extra** | ❌ | "Gain X% of Y as Extra Z" |
| **Minions** | ❌ | Separate entity, own stats/skills |
| **Traps** | ❌ | Throwing time, cooldown recovery |
| **Mines** | ❌ | Detonation time, radius, cascade |
| **Totems** | ❌ | Totem life, placement limit |
| **Brands** | ❌ | Attachment, recall, activation freq |
| **Timeless Jewels** | ❌ | Seed → notable transform (passive tree) |
| **Cluster Jewels** | ⚠️ | Socket parsing exists, notables not expanded |
| **Masteries** | ✅ | Parsed from tree, effects in `masteryEffects` |
| **Keystones** | ✅ | Parsed, some effects in `conditions/evaluator` |

---

## Skill System

| Feature | Status | Notes |
|---------|--------|-------|
| Active Gem (level/quality/variant) | ✅ | Parsed from PoB |
| Support Gems (links) | ✅ | Socket groups parsed |
| **Support Gem Effects** | ❌ | No gem data integration |
| **Skill-Specific Mechanics** | ❌ | e.g. Brand attachment, Trap throw time |
| **Main Skill Detection** | ⚠️ | `analyzer.engine.ts:82-92` — picks most links |
| **Trigger Skills** | ❌ | Cast on Crit, Cast on Hit, etc. |

---

## Item System

| Feature | Status | Notes |
|---------|--------|-------|
| Base Types (armour/evasion/es/ward) | ⚠️ | Only mods parsed, no base stats |
| Implicits | ✅ | Parsed from `implicit: true` |
| Explicits | ✅ | Parsed |
| Crafted Mods | ✅ | Parsed from `crafted: true` |
| Enchants | ⚠️ | Treated as explicits |
| Fractured/Synthesised | ❌ | Not distinguished |
| Influences (Shaper/Elder/Etc) | ❌ | Not parsed |
| Corrupted | ✅ | `corrupted` flag on item |
| Mirrored | ⚠️ | Flag parsed, no effect |

---

## Passive Tree

| Feature | Status | Notes |
|---------|--------|-------|
| Allocated Nodes | ✅ | Hash list from PoB |
| Ascendancy Nodes | ✅ | Separate list |
| Mastery Effects | ✅ | Choice mapping |
| Keystones | ✅ | Name list, some in conditions |
| Cluster Jewels | ⚠️ | Sockets parsed, notables not expanded |
| Timeless Jewels | ❌ | **Major gap for meta builds** |

---

## P0 (Release Blockers) — Must Fix

| # | Mechanic | Impact | Effort |
|---|----------|--------|--------|
| 1 | **Leech** | Core sustain for attack builds | Medium |
| 2 | **Poison/Ignite/Bleed** | DoT builds completely broken | High |
| 3 | **Gain as Extra** | Common on cluster jewels/items | Medium |
| 4 | **Conversion Chains** | Phys→Fire→Lightning common | Medium |
| 5 | **Timeless Jewels** | Top builds use them | High |

---

## P1 (Post-Launch)

| # | Mechanic | Impact |
|---|----------|--------|
| 1 | Impale / Overwhelm / Exposure | Phys/ele meta |
| 2 | Minions / Traps / Mines / Totems / Brands | Entire archetypes |
| 3 | Skill Gem Data Integration | Accurate DPS |
| 4 | Base Item Stats | Accurate defences |
| 5 | Cluster Jewel Notable Expansion | Popular in 3.25 |

---

## P2 (Nice to Have)

| # | Mechanic |
|---|----------|
| 1 | Recoup |
| 2 | Guard Skills |
| 3 | Ailment Immunity detection |
| 4 | Trigger Skills (CoC, CoH, etc.) |
| 5 | Fractured/Synthesised item handling |

---

## Verification Method

For each mechanic:
1. **Unit Test**: `packages/poe-engine/src/__tests__/mechanics/{mechanic}.test.ts`
2. **Golden Test**: Real PoB build using mechanic → compare vs PoB Community
3. **Documentation**: Update this file when status changes

---

## Tracking

| Date | Mechanic | Old Status | New Status | PR |
|------|----------|------------|------------|----|
| 2025-01-15 | Life/ES/Armour/Evasion | — | ✅ | #234 |
| 2025-01-15 | Resistances/Max Res | — | ✅ | #234 |
| 2025-01-15 | Block/Spell Suppression | — | ✅ | #234 |
| 2025-01-15 | Flat/% Damage | — | ✅ | #235 |
| 2025-01-15 | Crit Chance/Multi | — | ✅ | #235 |
| 2025-01-15 | Attack/Cast Speed | — | ✅ | #235 |
| 2025-01-15 | Penetration (Fire) | — | ✅ | #235 |
| 2025-01-15 | Leech | — | 🔧 | — |
| 2025-01-15 | Poison/Ignite/Bleed | — | 🔧 | — |
| 2025-01-15 | Gain as Extra | — | ❌ | — |
| 2025-01-15 | Conversion Chains | — | ⚠️ | — |

---

**Last Updated**: 2026-07-23  
**Owner**: PoE Engine Team  
**Review Cadence**: Weekly during active development