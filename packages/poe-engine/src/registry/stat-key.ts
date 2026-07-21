import type { StatCategory } from './stat-category.js';
import type { AggregationKind } from './aggregation.js';
import type { GameStatMapping } from './game-stat-mapping.js';

export interface StatKey {
  readonly id: string;
  readonly displayName: string;
  readonly category: StatCategory;
  readonly aggregation: AggregationKind;
  readonly gameMappings: readonly GameStatMapping[];
  readonly damageType?: 'physical' | 'fire' | 'cold' | 'lightning' | 'chaos';
  readonly isPercent?: boolean;
  readonly defaultCap?: number;
  readonly defaultBase?: number;
}
