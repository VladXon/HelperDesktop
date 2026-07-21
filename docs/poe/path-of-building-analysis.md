# Path of Building Community — Architecture Analysis

> **Repository:** [PathOfBuildingCommunity/PathOfBuilding](https://github.com/PathOfBuildingCommunity/PathOfBuilding)
> **Language:** 100% Lua
> **Version analyzed:** dev branch (v2.65.0, ~9,225 commits)
> **Purpose:** Reverse-engineer PoB calculation engine for MyHelper Phase 3f redesign

---

## 1. Overall Architecture

### Technology Stack
- **Runtime:** Lua 5.1+ (interpreted, no build step)
- **GUI:** Custom immediate-mode UI framework (`Control.lua` class tree)
- **Data format:** Pure Lua tables (no JSON/SQLite; static data is `.lua` files evaluated at startup)
- **Build persistence:** Custom XML dialect (`<PathOfBuilding>` root → `<Build>`, `<Items>`, `<Skills>`, `<Tree>`, `<Config>`, `<Notes>`)
- **Caching:** Two-level: per-build ModDB snapshots + per-skill global cache

### Directory Purpose Map

| Dir | Purpose |
|-----|---------|
| `src/Classes/` | UI components (tabs, controls, tooltips), domain objects (Item, ModDB, ModStore, PassiveSpec) |
| `src/Modules/` | All engine logic: CalcSetup, CalcPerform, CalcOffence, CalcDefence, ModParser, Data, Build |
| `src/Data/` | Static game data: ~42 `.lua` files (gems, bases, mods, uniques, skills, passives) |
| `src/TreeData/` | Passive tree JSON data (treeVersion, nodes, groups, masteryEffects) |
| `src/Export/` | Export formats (PoB code strings) |
| `src/Assets/` | Images, fonts |

### Data Flow

```
Static Game Data (src/Data/*.lua)
│
├── Gems.lua, Bases/*, Skills/*, Mod*.lua, Uniques/*
│   └── Loaded eagerly at startup into global `data` table
│
User Build (XML File)
│
├── <Build>   → character level, class, bandit, pantheon
├── <Items>   → equipped items (in-game copy-paste or crafted)
├── <Skills>  → skill gem sets with supports
├── <Tree>    → passive tree allocations (node IDs, jewels, clusters)
├── <Config>  → enemy, charges, buffs, conditions
│
└── buildMode:LoadDB() → Parse XML → Populate tabs
│
    ├── ItemsTab    → Items parsed via ModParser → mod objects stored in item
    ├── SkillsTab   → Builds activeSkillList with support chains
    ├── TreeTab     → PassiveSpec (allocated nodes + jewels)
    └── ConfigTab   → Config options → modList
│
    ▼
calcs.initEnv(build, mode)
│
├── Creates three ModDBs: env.modDB (player), env.enemyDB, env.itemModDB
├── Seeds base stats (class, level, game constants) into modDB
├── Processes items → mods → itemModDB → merged into modDB
├── Processes tree → buildModListForNodeList → merged into modDB
├── Processes skills → createActiveSkill → skillModLists
├── Applies config → modList → merged into modDB/enemyDB
└── Saves snapshot via specCopy() for incremental rebuild
│
    ▼
calcs.perform(env)
│
├── Step 1-28: Buff/debuff/curse/aura/ailment/exposure processing
├── Step 29: calcs.defence(env, player)          → output table
├── Step 30: calcs.buildDefenceEstimations(env, player) → EHP/survival
├── Step 31: calcs.triggers(env, player)          → trigger DPS
├── Step 32: calcs.offence(env, player, mainSkill) → DPS/ailments
├── Step 33: Repeat 29-32 for minion
└── Step 34: Cache result by skill UUID
│
    ▼
UI Renders (CalcsTab) → CalcSections layout → output data + breakdown strings
```

### Dependency Graph

```
Data.lua (static game data loader)
   ├──► CalcSetup.lua (environment init, mod seeding)
   │       ├──► ModDB.lua (derives from ModStore.lua)
   │       ├──► ModList.lua
   │       └──► CalcPerform.lua (main pipeline)
   │               ├──► CalcOffence.lua
   │               │       ├──► CalcActiveSkill.lua
   │               │       └──► CalcTools.lua
   │               ├──► CalcDefence.lua
   │               │       └──► CalcTools.lua
   │               ├──► CalcBreakdown.lua
   │               ├──► CalcTriggers.lua
   │               └──► CalcMirages.lua
   ├──► ModParser.lua (text → mod objects)
   ├──► Build.lua (XML import/export)
   ├──► ConfigOptions.lua (enemy/buff/condition widgets → mod lists)
   └──► CalcSections.lua (tab layout definitions)
```

---

## 2. Calculation Pipeline — Exact Order

PoB's pipeline is a **single-pass, sequential, mutable-output model**. There is no separate "aggregation" pass before calculations — everything flows through `calcs.perform()`.

### Full Order in `calcs.perform()` (CalcPerform.lua:1098)

```
PHASE                           LINES          NOTES
──────────────────────────────────────────────────────────
 1. Keystone merge              1102–1104      modLib.mergeKeystones()
 2. Minion init                 1106–1219      Minion modDBs, base stats
 3. Output table init           1117–1219      env.player.output = {}
 4. Pre-buff flags              1223–1245      Alchemist's Genius, Banner valour
 5. EnemyModifier tags          1247–1252      applyEnemyModifiers()
 6. Per-skill stat loop         1254–1372      Brands, totems, hex doom, mirages
 7. Breakdown init              1384–1392      Breakdown module load
 8. Special conversions         1394–1446      ArmourES→Life, Damage→AuraEffect
 9. Flask processing            1472–1798      mergeFlasks(), mergeTinctures()
10. Attributes + Life/Mana      1809–1811      doActorAttribsConditions(), doActorLifeMana()
11. Minion attributes           1812–1835      Minion modDB merge
12. Life/Mana reservation       1837–1949      doActorLifeManaReservation()
13. Tincture (combat)           1951–1953      mergeTinctures() combat mode
14. Attribute requirements      1955–2019      Str/Dex/Int/Omni reqs
15. Herald/Aura count           2021–2035      Multipliers for self-affecting auras
16. Charge conversions          2037–2046      Mana→ShockEffect
17. Charges (early)             2047–2048      doActorCharges()
    ═══════════════ BUFF PHASE ═══════════════
18. Buff/Debuff processing      2050–2977      Walk all active skills, build buff tables
19. Alternate charges           2977–2994      Brutal/Affliction/Absorption charges
20. Curse processing            2996–3165      Priority-based curse slot assignment
21. Guard buffs                 3166–3190      Steel Skin etc.
22. Apply buff modifiers        3191–3410      Final merge into modDB/enemyDB/minion.modDB
23. Mana resistance hack        3242–3250      Protect mana conversion mods
    ═══════════════ POST-BUFF ════════════════
24. Condition prereqs           3329–3335      Skill-data-driven conditions
25. Misc buffs                  3335–3343      Onslaught, Arcane Surge, Fortify, etc.
26. Non-damaging ailments       3343–3460      Shock/Chill/Scorch/Brittle/Sap on enemyDB
27. Enemy charges               3462–3463      doActorCharges(enemy)
28. Enemy misc                  3462–3463      doActorMisc(enemy)
    ═══════════ EXPOSURE ═════════════════════
29. Exposure application        3467–3498      Fire/Cold/Lightning exposure on enemyDB
    ═══════════ CALCULATION ══════════════════
30. **calcs.defence(env, player)**        3501 ← DEFENCE (see §8)
31. **buildDefenceEstimations(env, player)** 3503 ← EHP/SURVIVAL
32. **calcs.triggers(env, player)**       3506 ← TRIGGER DPS
33. **calcs.offence(env, player, mainSkill)** 3508 ← OFFENCE (see §7)
34. Minion mirror (30-33)      3511–3517      Same chain for minion
35. Party buff exports         3521–3695
36. Cache                      3694           cacheData(uuid, env)
```

### Critical Observation

**Exposure is NOT inside CalcOffence.** It mutates `enemyDB` BEFORE defence/offence run. Enemy resistance already reflects exposure when `calcs.offence` queries `enemyDB` via `calcResistForType()`.

**Penetration IS inside CalcOffence.** During the damage-per-type loop (lines ~3187-3350), penetration from player stats is applied against enemy resistance queried from `enemyDB`.

**No separate "stat aggregation" step exists.** The pipeline is: raw mods → buff processing → direct output computation. Stats are computed on-demand inside `calcs.defence` and `calcs.offence` using `ModDB:Sum()`, `ModDB:More()`, etc.

---

## 3. Modifier System

### Where modifiers live

| Layer | Storage | Creation |
|-------|---------|----------|
| Base stats (class, level) | `modDB.mods["Life"]` | `calcs.initModDB()` (CalcSetup.lua:18) |
| Items | `item.modList` → merged into `modDB` | ModParser: in-game text → mod objects |
| Passive tree | Per-node ModList → `modDB` | `calcs.buildModListForNodeList()` |
| Skills (active) | `activeSkill.skillModList` → `modDB` | `calcs.buildActiveSkillModList()` |
| Supports | `activeSkill.skillModList` (merged) | Per-support `mergeSkillInstanceMods()` |
| Buffs/auras/curses | `activeSkill.buffList` → `modDB` | Buff processing phase (lines 2050-3410) |
| Config | `build.configTab.modList` → `modDB` | ConfigOptions → modList |
| Enemy | `enemyDB.mods` | `calcs.initModDB(enemyDB)` + exposure/ailments |

### How they are parsed (ModParser.lua)

**Two-phase pattern matching:**

1. `formList` — regex patterns match the **value prefix** of a mod line
2. `modNameList` — string keys match the **stat name** portion via longest-substring match

**Examples:**

| Text | Form | Stat Name | Mod Value |
|------|------|-----------|-----------|
| `30% increased maximum life` | `INC` | `Life` | `30` |
| `+50 to maximum mana` | `BASE` | `Mana` | `50` |
| `40% more spell damage` | `MORE` | `Damage` (flags: `ModFlag.Cast`) | `40` |
| `adds 5 to 10 fire damage` | `DMG` | `FireDamage` | `{5, 10}` |
| `you have onslaught` | `FLAG` | `OnslaughtEffect` | `true` |
| `lightning resistance is 75%` | `OVERRIDE` | `LightningResist` | `75` |

**Built-in support for:** damage types, skill type filtering, conditionals, slot-based conditions, flat damage with ranges, auras, charges, flask effects.

### How local vs global works

**Local modifiers** apply to items only. They are stored on the item's `modList` and have `{ type = "Condition", var = "LocalModScope" }` tags that prevent them from leaking outside their parent context.

**Global modifiers** have no restriction and are merged into the actor's `modDB` directly.

**The distinction is enforced by tags**, not by a separate storage bucket:
- Local: Tag `{ type = "ItemCondition", ... }` or `{ type = "SocketedIn", ... }`
- Global: No restrictive tag

### How "increased", "reduced", "more", "less" are represented

Each modifier has a `type` field:

| PoE Term | type Value | Aggregation |
|----------|-----------|-------------|
| `+X to maximum life` | `"BASE"` | Sum (additive) in `Sum()` |
| `X% increased` | `"INC"` | Sum (additive) in `Sum()` |
| `X% reduced` | `"RED"` | Sum (additive, negative) |
| `X% more` | `"MORE"` | Multiplicative in `More()`: `Π(1 + val/100)` |
| `X% less` | `"LESS"` | Multiplicative in `More()` (negative val) |

**Formula:** `final = base × (1 + ΣINC/100) × Π(1 + MORE/100)`

Where `INC` includes both `INC` and `RED` summed together, and `MORE` includes both `MORE` and `LESS` multiplied together.

### Tag/Condition System

Each mod can carry tag tables for conditional activation:

| Tag Type | Example | Effect |
|----------|---------|--------|
| `Condition` | `{type="Condition", var="Moving"}` | Active only when player Moving |
| `Multiplier` | `{type="Multiplier", var="FrenzyCharge", limit=3}` | Value × charge count |
| `ActorCondition` | `{type="ActorCondition", actor="enemy", var="Burning"}` | Check enemy burning |
| `SkillType` | `{type="SkillType", skillType=SkillType.Attack}` | Filter by skill type |
| `PerStat` | `{type="PerStat", stat="Str", div=10}` | Value × (Str/10) |
| `GlobalEffect` | `{type="GlobalEffect", effectType="Aura"}` | Aura effect scaling |
| `SlotName` | `{type="SlotName", slotName="Helmet"}` | Filter by equipment slot |
| `ModFlag` / `KeywordFlag` | Filter by damage type flags |

---

## 4. Stat System

### Stat categories

| Category | Storage | Computation | Example |
|----------|---------|-------------|---------|
| **Base stat** | `modDB` (BASE type mods) | `modDB:Sum("BASE", cfg, "Life")` | Flat life from items |
| **Derived stat** | `actor.output.Life` | `base × (1+inc/100) × more` | Final life total |
| **Cached stat** | `GlobalCache.cachedData[mode][uuid]` | Saved after `calcs.perform()` | Full output table snapshot |
| **Temporary stat** | `actor.output.X` | Computed per pass | Per-skill DPS for weapon swap |
| **Conditional stat** | Tag-based in modDB | `ModDB:EvalMod(mod, cfg)` | "X while Leeching" |
| **Input stat** | `build.configTab.modList` | Direct from config | Enemy resistance, charges |

### The `output` table

A flat key-value table on `actor.output`. Keys include:
- `Life`, `Mana`, `EnergyShield`, `Ward`
- `Armour`, `Evasion`
- `FireResist`, `ColdResist`, `LightningResist`, `ChaosResist`
- `BlockChance`, `SpellBlockChance`
- `CombinedDPS`, `TotalDPS`, `AverageDamage`, `Speed`
- `CritChance`, `CritMultiplier`
- `BleedDPS`, `IgniteDPS`, `PoisonDPS`
- `FullDPS`, `FullDotDPS`
- `EffectiveHP`, `MaximumHitTaken`
- `Str`, `Dex`, `Int`

### The `breakdown` table

Stores **human-readable calculation traces** for the UI Calcs tab. Each key maps to an ordered array of formatted strings:

```lua
breakdown.Life = {
    "500 ^8(base)",
    "x 1.50 ^8(increased/reduced)",
    "= 750",
}
```

Breakdowns are **not full AST traces** — they are display-optimized string arrays, created inline during calculation via `if breakdown then breakdown.simple(...) end`.

---

## 5. Skill System

### Gem Definitions

Stored in `src/Data/Skills/` — one `.lua` file per skill. Each skill is a `new("SkillGem")` table:

```lua
gem = {
    name = "Fireball",
    baseEffectiveness = 3.7,        -- damage effectiveness
    incrementalEffectiveness = 0.1, -- per-level scaling
    description = "...",
    color = 2,                      -- blue=3, green=1, red=2
    baseFlags = 0,
    -- level data (from skill_stat_map)
    levels = {
        [1] = { damageEffectiveness = 3.7, baseMultiplier = 1, ... },
        [20] = { damageEffectiveness = 3.7, baseMultiplier = 1, ... },
    },
    qualityStats = { { stat=..., value=..., rate=1 }, ... },
    baseMods = {
        skill("castTime", 0.75),
        skill("FireMin", 9, "FireMax", 14),  -- base damage at level 1
        -- ...
    },
    minionList = { },
    statMap = {   -- maps internal stat IDs to mod names
        ["spell_maximum_base_fire_damage"] = {
            mod("FireMin", "BASE", nil, 0, 0, { keywordFlags = KeywordFlag.Fire }),
            mod("FireMax", "BASE", nil, 0, 0, { keywordFlags = KeywordFlag.Fire }),
        },
    },
}
```

### Skill Type System

A hierarchical boolean expression system:
```lua
gemTypeList = { "spell", "projectile", "fire", "aoe" }

-- Support gem tests (CalcTools:90-107):
-- "Spell AND Projectile" → skillTypes has ["spell"] and ["projectile"]
-- "Attack OR Spell"     → skillTypes has ["attack"] or ["spell"]
-- "NOT Minion"          → skillTypes["minion"] is nil
```

### Support Interactions

Support gems can:
1. **Add skill types** (trap, mine, totem) — reflected in `skillTypes` table
2. **Add flags** (`ModFlag.Hit`, `ModFlag.Area`, etc.)
3. **Add keyword flags** (`KeywordFlag.Fire`, `KeywordFlag.Bleed`)
4. **Provide MORE/INC multipliers** — merged into `skillModList`
5. **Add mechanics** (additional projectiles, chain, fork, pierce, repeat)
6. **Trigger skills** (Cast on Crit, Cast when Damage Taken)

Support matching uses `calcLib.canGrantedEffectSupportActiveSkill()` which evaluates type expressions, weapon restrictions, and trigger compatibility.

### Damage Effectiveness

Captured by `baseEffectiveness` + `incrementalEffectiveness` from gem data. Applied as:
```
finalDamage = (baseMin + addedMin * effectiveness) ... for each damage type
```

### Hit, DoT, Ailments, Minions, Triggers, Totems, Brands

| Mechanic | Module | Lines |
|----------|--------|-------|
| Hit damage | CalcOffence | 3148–3350 |
| DoT (skill intrinsic) | CalcOffence | 5541–5870 |
| Bleed | CalcOffence | 4179+ |
| Poison | CalcOffence | 4452+ |
| Ignite | CalcOffence | 4762+ |
| Non-damaging ailments | CalcOffence | 5104–5283 |
| Impale | CalcOffence | 5366–5468 |
| Minions | CalcPerform + CalcActiveSkill | Dedicated minion copies |
| Triggers | CalcTriggers.lua | `calcs.triggers()` |
| Totems | CalcActiveSkill + CalcPerform | Totem limits and buffs |
| Brands | CalcActiveSkill | 1316–1436 (attach range, activation) |

---

## 6. Passive Tree

### Tree Data

Stored in `src/TreeData/` as JSON-like data:
- `tree.lua` → tree version, node definitions (positions, stats, connections)
- `ascendancy/*.lua` → ascendancy starting points
- `masteryEffects.lua` → mastery choice → modifier mapping

### Masteries

Dynamically selected from a list of mastery effects when a mastery node is allocated. Each mastery choice maps to one or more mods:

```lua
-- Conceptual (PoB stores as JSON-like tree data)
"fire mastery" → { "30% increased fire damage" }
"fire mastery" → { "100% increased critical strike chance against burning enemies" }
-- Exactly one is chosen per mastery node
```

### Cluster Jewels

Two allocation modes:
1. **Small socketed jewels** — modifiers from `ModJewel.lua`, `ModJewelAbyss.lua`, `ModJewelCharm.lua`
2. **Large cluster jewels** — contain an entire passive skill tree defined in `Data/ClusterJewels.lua`. Nodes in the cluster jewel tree are allocated along with the main tree.

### Timeless Jewels

A complex subsystem:
- `TimelessJewelSocketControl.lua` — UI for selecting timeless jewel variant
- `TimelessJewelListControl.lua` — socket management
- Data from `Data/TimelessJewelData/` — lookup tables mapping node IDs to alternate effects per seed number
- Each timeless jewel replaces certain nodes with alternates based on seed × variant × node position

### Ascendancies

Loaded at build init, applied as special passive nodes. Ascendancy starting points are stored in `src/TreeData/` and resolved by class + ascendancy choice.

### Keystones

Merged at the start of `calcs.perform()` (line 1102):
```lua
modLib.mergeKeystones(env, env.modDB)
```
Keystones are `LIST`-type mods that, when activated, add their associated mod tree (e.g., CI adds `Life = 1` OVERRIDE + `ImmuneToChaos` FLAG).

### Overrides

Stored as `OVERRIDE`-type mods in `modDB`. Gueried via `modDB:Override(cfg, "Life")`. Used for:
- CI: `Life = 1`
- Iron Reflexes: `Evasion = 0`
- Resolute Technique: `CritChance = 0`
- Various other keystone stat replacements

---

## 7. Damage Engine

### Exact pipeline (CalcOffence.lua)

```
 1. runSkillFunc("initialFunc")         — Skill-specific initialization
 2. Set skill flags (triggered, focus)  — SkillIsTriggered, SkillIsFocused
 3. Merge SkillData mods                — stat interpretation phase
 4. Stat bonuses (Iron Grip, etc.)      — Stat→Damage conversions
 5. Energy Blade weapon override        — Weapon stat replacement
 6. Battlemage / Spellblade             — Weapon damage→spell damage
 7. Minion→Player / Player→Minion       — Spiritual Aid, Spiritual Command
 8. Weapon type conversions             — Claw→Unarmed, Wand→Spell (Spellslinger)
 9. Uncapped res→damage/pen             — Overcapped fire→penetration
10. Misc conversions                    — Light radius→accuracy, Projectile speed→bow dmg
11. Repeat mechanics                    — Multistrike/Echo final repeat bonus
12. Unleash seals                       — Seal count→DPS multiplier
13. Momentum stacks                     — Travel distance scaling
14. Skill type stats                    — Duration, projectiles, chain/fork/pierce, AoE
15. Cooldown + trap/mine throw time     — calcSkillCooldown(), trap cooldown
16. Brand attachment + trigger rate     — Brand activation frequency
17. Skill uptime                        — Cooldown-based uptime
18. Cost calculation                    — Mana/Life/ES/Rage cost
    ═══════════ DAMAGE PHASE ═══════════
19. Conversion table                    — buildConversionTable()
    │   Physical→Lightning→Cold→Fire→Chaos
    │   Skill conversion + Global conversion (capped at 100%)
    │   Gain-as-extra (uncapped)
20. Damage passes config                — MainHand/OffHand/average modes
21. Hit chance + speed                  — HitChance, Attack/Cast Speed
22. Exerted attacks (warcries)          — Ruthless Blow, Fist of War
23. Critical strike                     — CritChance, CritMulti, lucky/unlucky
24. Double/Triple damage                — Probabilities
25. Culling DPS                         — Culling strike contribution
26. Base hit damage per type            — Sum base min/max from all sources
    ┌ calcDamage() recursive loop ─────
    │ For each dmgType (Phys→Light→Cold→Fire→Chaos):
    │   1. Convert upstream damage (if conversion exists)
    │   2. Apply INC × MORE for this type
    │   3. Return {min, max}
    └──────────────────────────────────
27. 2-pass hit damage                   — Pass 1: crit damage, Pass 2: non-crit
    │   Multiply by crit multi, lucky/unlucky
    │   Apply Ruthless/FistOfWar/Warcry multipliers
28. Enemy mitigation                    ← **THIS IS WHERE IT HAPPENS**
    │   calcResistForType(type) → enemy resistance (from enemyDB, includes exposure)
    │   Apply penetration (from player stats)
    │   Calculate effective damage: base × (1 - (resist - pen) / 100)
    │   Apply enemy "damage taken" INC/MORE modifiers
    │   Armour reduction for physical damage
29. Leech totals                        — Life/mana/ES leech per hit
30. Leech rates                         — Leech rate, cap, instant leech
31. Ailments                            — Bleed, Poison, Ignite, non-damaging
32. Impale                              — Impale chance, DPS
33. Skill intrinsic DoT                 — Caustic/Burning/Decay ground
34. Combined DPS                        — Hit DPS + Impale + all DoTs + culling
```

### Where conversion happens

`buildConversionTable()` at line 1856 builds a table mapping source → target damage types. The conversion chain is:
```
Physical → Lightning → Cold → Fire → Chaos
```
Only left-to-right conversion is allowed. `calcDamage()` recurses through this chain: for each type, it processes all upstream-converted damage first, then applies INC/MORE.

### Where penetration happens

During step 28 (the hit damage loop, ~line 3332), penetration is subtracted from enemy resistance:
```
effectiveResist = max(enemyResist - penetration, -200%)
damageMultiplier = 1 - effectiveResist / 100
```

### Where exposure happens

Exposure is applied to `enemyDB` in `calcs.perform:3467` (step 29), BEFORE `calcs.offence` runs. So when `calcResistForType()` queries `enemyDB`, the resistance already includes exposure.

### Where critical is applied

Step 23 (lines 2845–3080): Crit chance and crit multiplier are calculated from `modDB` stats. In step 27, during the 2-pass loop, pass 1 hits are multiplied by crit multi, pass 2 hits use base damage. Weighted average: `(1-critChance) × baseHit + critChance × baseHit × critMulti`.

---

## 8. Defense Engine

### Pipeline order (CalcDefence.lua:651)

```
 1. Action Speed                — Temporal chains effect, action speed mod
 2. Resistances                 — Fire/Cold/Lightning/Chaos resist + max + overcap
 3. Block                       — Attack/spell/projectile block, lucky/unlucky
 4. Stat→Defence conversions    — Uncapped fire→armour, uncapped cold→evasion, etc.
 5. Primary defences            — Armour, Evasion, ES, Ward
    │   Base from gear + converted stats
    │   Iron Reflexes: evasion → armour
    │   Various conversions: Mana→Armour, Life→Armour, ES→Ward, etc.
 6. Dodge                       — Acrobatics spell/attack dodge
 7. Recovery                    — Leech caps, Regeneration, ES Recharge, Recoup, Ward recharge
 8. Damage Reduction            — Flat phys DR, DR cap
 9. Misc                        — Move speed, avoidance, recovery on block
10. Ailment avoidance           — Elemental ailment immunity, self-ailment duration
```

### buildDefenceEstimations (line 1638)

```
 1. Not-hit chance              — Combined evade + dodge + avoidance
 2. Enemy damage input          — Enemy base damage, penetration, overwhelm, conversion, crit
 3. Damage Taken As             — Taken-as conversion chains (e.g., "phys taken as fire")
 4. Damage taken multipliers    — Resistance, armour DR, MoM, ES bypass, guard
 5. Incoming hit multipliers    — Per-type taken multipliers
 6. Stun                        — Stun threshold, avoidance, block recovery
 7. Life pool                   — Life recoverable, Petrified Blood
 8. ES bypass                   — Per-type ES bypass %
 9. MoM                         — Mind over Matter %, per-type MoM
10. Guard                       — Guard absorb, shared guard
11. Aegis + allies              — Per-type aegis, frost shield, spectres/totems
12. Total pool / EHP / Max hit  — Iterative pool reduction, eHP calculation
13. Degens + net regen          — Build degen, enemy degen, net life/mana/ES regen
```

### Armour formula

PoB uses the standard PoE armour formula:
```
reduction = armour / (armour + max(rawDamage × 10, 1))
```
Applied in CalcDefence.lua during damage taken multiplier computation (~line 1961-2112).

### Evasion

```
evadeChance = 1 - enemyAccuracy / (enemyAccuracy + (evasion × 0.25)^0.8)
```
Enemy accuracy is computed from level: `2 × (level - 1)^1.29 + 53`.

### Block caps

Max 75% for both attack and spell block by default, raised by items/mods (e.g., Glancing Blows doubles but sets recovery-on-block to 35%).

### Spell suppression

If suppressed, spell hit damage is reduced by 50% (before resistances). Not applied to DoTs or ailments from spells.

---

## 9. Config System

### How PoB stores config

The `<Config>` XML section stores:
1. **Flat values** for enemy stats (resistances, damage, level, etc.)
2. **Condition flags** for buffs/charges/states
3. **Multiplier counts** (e.g., Frenzy Charge count)

These are serialized as `<input>` nodes with `name` and value attributes.

### ConfigOptions.lua defines the schema

Each config entry has:
- `var` — internal variable name
- `type` — `check`, `count`, `list`, `integer`, `countAllowZero`, `float`, `text`
- `label`, `section`, `col` — UI layout
- `apply` — function that transforms a setting into `modList` entries

### Enemy config

**Boss tiers:**
| Setting | Level | Ele Res | Chaos Res | Ailment Threshold |
|---------|-------|---------|-----------|-------------------|
| None | 83 | 0% | 0% | — |
| Standard Boss | 83 | 40% | 25% | 488% more |
| Pinnacle | 84 | 50% | 30% | 404% more |
| Uber | 85 | 50% | 30% | 404% more + 70% less dmg taken |

Each tier also sets enemy damage scaling and penetration values.

### Charges

Not directly configurable — they are **computed** from passives + items + tree:
- Each source adds a `{type="Multiplier", var="FrenzyCharge"}` tag to relevant mods
- Base max charges come from `calcs.initModDB()`
- Additional max charges come from items/tree

Config only exposes "Recently gained a charge" condition flags.

### Buffs/Debuffs/Conditions

~40+ checkboxes for in-combat states: Onslaught, Fortify, Phasing, Elusive, Adrenaline, Tailwind, Unholy Might, Arcane Surge, Alchemist's Genius, etc.

Each sets a `Condition:X` FLAG on `modDB` or `enemyDB`.

---

## 10. Database / Static Data

### Where everything lives

```
src/Data/
├── Global.lua              — Global constants, flags, precision settings
├── Gems.lua                — 405 KB: all gem definitions (active + support)
├── SkillStatMap.lua        — 80 KB: game stat IDs → mod name mappings
├── Skills/                 — Per-skill definition files (one per skill)
├── Bases/                  — Per-item-type base definitions
├── Misc.lua                — 27 KB: game constants, tick rates, ailment thresholds
├── Minions.lua             — 64 KB: minion skill lists + stat mods
├── Spectres.lua            — 225 KB: spectre data
├── ClusterJewels.lua       — 35 KB: cluster jewel passives
├── Pantheons.lua           — 9 KB: pantheon powers
├── Bosses.lua / BossSkills.lua — Boss encounter definitions
├── Uniques/                — Per-item-type unique definitions (+ Watcher's Eye, race)
├── ModExplicit.lua         — 2.0 MB: explicit item modifiers
├── ModItemExclusive.lua    — 2.9 MB: unique/special item modifiers
├── ModCache.lua            — 2.3 MB: pre-parsed mod strings
├── ModEldritch.lua         — 1.9 MB: eldritch implicit modifiers
├── ModScourge.lua          — Scourge modifiers
├── ModSynthesis.lua        — Synthesis implicit modifiers
├── ModDelve.lua            — Delve modifiers
├── ModCorrupted.lua        — Corrupted implicit modifiers
├── ModMaster.lua           — Crafting bench modifiers
├── ModVeiled.lua           — Veiled modifier options
├── ModFlask.lua            — Flask modifiers
├── ModTincture.lua         — Tincture modifiers
├── ModGraft.lua            — Graft modifiers
├── ModJewel.lua            — Jewel modifiers
├── ModJewelAbyss.lua       — Abyss jewel modifiers
├── ModJewelCluster.lua     — Cluster jewel modifiers
├── ModJewelCharm.lua       — Charm modifiers
├── ModFoulborn.lua         — Foulborn modifiers
├── ModNecropolis.lua       — Necropolis modifiers
├── Essence.lua             — Essence modifiers
├── BeastCraft.lua          — Beastcrafting recipes
├── Enchantment*.lua        — Helmet/Boot/Glove/Body/Weapon/Belt/Flask enchants
├── Crucible.lua            — Crucible passive trees
├── Rares.lua               — Rare item name generation
├── FlavourText.lua         — Unique item flavour text
├── Costs.lua               — Cost-related data
└── QueryMods.lua           — Trade query mod data
```

### All Lua tables — no JSON, no SQLite

Every data file is evaluated at startup. Mod data is structured as:

```lua
-- ModExplicit.lua example structure
mods = {
    ["Life"] = {
        ["Helmet"] = {
            {
                name = "Life",
                level = 1,
                stats = {
                    {
                        { type = "BASE", value = 3, key = "Life" },
                        { type = "BASE", value = 4, key = "Life" },
                    },
                },
            },
        },
    },
}
```

This means each mod file is a **giant table literal**. The `ModCache.lua` (2.3 MB) stores **pre-serialized** mod strings to avoid re-parsing:

```lua
cache["50|Helmet|Life|INC|0|0"] = { /* cached mod object */ }
```

### How data is loaded

`Data.lua` calls `LoadModule()` for each data file in dependency order:
1. Core data (Global, SkillStatMap)
2. Skills (per-skill definitions)
3. Gems (gem definitions + gem→skill mappings)
4. Minions, Spectres
5. Bases (item base types)
6. Mod files (all Mod*.lua files)
7. Enchantments
8. Cluster Jewels, Pantheons, Bosses
9. Uniques

---

## 11. Caching

### Two-level cache architecture

**Level 1: Per-build ModDB snapshots**
```
cachedPlayerDB = specCopy(env.modDB)   -- snapshot of all mods
cachedEnemyDB  = specCopy(env.enemyDB)
cachedMinionDB = specCopy(env.minion.modDB)
```

On recalculation:
```lua
env.modDB.parent = cachedPlayerDB  -- pointer, not copy
wipeTable(env.modDB.mods)         -- clear just local mods
-- Re-merge changed mods. Parent chain handles lookups.
```

The `parent` chain means `Sum()` queries aggregate local + parent results. ModDBs are **never fully copied** between passes.

**Level 2: Per-skill global cache**
```lua
GlobalCache.cachedData[mode][skillUUID] = { Env = env }
```

Key is `cacheSkillUUID(activeSkill, env)` — stable identifier across passes. Retrieved by `getCachedOutputValue()` for cross-skill dependencies (e.g., Blight max stages needs Blight skill output).

The mode is typically `"MAIN"` or `"CALCULATOR"`.

### Acceleration via `wipeEnv(env, accelerate)`

Five acceleration flags control what's rebuilt:
| Flag | Rebuild scope |
|------|--------------|
| `accelerate.everything` | Only wipe core DBs |
| `accelerate.nodeAlloc` | Skip tree/node rebuild |
| `accelerate.requirementsItems` | Skip item processing |
| `accelerate.requirementsGems` | Skip gem requirement processing |
| `accelerate.skills` | Skip active skill rebuilding |

### Dependency graph

Each modifier stores its dependencies implicitly through tag tables. `ModDB:EvalMod()` evaluates tags to determine if a mod is active. The dependency chain is resolved at query time, not pre-built:

```
modDB:Sum("INC", cfg, "Life")
  → iterates mods["Life"]
  → for each mod: EvalMod(mod, cfg)
    → checks Condition tags against modDB.conditions
    → checks Multiplier tags against modDB.multipliers
    → checks ActorCondition against enemy modDB
    → checks PerStat against output table
    → checks SkillType against current skill
  → sums active mods
  → recurses into parent modDB
```

---

## 12. Extensibility

### How PoB adds a new league

1. **New gems:** Add `SkillGem` definition in `src/Data/Skills/`. Update `Gems.lua`.
2. **New base items:** Add to `src/Data/Bases/`. Add unique definitions to `src/Data/Uniques/`.
3. **New modifiers:** Add to relevant `src/Data/Mod*.lua` file. If a new field is needed, add to `ModParser.lua` form list.
4. **New passive tree:** Update `src/TreeData/` with new tree JSON.
5. **New keystones/notables:** Add to ModList → add tag patterns in ModParser.
6. **New mechanics:** Add in CalcOffence.lua or CalcDefence.lua by registering new `SkillType` or `globalEffect` processing.

### Pattern for new mechanics

A new unique mechanic typically requires changes in **both** CalcSetup (stat seeding) **and** CalcOffence/CalcDefence (calculation logic). There is no plugin system — mechanics are hardcoded in the calculation modules. For example, Spellblade was added as ~25 lines in CalcOffence (lines 555-571) that checked for the `WeaponAddedSpellBlade` flag and applied main-hand weapon damage to spells.

---

## 13. Key Files — Responsibility

| File | Responsibility |
|------|---------------|
| `src/Modules/Calcs.lua` | Module entry point; exports `calcs` table; `calcs.buildOutput`, `calcs.calcFullDPS`, `calcs.getCalculator` |
| `src/Modules/CalcSetup.lua` | `calcs.initEnv()` — environment creation; `calcs.initModDB()` — base stat seeding; `wipeEnv()` — selective rebuild; `calcs.buildModListForNode()` — tree node→mods |
| `src/Modules/CalcPerform.lua` | `calcs.perform()` — **THE main pipeline** (~2600 lines); orchestrates buffs→exposure→defence→offence→cache |
| `src/Modules/CalcOffence.lua` | `calcs.offence()` — **damage engine** (~6000 lines); hit damage per type, conversion, penetration, crit, ailments, DoT, CombinedDPS |
| `src/Modules/CalcDefence.lua` | `calcs.defence()` + `calcs.buildDefenceEstimations()` — **defense engine** (~3800 lines); resistances, block, armour, evasion, ES, Ward, EHP, max hit taken |
| `src/Modules/CalcActiveSkill.lua` | `calcs.createActiveSkill()` + `calcs.buildActiveSkillModList()` — skill construction, support matching, gem data merging (~800 lines) |
| `src/Modules/CalcTools.lua` | `calcLib.mod()`, `calcLib.val()`, `calcLib.canGrantedEffectSupportActiveSkill()` — shared calculation primitives |
| `src/Modules/CalcBreakdown.lua` | `breakdown.simple()`, `breakdown.multiChain()`, `breakdown.slot()`, `breakdown.effMult()`, `breakdown.dot()`, `breakdown.critDot()`, `breakdown.leech()` |
| `src/Modules/ModParser.lua` | `modLib.parseMod()` — text→mod object; `formList` + `modNameList` pattern matching |
| `src/Modules/ModTools.lua` | `modLib.createMod()`, `modLib.parseTags()`, `modLib.mergeKeystones()`, serialization helpers |
| `src/Classes/ModStore.lua` | **Abstract base class** for all modifier storage; `Sum()`, `More()`, `Flag()`, `Override()`, `List()`, `Tabulate()`, `EvalMod()` tag engine, `parent` chain |
| `src/Classes/ModDB.lua` | **Modifier database** (inherits ModStore); stores `self.mods[name] = [{mod}, ...]`; `AddMod()`, `AddList()`, `AddDB()`; parent-chained `SumInternal`, `MoreInternal`, `FlagInternal` |
| `src/Classes/ModList.lua` | Lightweight mod list for temporary use (per-node, per-item, per-skill contexts); `AddMod()`, `ScaleAddList()` |
| `src/Modules/Data.lua` | Static data loader; loads all `src/Data/*.lua` files in order; builds lookup tables (`gems`, `gemForSkill`, `gemForBaseName`, `itemBases`, `minions`) |
| `src/Modules/Build.lua` | Build XML I/O; `buildMode:LoadDB(xml)` → parse + section dispatch; `buildMode:SaveDB()` → XML serialization |
| `src/Modules/ConfigOptions.lua` | ~100+ config entries: enemy stats, buffs, charges, conditions, skill-specific config; each defines `apply()` that produces `modList` |
| `src/Modules/CalcSections.lua` | UI layout: `{columnWidth, sectionId, group, colorCode, {subSection = {label, data={...}}}}` |
| `src/Classes/CalcsTab.lua` | UI rendering: iterates CalcSections, renders formatted output + breakdown strings |
| `src/Classes/Item.lua` | Item class: in-game text parsing, implicit/explicit/crafted/unique modifier extraction |
| `src/Classes/PassiveSpec.lua` | Passive tree spec: allocated nodes, jewel sockets, cluster jewel sub-trees |

### Data file responsibilities

| File | Purpose |
|------|---------|
| `Data/Gems.lua` | All gem definitions — name, level requirements, stat requirements, implicit mods, base types for supportability |
| `Data/Global.lua` | Game constants: `SkillType`, `ModFlag`, `KeywordFlag`, precision settings |
| `Data/Skills/*.lua` | Per-skill level data — base damage, damage effectiveness, cast/attack time, conversion, mechanics |
| `Data/SkillStatMap.lua` | Maps `skill_stat_descriptions` IDs to `statMap` entries; enables skill stat→mod conversion |
| `Data/Bases/*.lua` | Item base types — level requirement, implicit mods, defense values, weapon damage ranges |
| `Data/Mod*.lua` | Static mod pools per domain (explicit, corrupted, delve, synthesis, eldritch, flask, jewel, etc.) |
| `Data/Uniques/*.lua` | Unique items per item type with explicit modifiers |
| `Data/ClusterJewels.lua` | Secondary passive trees for cluster jewels |
| `Data/TimelessJewelData/` | Numeric lookup tables mapping node IDs to timeless jewel variant effects |

---

## 14. Mapping: PoB → MyHelper Equivalents

| PoB Original | Responsibility | MyHelper Current | Status |
|-------------|---------------|------------------|--------|
| `CalcSetup.lua` | Environment init, base stat seeding, item/tree/gem→mod processing | `core/stats/aggregator/stat.aggregator.ts` + `core/stats/collectors/` | **Partial** — stat collection exists, missing buff/flask/aura processing |
| `CalcPerform.lua` | Main pipeline orchestrator | **MISSING** — no equivalent | **Must create** |
| `CalcOffence.lua` | Damage engine | `core/calculation/damage/` (stubs) | **Stub only** |
| `CalcDefence.lua` | Defense engine | `core/calculation/defense/` (partial) | **Partial** |
| `CalcActiveSkill.lua` | Skill construction + support matching | `core/skills/resolvers/` | **Partial** — support matching exists, missing skill data resolution |
| `CalcTools.lua` | Shared calculation primitives | **MISSING** | **Must create** |
| `CalcBreakdown.lua` | Calculation breakdown/Trace | `core/stats/models/stat.model.ts` (TracedStat) | **Different approach** — PoB uses display strings, we use source refs |
| `ModStore.lua` | Base modifier storage + query | `core/stats/resolvers/modifier.resolver.ts` | **Different approach** — we pre-resolve, PoB queries on-demand |
| `ModDB.lua` | Modifier database (bucket-per-name) | **MISSING** — flat StatValue array instead | **Architecture mismatch** |
| `ModList.lua` | Lightweight temp mod list | **MISSING** | **Must create** |
| `ModParser.lua` | In-game text→mod objects | `core/items/` (Modifier Classifier + Factory) | **Partial** — text parsing exists, missing tag/condition system |
| `ModTools.lua` | Mod serialization, keystone merge | **MISSING** | **Must create** |
| `Data.lua` | Static game data loader | **Not started** (outside Phase 3 scope) | Deferred |
| `Data/Gems.lua` | Gem definitions | **Not started** | Deferred |
| `Build.lua` | XML import/export | `core/parsers/pob-xml.parser.ts` | **Partial** — parser exists, missing full XML schema |
| `ConfigOptions.lua` | Enemy/buff/condition config | `core/stats/context/` (partial) | **Partial** — context models exist, missing ConfigOptions→modList |
| `CalcSections.lua` | UI tab layout | **MISSING** | Phase 5 (UI) |
| `Item.lua` | Item class | `packages/shared/src/poe/` (EquippedItem) | **Partial** — data model exists, missing in-game text parsing |
| `PassiveSpec.lua` | Passive tree allocation | `core/tree/` | **Partial** — node/keystone models exist, missing timeless/cluster |
| `PassiveTree.lua` | Tree rendering | **MISSING** (outside scope) | Phase 5 (UI) |

**Overall conclusion:** MyHelper has component models (~70% partial) but **missing the central orchestrator** (`CalcPerform` equivalent) and using a **fundamentally different stat resolution model** (pre-aggregation vs query-time resolution).

---

## 15. Critical Differences — What MyHelper Simplifies vs PoB

### Architecture-level

| Area | PoB | MyHelper (Current) | Gap |
|------|-----|-------------------|-----|
| **Stat resolution** | Query-time via `modDB:Sum()` with parent chains and tag evaluation | Pre-aggregated `ResolvedCharacterStats` with pre-resolved flat/increased/more buckets | **Fundamental mismatch** — cannot support conditional mods, per-skill filtering, enemy-contextual values |
| **Mod storage** | Bucket-per-stat-name: `modDB.mods["Life"] = [mods]` | Flat array: `StatValue[]` then pre-resolved to `{flat: {}, increased: {}, more: {}}` | **No tag evaluation**, no parent chain, no conditional activation |
| **Calculation model** | Single-pass mutable output table | Multi-module pipeline with DTO creation | **No shared output table** — harder to compose cross-module dependencies |
| **Buff/aura/flask** | Full buff tables with priority, curse slot management, aura effect scaling, flask merging | **Not implemented** | Massive gap — buffs are the core of PoB builds |
| **Support gems** | Dynamic support matching with skill type expressions | Static support gem data with pre-defined more/increased multipliers | Missing: type expression matching, weapon type filters, trigger detection |
| **Breakdown/trace** | Human-readable formatted strings evaluated inline | `TracedStat` with `StatSourceRef[]` — structural data not display strings | Different purpose — ours is machine-readable, PoB's is human-readable |
| **Caching** | Two-level: ModDB parent snapshots + per-skill global cache | None in calculation layer | All recalculated every time |

### Damage pipeline differences

| Mechanic | PoB | MyHelper (Current) | Status |
|----------|-----|-------------------|--------|
| Conversion chain | Phys→Light→Cold→Fire→Chaos with gain-as-extra | Basic conversion with skill data only | **Partial** — missing global conversion, gain-as-extra, conversion cap |
| Penetration vs Exposure | Penetration in CalcOffence, exposure in CalcPerform on enemyDB | Penetration in CalcOffence (bug: separate from mitigation) | **Wrong order** — penetration must combine with enemy resistance, not multiply separately |
| Enemy resistance | Queried from enemyDB during damage loop | Hardcoded in applyMitigation (wrong: ignores penetration) | **Architecture mismatch** — should query enemy DB, not hardcode |
| Critical strike | Lucky/unlucky, bifurcation, per-weapon crit | Simple critChance × critMulti | **Simplified** — missing lucky/unlucky, per-weapon config |
| Impale | Full impale engine: stack cap, stored damage, pre-armour base | **Not implemented** | Missing |
| Ailments (bleed/poison/ignite) | Full ailment engines with duration, stack limits, ailment effect | **Not implemented** | Missing |
| Non-damaging ailments | Shock/Chill/Freeze/Scorch/Brittle/Sap with effect scaling | **Not implemented** | Missing |
| Warcry exert | Seismic/Intimidating/Rallying/Infernal cry cycling | **Not implemented** | Missing |
| Leech | Per-instance rate, cap, instant ratio, duration | **Not implemented** | Missing |
| DoT (skill intrinsic) | Separate DoT calc pipeline (ground effects, decay) | `isDotBuild` flag only | **Not implemented** |
| Double/triple damage | Probabilities | **Not implemented** | Missing |
| Culling strike | DPS contribution from culling | **Not implemented** | Missing |
| Projectile mechanics | Chain/fork/pierce counts, projectile count/target count | **Not implemented** | Missing |
| Repeat mechanics | Multistrike/Echo final repeat bonus | **Not implemented** | Missing |
| Skill cost | Mana/Life/ES/Rage cost, reservation efficiency | **Not implemented** | Missing |

### Defense pipeline differences

| Mechanic | PoB | MyHelper (Current) | Status |
|----------|-----|-------------------|--------|
| Armour formula | `armour / (armour + damage × 10)` | `armour / (armour + 5 × damage)` (wrong) | **Wrong constant** — should be 10, not 5 |
| Evasion | Level-dependent enemy accuracy | Simplified formula | **Approximation** |
| Dodge/Acrobatics | Spell dodge + attack dodge, Acrobatics conversion | **Not implemented** | Missing |
| Damage Taken As | Phys→Ele conversion for damage taken | **Not implemented** | Missing |
| MoM | Per-type MoM percentage | Override list only | **Simplified** |
| Guard skills | Steel Skin, Immortal Call, Arcane Cloak absorption | **Not implemented** | Missing |
| Ward | Ward + Olroth's Resolve | **Not implemented** | Missing |
| Aegis | Prismatic Aegis, Frost Shield, Elemental Aegis | **Not implemented** | Missing |
| Petrified Blood | Life loss prevention | **Not implemented** | Missing |
| Stun/ailment avoidance | Full avoidance computation | **Not implemented** | Missing |
| Degens/net regen | Life/ES/Mana degen vs regen net | **Not implemented** | Missing |
| Recovery on block | ES/life/mana on block | Stub only | **Partial** |
| EHP max hit | Per-type maximum hit taken | Effective life only | **Simplified** |

### Missing entire subsystems

1. **Buff/Debuff/Aura/Curse system** (~1250 lines in CalcPerform)
2. **Flask merging** (~800 lines in CalcPerform)
3. **Curse priority and slot management**
4. **Non-damaging ailment effect + stacking**
5. **Timeless jewel resolution** (~entire subsystem)
6. **Cluster jewel tree integration**
7. **Party/buddy DPS calculation**
8. **Boss skill presets** (Atziri, Shaper, etc.)
9. **Trigger skill aggregation** (Cast on Crit, Cast when Damage Taken)
10. **Minion calculation mirror** (separate defence/offence for minion)
11. **Mirage/saviour reflection cloning**
12. **PvP scaling**
13. **Glancing Blows, Versatile Combatant, Lucky/Unlucky block**
14. **Stat→Defence conversions** (uncapped fire→armour, uncapped cold→evasion)
15. **Attribute→Stat bonuses** (Iron Grip, Iron Will, Transfiguration)
16. **Brand attachment/activation frequency**
17. **Totem/trap/mine limits**
18. **Gem quality variants** (Anomalous/Divergent/Phantasmal — modeled but not resolved)
19. **Gem level/quality stat interpolation** (linear + effectiveness + static modes)
20. **Socketed-in-gem modifier support** (item socketed gem modifiers)

---

## 16. Final Recommendation per Subsystem

| Subsystem | Recommendation | Why |
|-----------|---------------|-----|
| **ModDB / ModStore** | **REWRITE** | Our flat StatValue[] pre-aggregation model is incompatible with PoB's query-time resolution with tag evaluation. Rewrite to bucket-per-stat-name + EvalMod() tag engine + parent chaining. This is the **foundation** everything else depends on. |
| **CalcPerform (orchestrator)** | **REWRITE** | We have no equivalent. Must create a single-pass sequencer that runs buffs→exposure→defence→offence in order with a shared mutable output table. |
| **CalcOffence (damage engine)** | **REWRITE** | Our pipeline stubs have wrong order (penetration separated from mitigation) and are missing entire subsystems (ailments, impale, leech, DoT, exertion, repeat mechanics). Rewrite to match PoB's recursive calcDamage() + 2-pass crit/non-crit loop. |
| **CalcDefence (defense engine)** | **REWRITE** | Our formula uses wrong constant (5 instead of 10). Missing EHP/max-hit engine, damage-taken-as conversion, guard/ward/aegis, stun. Rewrite to match PoB's sequential defence→buildDefenceEstimations chain. |
| **ModParser (text parsing)** | **ADAPT** | Our pattern registry + classifier approach is structurally similar. Adapt to use PoB's formList+modNameList two-phase pattern with tag support. |
| **Skill resolution** | **ADAPT** | Our resolvers + converter chain are correct in principle. Adapt to add skill-type expression matching, weapon type filtering, trigger detection, gem quality stat interpolation. |
| **Passive tree** | **ADAPT** | Our node/keystone/mastery/cluster/ascendancy model is sound. Adapt to add timeless jewel resolution and per-node ModList creation. |
| **Stat aggregation** | **REWRITE** | Our pre-aggregated `ResolvedCharacterStats` model is a dead end. Rewrite to query-time `modDB:Sum(cfg, stat)` with tag evaluation. Keep `TracedStat` for AI explainability but generate it from ModDB queries, not from pre-resolved buckets. |
| **Calculation context** | **ADAPT** | Our `CalculationContext` + `EnemyContext` + `ConditionContext` are structurally correct. Adapt to use enemyDB instead of hardcoded values; add boss tier presets. |
| **Breakdown/trace** | **ADAPT** | Our `TracedStat` with `StatSourceRef[]` is good for AI explainability. Adapt to also generate human-readable formatted breakdown strings for UI display. |
| **Config system** | **REWRITE** | Our context models are static. Rewrite to match ConfigOptions → modList pattern, where each config setting produces modifiers on `modDB`/`enemyDB`. |
| **Caching** | **REWRITE** | No caching exists. Implement two-level cache: per-build ModDB parent snapshots + per-skill output cache. |
| **Static data** | **COPY** | PoB's Data layer is a serialization format problem, not an architecture problem. Copy the data structure (gam→stat, base→mods, unique→mods) but store as typed TS, not Lua files. |
| **Buff/Aura/Curse system** | **REWRITE** | Entirely missing. Must implement buff table processing, curse priority/slot management, aura effect scaling, and flask merging — following PoB's CalcPerform lines 2050-3410. |

### Why these recommendations matter

PoB's architecture has been refined over **8+ years** by hundreds of contributors. Its module boundaries, data structures, and pipeline order represent the correct understanding of Path of Exile's game mechanics. We should not invent alternatives.

The biggest myhelper mistake is the **pre-aggregated stat model**. PoB resolves stats at calculation time because:
1. Stats depend on **current skill context** (e.g., "30% increased fire damage with spells" only applies to spells)
2. Stats depend on **conditional state** (enemy moving, player low life, recently blocked)
3. Stats depend on **multiplier state** (per charge, per nearby enemy, per attribute)
4. Stats are **never fully "resolved"** — they're always context-dependent

Our `ResolvedCharacterStats` with `{ flat: {}, increased: {}, more: {} }` buckets cannot represent any of this. Every stat query must pass a `cfg` (skill context) through the `ModDB` to get correct results.

### Implementation order

1. **REWRITE ModDB + ModStore** (foundation — everything depends on it)
2. **REWRITE CalcPerform** (orchestrator — defines the pipeline order)
3. **REWRITE CalcOffence** (damage engine — largest module)
4. **REWRITE CalcDefence** (defense engine)
5. **ADAPT skill/parser/tree** (domain models onto new ModDB)
6. **COPY static data** (need data for calculations)
7. **IMPLEMENT buff/curse/flask** (requires ModDB + CalcPerform first)
8. **IMPLEMENT caching** (optimization — not needed for correctness)
9. **ADAPT breakdown/trace** (AI explainability layer on top)
10. **IMPLEMENT UI** (Phase 5)
