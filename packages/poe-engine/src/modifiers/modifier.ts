import type { StatKey } from '../registry/stat-key.js';
import type { ConditionExpr } from '../conditions/condition-expr.js';
import type { ScaleExpr } from '../conditions/scale-expr.js';
import type { ModifierSource, ModifierType, ModifierMeta } from './modifier-types.js';

export interface Modifier {
  readonly id: string;
  readonly source: ModifierSource;
  readonly type: ModifierType;
  readonly stat: StatKey;
  readonly value: number;
  readonly condition?: ConditionExpr;
  readonly scale?: ScaleExpr;
  readonly meta: ModifierMeta;
}
