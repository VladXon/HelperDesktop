export type { StatValue, StatSource, StatType, ModifierScope, StatSourceRef, TracedStat } from './models/stat.model.js';
export { makeTracedStat, addToTracedStat } from './models/stat.model.js';
export type {
  DefenseStats,
  OffenseStats,
  MechanicsState,
  AttributeStats,
  ResolvedCharacterStats,
  TracedDefenseStats,
} from './models/character-stats.model.js';
export { emptyDefense, emptyOffense, emptyMechanics, emptyAttributes } from './models/character-stats.model.js';

export { collectItemStats } from './collectors/item.collector.js';
export { collectSkillStats } from './collectors/skill.collector.js';
export { collectTreeStats } from './collectors/tree.collector.js';

export { resolveModifiers } from './resolvers/modifier.resolver.js';
export { resolveConditionalModifiers } from './resolvers/conditional.resolver.js';
export { applyKeystoneEffects } from './resolvers/keystone.resolver.js';

export { aggregateCharacterStats } from './aggregator/stat.aggregator.js';
export type { AggregatorInput } from './aggregator/stat.aggregator.js';

export type { EnemyContext } from './context/enemy-context.js';
export { defaultEnemy, bossEnemy } from './context/enemy-context.js';
export type { ConditionContext } from './context/condition-context.js';
export { defaultConditions } from './context/condition-context.js';
export type { CalculationContext, ChargeState, BuffState } from './context/calculation-context.js';
export { defaultCalculationContext } from './context/calculation-context.js';
