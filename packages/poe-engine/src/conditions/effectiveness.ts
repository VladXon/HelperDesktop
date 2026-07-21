import type { ConditionExpr } from './condition-expr.js';
import type { ScaleExpr } from './scale-expr.js';

/**
 * Combined gate + scale for a modifier.
 *
 * A modifier contributes when `gate` is satisfied.
 * Its value is multiplied by the resolved `scale` amount.
 *
 * If gate is undefined → always active.
 * If scale is undefined → constant multiplier of 1.
 */
export interface ModifierEffectiveness {
  /** Boolean gate — is this modifier active? (undefined = always) */
  readonly gate?: ConditionExpr;
  /** Numeric scale — how much does this modifier contribute? (undefined = 1×) */
  readonly scale?: ScaleExpr;
}

/**
 * Resolved effectiveness: is the modifier active, and by how much?
 */
export interface ResolvedEffectiveness {
  readonly active: boolean;
  readonly scale: number;
}
