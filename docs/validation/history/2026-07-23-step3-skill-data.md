# Step 3.3 — Skill Gem Data Import

**Date:** 2026-07-23
**Builds tested:** 5 (2 valid)
**Total comparisons:** 25
**Overall accuracy:** 16.0% (unchanged — but individual speed errors improved dramatically)

## Changes

1. **Parser fix** (`pob-xml.parser.ts`): Parse `<Gem>` children inside `<Skill>` elements
   - Two formats handled: `<SkillSet>` → `<Skill>` → `<Gem>` and direct `<Skill>` → `<Gem>`
   - Active skill identified via `mainActiveSkill="1"` + `includeInFullDPS="true"`
   - Main gem identified as the non-support gem with highest `count`

2. **Skill base data** (`skill-data.ts`): Minimal registry mapping gem names → type, base cast time, base APS, base crit
   - Covers: `Flameblast of Celerity`, `Poisonous Concoction`, `Shield Charge`, and utility skills
   - Supports attacks with weapon-derived APS (`attackTimeMultiplier`) and attacks with fixed base (`baseAttackSpeed`)

3. **Weapon base data** (`weapon-data.ts`): APS + crit for common base types (staves, wands, daggers, etc.)

4. **Skill converter** (`skill-converter.ts`): Generates `flat` type modifiers for `offense.attackSpeed` / `offense.castSpeed` based on active skill + weapon

5. **Pipeline integration** (`pob-converter.ts`, `run-engine.ts`): Skill base modifiers flow through `convertPobDto`; hardcoded 1.0 base in run-engine replaced with 0 (fallback 1.0 from converter)

## Speed/CastRate Improvements

| Build | Stat | Before | After | PoB | Before Error | After Error |
|---|---|---|---|---|---|---|
| Templar | CastRate | 1.51 | 4.31 | 3.80 | -60.3% | **+13.5%** |
| Witch | Speed | 1.50 | 2.25 | 2.76 | -45.6% | **-18.5%** |

## Files Created/Modified

- `packages/poe-data/src/pob/pob-xml.dto.ts` — `PoBGem`, `PoBSkillGroup` types
- `packages/poe-data/src/pob/pob-xml.parser.ts` — Gem/group parsing for both XML formats
- `packages/poe-data/src/pob/skill-data.ts` — Skill base data registry
- `packages/poe-data/src/pob/weapon-data.ts` — Weapon base data registry
- `packages/poe-data/src/pob/skill-converter.ts` — Modifier generation from skills
- `packages/poe-data/src/pob/pob-converter.ts` — Integrated skill base pipeline
- `scripts/run-engine.ts` — Removed hardcoded speed bases

## Remaining Speed Gaps

- Witch Speed 2.25 vs 2.76: ~23% increased attack speed missing from items/tree (Poisonous Concoction has +flat chaos damage, but attack speed mods on weapons might not be parsed)
- Templar CastRate 4.31 vs 3.80: Engine has slightly more increased cast speed (+51%) than PoB expects. The difference is ~0.5 casts/sec
- All 3 excluded builds still use default 1.0 base (no skill data for their gems)

## Next Priority

Expand skill/weapon data coverage to all builds.
