# Phase 1 — Core Engine

> **Note**: Code has been migrated from `@helper/client` to `@helper/poe-engine` and `@helper/poe-data` packages. This document describes the original architecture. See individual packages for current implementation.

**Status**: COMPLETE (migrated to `@helper/poe-engine` + `@helper/poe-data`)  
**Package**: `@helper/poe-engine` (engine, calculators, rules) + `@helper/poe-data` (DTOs, parsers, adapters)  
**Commit**: `cb3511c` (implement), `5971bf0` (audit fixes)

---

## Pipeline

```
PoB XML / Pastebin URL
    │
    ▼
PoBXmlDTO  (dto/pob-xml.dto.ts)
    │
    ▼
Build Domain Model  (factory/build-factory.ts)
    │  rawMods preserved, computedStats = zeroed
    ▼
StatResolver  (resolvers/stat-resolver.ts)
    │  rawMods → computed stats (regex pattern matching, 45 patterns)
    ▼
Calculators  →  Rule Engine  →  Explanation
    │                │                │
    │  defense       damage rules     problem explainer
    │  offense       defense rules    recommendation list
    │  (estimated)   scaling rules
    │                upgrade det.
    ▼                ▼                ▼
AnalysisResult  { facts, insights, scores, metadata }
```

---

## Module map

| Directory (old) | File (old) | Current package | Current path |
|-----------------|------------|-----------------|--------------|
| `dto/` | `pob-xml.dto.ts` | `@helper/poe-data` | `packages/poe-data/src/pob/pob-xml.dto.ts` |
| `parsers/` | `pob-xml.parser.ts` | `@helper/poe-data` | `packages/poe-data/src/pob/pob-xml.parser.ts` |
| `adapters/` | `pob.adapter.ts` | `@helper/poe-data` | `packages/poe-data/src/pob/pob.adapter.ts` |
| `factory/` | `pob-converter.ts` | `@helper/poe-data` | `packages/poe-data/src/pob/pob-converter.ts` |
| `resolvers/` | `stat-resolver.ts` | `@helper/poe-engine` + `@helper/poe-data` | `packages/poe-data/src/pob/stat-string-parser.ts` + `packages/poe-engine/src/modifiers/` |
| `calculators/` | `damage.calculator.ts` + `defense.calculator.ts` | `@helper/poe-engine` | `packages/poe-engine/src/calculator/` |
| `rules/` | `damage.rules.ts` | `@helper/poe-engine` | `packages/poe-engine/src/` |
| `engine/` | `analyzer.engine.ts` | `@helper/poe-engine` | `packages/poe-engine/src/` |
| `explanation/` | `problem.explainer.ts` | `@helper/poe-engine` | `packages/poe-engine/src/explanation/` |

---

## Calculator limitations

Both calculators produce **approximations**, not game-accurate results.

### `estimateOffense`

| Limitation | Details |
|------------|---------|
| Base damage | Falls back to hardcoded `{phys: 10-20}` when no flat damage data |
| Skill gems | Support interactions, quality effects not modeled |
| DoT | `isDotBuild`, `dotDps` stubbed (return 0/false) |
| Penetration | Only fire pen computed from stats; cold/lightning ignored |
| Cast time | Hardcoded `0.8s` — not read from skill data |

### `calculateDefense`

| Limitation | Details |
|------------|---------|
| Life per level | Class-independent average (12/level). Actual: 9.5-12.5 by class |
| Life formula | Hardcoded +5% fallback for unparsed `increased maximum life` mods |
| Phys mitigation | Uses `armour/(armour+5000)` — assumes ~1000 dmg hit |
| Evasion | Uses `evasion/(evasion+10000)` — assumes ~10000 attacker accuracy |
| Leech | Stubbed to 0/0/0 |
| Guard skills | Always `null` |
| Ailment immunity | Always `{}` |
| Recoup | Always 0 |

---

## DTO contracts

### Input: `PoBXmlDTO` (from parser)

```ts
PoBXmlDTO {
  build: { level, className, ascendClassName, bandit, targetVersion }
  skills: PoBSkillSet[]       // SkillSet → Skill[] (active gem + supports)
  items: PoBItem[]            // id, title, baseType, rarity, rawMods[], sockets[]
  tree: { treeVersion, nodes[], masteryEffects{}, keystones[], ascendancyNodes[] }
  config: { isBoss, enemyResistances, charges{frenzy,power,endurance} }
}
```

### Output: `AnalysisResult` (from engine)

```ts
AnalysisResult {
  build: BuildSummary          // display metadata
  facts: {
    offense: OffenseReport     // DPS, pen, crit, damage breakdown
    defense: DefenseReport     // life/ES, resists, armour/ev, EHP, recovery
    scaling: ScalingReport     // primary scalar, diminishing returns
  }
  insights: {
    problems: Problem[]        // critical → high → medium → low
    warnings: Warning[]
    recommendations: UpgradeRecommendation[]
  }
  scores: BuildScores          // overall + 7 dimension scores (0-100)
  metadata: {
    analyzerVersion: "2.0.0"
    calculationVersion: "1.0.0"
    patchVersion, analyzedAt, buildHash
  }
}
```

---

## Extension points

| Extension | File (old) | Current location | How to extend |
|-----------|------------|-----------------|---------------|
| New mod pattern | `stat-resolver.ts` | `packages/poe-data/src/pob/stat-string-parser.ts` | Add entry to `MOD_PATTERNS` array (regex + category) |
| New rule check | `damage.rules.ts` | `packages/poe-engine/src/` | Add to `evaluateDamageReport` / `evaluateDefenseReport` |
| New upgrade trigger | `damage.rules.ts` | `packages/poe-engine/src/` | Add to `detectUpgrades` function |
| New score dimension | `analyzer.engine.ts` | `packages/poe-engine/src/` | Add to `computeScores`, return in `BuildScores` |
| New explanation template | `problem.explainer.ts` | `packages/poe-engine/src/explanation/` | Add to `templates` record |
| New PoB section | `pob-xml.parser.ts` | `packages/poe-data/src/pob/pob-xml.parser.ts` | Add `parseXxxSection()` using regex extraction |
| New adapter | `adapters/` | `packages/poe-data/src/pob/` | Implement `AdapterResult<T>` pattern, no business logic |
| New calculator | `calculators/` | `packages/poe-engine/src/calculator/` | Pure TS, no DB/Electron deps |

---

## Test fixtures

| Fixture | Build type | Key characteristics |
|---------|-----------|---------------------|
| `boneshatter-jugg.pob.xml` | Melee physical | L90 Jugg/Berserker, Boneshatter, 9 equip slots, full resists |
| `firetrap-elementalist.pob.xml` | Spell DoT | L92 Elementalist, Fire Trap + RF, hybrid life/ES |

---

## Design rules

1. **No Electron, no DB, no AI.** Core engine is pure TypeScript — testable in Node.js.
2. **Immutable pipeline.** Stats are computed once, then consumed by rules and explanation.
3. **Math before AI.** Core provides complete analysis without any external service.
4. **Pattern-driven.** Mod matching uses regex arrays, not hardcoded string comparisons.
5. **DTOS → Factory → Domain.** Adapters produce DTOs, factory maps to domain model, core computes.
