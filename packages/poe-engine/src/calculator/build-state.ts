import type { Modifier } from '../modifiers/modifier.js';
import type { ConditionState } from '../conditions/condition-expr.js';
import type { ModifierSnapshot } from '../moddb/modifier-snapshot.js';
import type { ComputedStats } from './computed-stats.js';

export interface CalculateBuildInput {
  readonly baseStats: Readonly<Record<string, number>>;
  readonly modSnapshot: ModifierSnapshot;
  readonly conditionState: ConditionState;
}

export interface BuildLayer {
  readonly source: string;
  readonly modifiers: readonly Modifier[];
}

export interface CalculateBuildResult {
  readonly stats: ComputedStats;
  readonly layers: readonly BuildLayer[];
}
