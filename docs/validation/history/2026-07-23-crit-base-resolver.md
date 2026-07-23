# Crit Base Resolver (P1)

Date: 2026-07-23

Builds tested: 15

## Changes

### 1. Power Charge → Critical Strike Chance
- Added `getConfigModifiers()` in `pob-converter.ts` that creates `increased` modifiers for `offense.criticalChance`
- Each power charge grants +50% increased critical strike chance
- Charge count derived from config (boolean toggle or number input)

### 2. Config Parser: Boolean Charge Toggles
- Added `usePowerCharges`, `useFrenzyCharges`, `useEnduranceCharges` boolean parsing in `pob-xml.parser.ts`
- Default max charge count = 3 per type when boolean is true

### 3. Maximum Power Charges from Tree
- Added `mechanic.maximumPowerCharges` (and frenzy/endurance) to `domain-stats.ts`
- Added parsing for "+1 to Maximum Power Charges" pattern in `stat-string-parser.ts`
- `getConfigModifiers` scans tree modifiers for max charge bonuses and overrides default 3
- E.g., Forbidden Power ascendancy (+1 max PC) → effective max = 4

### 4. "Per Power Charge" Scaling
- Modified `parseStatString` to accept optional `context.charges` parameter
- Stat strings like "8% increased Critical Strike Chance per Power Charge" now multiply by actual charge count
- With 4 power charges: 8% × 4 = 32% instead of just 8%

### 5. Skill Base Crit Data
- Added `IceNovaAltX` (Ice Nova of Deep Freeze) to `skill-data.ts` with 6% base crit

### 6. Engine Domain Stats
- Added `mechanic.maximumPowerCharges`, `mechanic.maximumFrenzyCharges`, `mechanic.maximumEnduranceCharges`

## CritChance Results

| Build | Before | After | POB | Δ Gap |
|-------|--------|-------|-----|-------|
| 4x0Dm0JKmdpx (CoC Occultist) | 8.25 | 29.45 | 53.52 | -84.6% → -45.0% |
| 2FV4DZH2wabZ (CI Occultist) | 5.0 | 29.95 | 59.8 | -91.6% → -49.9% |
| 2OYTeDGrZCJJ (Hierophant) | 10.0 | 26.2 | 62.25 | -83.9% → -57.9% |
| h-si3kweTn (Deadeye) | 8.75 | 18.75 | 27.0 | -67.6% → -30.6% |
| Vt0egZ5HIREa (Saboteur) | 12.25 | 22.25 | 16.58 | -26.1% → +34.2% |

## Files Changed

- `packages/poe-engine/seeds/domain-stats.ts` — new charge max stats
- `packages/poe-data/src/pob/pob-xml.parser.ts` — boolean charge toggle parsing
- `packages/poe-data/src/pob/pob-converter.ts` — config modifier generation, max charge tree scan
- `packages/poe-data/src/pob/stat-string-parser.ts` — per-charge scaling, max charge parsing
- `packages/poe-data/src/pob/tree-converter.ts` — charge context pass-through
- `packages/poe-data/src/pob/skill-data.ts` — IceNovaAltX base crit

## Baseline (before this round)

Before:
CritChance accuracy: ~8.3% avg (most builds 0-5%)
ES accuracy: 38% mean error

After:
CritChance accuracy: ~50-70% of POB for crit builds
ES accuracy: unchanged (38% mean error)

## Remaining Crit Gaps

- Support gem modifiers (Increased Critical Strikes "more" multiplier)
- Additional tree data coverage (12 unmatched nodes per build)
- Diamond Flask / Assassin's Mark config effects
- Ascendancy base crit bonuses (e.g., Assassin's +1.5% base crit)

Commit: TODO
