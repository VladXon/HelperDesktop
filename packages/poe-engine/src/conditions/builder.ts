import type { StatKey } from '../registry/stat-key.js';
import type { ConditionLeaf } from './condition-leaf.js';
import type { ConditionExpr } from './condition-expr.js';
import type { ScaleExpr } from './scale-expr.js';

// ── Condition builders ──

/**
 * Creates an AND condition. All children must be true.
 */
export function and(...children: ConditionExpr[]): ConditionExpr {
  if (children.length === 0) return { kind: 'always' };
  if (children.length === 1) return children[0]!;
  return { kind: 'AND', children };
}

/**
 * Creates an OR condition. At least one child must be true.
 */
export function or(...children: ConditionExpr[]): ConditionExpr {
  if (children.length === 0) return { kind: 'never' };
  if (children.length === 1) return children[0]!;
  return { kind: 'OR', children };
}

/**
 * Creates a NOT condition. Inverts a single child.
 */
export function not(child: ConditionExpr): ConditionExpr {
  if (child.kind === 'always') return { kind: 'never' };
  if (child.kind === 'never') return { kind: 'always' };
  if (child.kind === 'NOT') return child.child;
  return { kind: 'NOT', child };
}

/**
 * Creates a state condition: "while Moving", "while Leeching", etc.
 */
export function state(varName: string): ConditionExpr {
  const leaf: ConditionLeaf = { kind: 'state', var: varName };
  return leaf;
}

/**
 * Creates a charge condition: "at least 3 frenzy charges".
 */
export function charge(
  chargeKind: string,
  min?: number,
  max?: number,
): ConditionExpr {
  const leaf: ConditionLeaf = { kind: 'charge', chargeKind, min, max };
  return leaf;
}

/**
 * Creates a skill tag condition: "with attack skills", "NOT minion".
 */
export function skillTag(tag: string, negate?: boolean): ConditionExpr {
  const leaf: ConditionLeaf = { kind: 'skillTag', tag, negate };
  return leaf;
}

/**
 * Creates an actor condition: "enemy is burning".
 */
export function actor(
  actorName: 'player' | 'enemy' | 'minion',
  varName: string,
  negate?: boolean,
): ConditionExpr {
  const leaf: ConditionLeaf = { kind: 'actor', actor: actorName, var: varName, negate };
  return leaf;
}

/**
 * Creates a stat threshold condition: "life > 5000".
 */
export function threshold(
  statKey: StatKey,
  operator: ConditionLeaf & { kind: 'statThreshold' } extends infer T
    ? T extends { operator: infer O } ? O : never
    : never,
  value: number,
): ConditionExpr {
  const leaf: ConditionLeaf = {
    kind: 'statThreshold',
    statKey,
    operator: operator as 'greaterThan' | 'lessThan' | 'equals' | 'greaterOrEqual' | 'lessOrEqual',
    value,
  };
  return leaf;
}

/**
 * Creates a slot condition: "item is in Helmet slot".
 */
export function slot(slotName: string, negate?: boolean): ConditionExpr {
  const leaf: ConditionLeaf = { kind: 'slot', slotName, negate };
  return leaf;
}

/**
 * Creates a socketed-in condition: "gem is socketed in Weapon 1".
 */
export function socketedIn(slotName: string, negate?: boolean): ConditionExpr {
  const leaf: ConditionLeaf = { kind: 'socketedIn', slotName, negate };
  return leaf;
}

/**
 * Creates a recently condition: "killed recently".
 */
export function recently(event: string, window?: number): ConditionExpr {
  const leaf: ConditionLeaf = { kind: 'recently', event, window };
  return leaf;
}

/**
 * Creates a timer condition: "every 4 seconds (active phase)".
 */
export function timer(interval: number, phase: 'active' | 'inactive'): ConditionExpr {
  const leaf: ConditionLeaf = { kind: 'timer', interval, phase };
  return leaf;
}

/**
 * Creates a during-action condition: "while casting".
 */
export function duringAction(action: string): ConditionExpr {
  const leaf: ConditionLeaf = { kind: 'duringAction', action };
  return leaf;
}

/**
 * Creates a stack condition: "at least 10 poison stacks".
 */
export function stacks(source: string, min?: number, max?: number): ConditionExpr {
  const leaf: ConditionLeaf = { kind: 'stack', source, min, max };
  return leaf;
}

// ── Always / Never ──

export const always: ConditionExpr = { kind: 'always' };
export const never: ConditionExpr = { kind: 'never' };

// ── Scale builders ──

/**
 * Creates a constant scale (no scaling — base value × 1).
 */
export function constantScale(value = 1): ScaleExpr {
  return { kind: 'constant', value };
}

/**
 * Creates a charge-based scale: "× frenzyCharges".
 */
export function chargeScale(
  chargeKind: string,
  perCharge = 1,
  limit?: number,
): ScaleExpr {
  return { kind: 'charge', chargeKind, perCharge, limit };
}

/**
 * Creates a stat-based scale: "per 10 Strength, +5% each".
 */
export function statScale(
  statKey: StatKey,
  per: number,
  perValue = 1,
  limit?: number,
): ScaleExpr {
  return { kind: 'stat', statKey, per, perValue, limit };
}

/**
 * Creates a stack-based scale: "× poisonStacks".
 */
export function stackScale(
  source: string,
  perStack = 1,
  limit?: number,
): ScaleExpr {
  return { kind: 'stack', source, perStack, limit };
}
