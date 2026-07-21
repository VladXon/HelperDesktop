import type { StatKey } from '../registry/stat-key.js';

/**
 * Numeric scaling expression.
 *
 * While ConditionExpr determines IF a modifier is active (boolean gate),
 * ScaleExpr determines HOW MUCH the modifier contributes (numeric multiplier).
 *
 * Examples:
 *   - "20% more per Frenzy Charge" → ChargeScale { chargeKind: 'frenzy', perCharge: 1 }
 *   - "5% increased per 10 Strength" → StatScale { statKey: S['attribute.strength'], per: 10 }
 *   - "2% more per Poison on enemy" → StackScale { source: 'poison', perStack: 1 }
 */
export type ScaleExpr =
  | ConstantScale
  | ChargeScale
  | StatScale
  | StackScale
  | DistanceScale
  | EventScale;

export interface ConstantScale {
  readonly kind: 'constant';
  /** Fixed multiplier (default 1 = no change) */
  readonly value: number;
}

export interface ChargeScale {
  readonly kind: 'charge';
  /** Charge type */
  readonly chargeKind: string;
  /** Scaling factor per charge */
  readonly perCharge: number;
  /** Maximum charge count to scale up to (default unlimited) */
  readonly limit?: number;
}

export interface StatScale {
  readonly kind: 'stat';
  /** The stat to scale by */
  readonly statKey: StatKey;
  /** How many units of the stat to scale by */
  readonly per: number;
  /** Scaling factor per `per` units */
  readonly perValue: number;
  /** Maximum scaling limit */
  readonly limit?: number;
}

export interface StackScale {
  readonly kind: 'stack';
  /** Stack source (poison, rage, withered, etc.) */
  readonly source: string;
  /** Multiplier per stack */
  readonly perStack: number;
  /** Maximum stack count to scale up to */
  readonly limit?: number;
}

export interface DistanceScale {
  readonly kind: 'distance';
  /** Minimum distance (units) */
  readonly min: number;
  /** Maximum distance (units) */
  readonly max: number;
  /** Multiplier applied per unit */
  readonly perUnit: number;
}

export interface EventScale {
  readonly kind: 'event';
  /** Event to count: 'manaSpent', 'lifeLost', 'enemiesHit' */
  readonly event: string;
  /** Time window in ms */
  readonly window: number;
  /** Multiplier per event occurrence */
  readonly perEvent: number;
  /** Maximum event count */
  readonly limit?: number;
}
