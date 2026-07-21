export type { StatValue, StatSource, StatType } from './models/stat.model.js';
export type {
  DefenseStats,
  OffenseStats,
  MechanicsState,
  AttributeStats,
  ResolvedCharacterStats,
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
