import type { Modifier } from './modifier.js';
import type { StatKey } from '../registry/stat-key.js';
import type { ConditionExpr } from '../conditions/condition-expr.js';
import type { ScaleExpr } from '../conditions/scale-expr.js';
import type { ModifierSource, ModifierType, ModifierMeta } from './modifier-types.js';

export interface CreateModifierInput {
  readonly source: ModifierSource;
  readonly type: ModifierType;
  readonly stat: StatKey;
  readonly value: number;
  readonly condition?: ConditionExpr;
  readonly scale?: ScaleExpr;
  readonly meta: ModifierMeta;
  readonly id?: string;
}

let _nextId = 1;

export function createModifier(input: CreateModifierInput): Modifier {
  return {
    id:
      input.id ??
      `${input.source}.${input.type}.${input.stat.id}.${_nextId++}`,
    source: input.source,
    type: input.type,
    stat: input.stat,
    value: input.value,
    condition: input.condition,
    scale: input.scale,
    meta: input.meta,
  };
}
