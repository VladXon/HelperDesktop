# Phase 1 — Core Engine

**Status**: COMPLETE  
**Package**: `@helper/client` → `src/main/poe/core/`  
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

| Directory | File | Purpose |
|-----------|------|---------|
| `dto/` | `pob-xml.dto.ts` | PoB XML structure types (DTO layer) |
| `parsers/` | `pob-xml.parser.ts` | base64 → gunzip → regex → PoBXmlDTO |
| `adapters/` | `pob.adapter.ts` | URL fetch + parse → `AdapterResult<PoBXmlDTO>` |
| `factory/` | `build-factory.ts` | PoBXmlDTO → `Build` domain model |
| `models/` | `index.ts` | Re-exports all domain types from `@helper/shared` |
| `resolvers/` | `stat-resolver.ts` | Mod text regex → `ComputedItemStats` |
| `calculators/` | `damage.calculator.ts` | `estimateOffense()` — estimated DPS, penetration, crit |
| | `defense.calculator.ts` | `calculateDefense()` — EHP, resistances, recovery |
| `rules/` | `damage.rules.ts` | Threshold checks → `Problem[]`, `Warning[]`, `UpgradeRecommendation[]` |
| `engine/` | `analyzer.engine.ts` | Orchestrates full pipeline → `AnalysisResult` |
| `explanation/` | `problem.explainer.ts` | Deterministic text explanations + upgrade suggestions |

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

| Extension | File | How to extend |
|-----------|------|---------------|
| New mod pattern | `resolvers/stat-resolver.ts` | Add entry to `MOD_PATTERNS` array (regex + category) |
| New rule check | `rules/damage.rules.ts` | Add to `evaluateDamageReport` / `evaluateDefenseReport` |
| New upgrade trigger | `rules/damage.rules.ts` | Add to `detectUpgrades` function |
| New score dimension | `engine/analyzer.engine.ts` | Add to `computeScores`, return in `BuildScores` |
| New explanation template | `explanation/problem.explainer.ts` | Add to `templates` record |
| New PoB section | `parsers/pob-xml.parser.ts` | Add `parseXxxSection()` using regex extraction |
| New adapter | `adapters/` | Implement `AdapterResult<T>` pattern, no business logic |
| New calculator | `calculators/` | Pure TS, no DB/Electron deps |

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
