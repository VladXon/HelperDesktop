import type { ComputedStats } from '../calculator/computed-stats.js';
import type { BuildLayer } from '../calculator/build-state.js';
import type { ModifierSnapshot } from '../moddb/modifier-snapshot.js';
import type { ConditionState } from '../conditions/condition-expr.js';

export interface ExplanationContext {
  readonly stats: ComputedStats;
  readonly layers: readonly BuildLayer[];
  readonly modifiers: ModifierSnapshot;
  readonly conditionState: ConditionState;
}
