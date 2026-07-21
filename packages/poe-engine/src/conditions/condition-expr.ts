import type { ConditionLeaf } from './condition-leaf.js';

/**
 * A boolean expression tree for PoE conditions.
 *
 * Supports AND, OR, NOT composition of leaf conditions.
 * This covers every PoE condition pattern:
 *   - State checks: "while leeching"
 *   - Charge thresholds: "at least 3 frenzy charges"
 *   - Skill filtering: "with attack skills"
 *   - Cross-actor: "enemy is burning"
 *   - Stat thresholds: "life > 5000"
 *   - Temporal: "killed recently", "every 4 seconds"
 *   - Stacks: "at least 10 poison stacks"
 */
export type ConditionExpr =
  | ConditionLeaf
  | AndConditions
  | OrConditions
  | NotCondition
  | AlwaysCondition
  | NeverCondition;

export interface AndConditions {
  readonly kind: 'AND';
  readonly children: readonly ConditionExpr[];
}

export interface OrConditions {
  readonly kind: 'OR';
  readonly children: readonly ConditionExpr[];
}

export interface NotCondition {
  readonly kind: 'NOT';
  readonly child: ConditionExpr;
}

export interface AlwaysCondition {
  readonly kind: 'always';
}

export interface NeverCondition {
  readonly kind: 'never';
}

/**
 * Runtime state passed to the condition evaluator.
 */
export interface ConditionState {
  /** Boolean state variables on the player */
  readonly playerStates: ReadonlyMap<string, boolean>;
  /** Charge counts on the player */
  readonly charges: ReadonlyMap<string, number>;
  /** Stack counts (poison, rage, withered, etc.) */
  readonly stacks: ReadonlyMap<string, number>;
  /** Current skill tags of the skill being checked */
  readonly skillTags: readonly string[];
  /** Boolean state variables on the enemy */
  readonly enemyStates: ReadonlyMap<string, boolean>;
  /** Resolved stat values (computed by StatAggregator or ModDB) */
  readonly statValues: ReadonlyMap<string, number>;
  /** Timer phases: key = timerName, value = 'active' | 'inactive' */
  readonly timerPhases: ReadonlyMap<string, 'active' | 'inactive'>;
  /** Recent events: key = eventName, value = timestamp of last occurrence */
  readonly recentEvents: ReadonlyMap<string, number>;
  /** Current timestamp (ms) for "recently" evaluation */
  readonly now: number;
  /** Current equipment slot context */
  readonly currentSlot?: string;
  /** Current socket context */
  readonly currentSocketedIn?: string;
}

export function defaultConditionState(): ConditionState {
  return {
    playerStates: new Map(),
    charges: new Map(),
    stacks: new Map(),
    skillTags: [],
    enemyStates: new Map(),
    statValues: new Map(),
    timerPhases: new Map(),
    recentEvents: new Map(),
    now: 0,
  };
}
