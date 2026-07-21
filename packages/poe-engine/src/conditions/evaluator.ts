import type { ConditionExpr, ConditionState } from './condition-expr.js';
import type { ConditionLeaf } from './condition-leaf.js';
import type { ScaleExpr } from './scale-expr.js';
import type { ModifierEffectiveness, ResolvedEffectiveness } from './effectiveness.js';

/**
 * Evaluate a ConditionExpr against a given runtime state.
 *
 * Pure function — no side effects, no state mutation.
 */
export function evaluateCondition(
  expr: ConditionExpr,
  state: ConditionState,
): boolean {
  switch (expr.kind) {
    case 'always':
      return true;

    case 'never':
      return false;

    case 'AND':
      return expr.children.every((child) => evaluateCondition(child, state));

    case 'OR':
      return expr.children.some((child) => evaluateCondition(child, state));

    case 'NOT':
      return !evaluateCondition(expr.child, state);

    default:
      return evaluateLeaf(expr, state);
  }
}

/**
 * Evaluate a single leaf condition.
 */
function evaluateLeaf(leaf: ConditionLeaf, state: ConditionState): boolean {
  switch (leaf.kind) {
    case 'state':
      return Boolean(state.playerStates.get(leaf.var));

    case 'charge': {
      const count = state.charges.get(leaf.chargeKind) ?? 0;
      const minOk = leaf.min === undefined || count >= leaf.min;
      const maxOk = leaf.max === undefined || count <= leaf.max;
      return minOk && maxOk;
    }

    case 'skillTag': {
      const hasTag = state.skillTags.includes(leaf.tag);
      return leaf.negate ? !hasTag : hasTag;
    }

    case 'actor': {
      const actorState = state.enemyStates;
      const hasCond = Boolean(actorState.get(leaf.var));
      return leaf.negate ? !hasCond : hasCond;
    }

    case 'statThreshold': {
      const statValue = state.statValues.get(leaf.statKey.id) ?? 0;
      switch (leaf.operator) {
        case 'greaterThan':
          return statValue > leaf.value;
        case 'lessThan':
          return statValue < leaf.value;
        case 'equals':
          return statValue === leaf.value;
        case 'greaterOrEqual':
          return statValue >= leaf.value;
        case 'lessOrEqual':
          return statValue <= leaf.value;
      }
    }

    case 'slot':
      return leaf.negate
        ? state.currentSlot !== leaf.slotName
        : state.currentSlot === leaf.slotName;

    case 'socketedIn':
      return leaf.negate
        ? state.currentSocketedIn !== leaf.slotName
        : state.currentSocketedIn === leaf.slotName;

    case 'globalEffect':
      throw new Error(
        'GlobalEffect condition must be resolved into a StateCondition or ActorCondition before evaluation',
      );

    case 'recently': {
      const timestamp = state.recentEvents.get(leaf.event);
      if (timestamp === undefined) return false;
      const window = leaf.window ?? 4000;
      return state.now - timestamp <= window;
    }

    case 'timer': {
      const phase = state.timerPhases.get(`timer:${leaf.interval}`);
      return phase === leaf.phase;
    }

    case 'duringAction':
      return state.playerStates.get(`action:${leaf.action}`) === true;

    case 'stack': {
      const count = state.stacks.get(leaf.source) ?? 0;
      const minOk = leaf.min === undefined || count >= leaf.min;
      const maxOk = leaf.max === undefined || count <= leaf.max;
      return minOk && maxOk;
    }
  }
}

/**
 * Evaluate a ScaleExpr to a numeric multiplier.
 *
 * Pure function.
 */
export function evaluateScale(scale: ScaleExpr, state: ConditionState): number {
  switch (scale.kind) {
    case 'constant':
      return scale.value;

    case 'charge': {
      const count = state.charges.get(scale.chargeKind) ?? 0;
      const effectiveCount = scale.limit !== undefined
        ? Math.min(count, scale.limit)
        : count;
      return effectiveCount * scale.perCharge;
    }

    case 'stat': {
      const statValue = state.statValues.get(scale.statKey.id) ?? 0;
      const ratio = Math.floor(statValue / scale.per);
      const effectiveRatio = scale.limit !== undefined
        ? Math.min(ratio, scale.limit)
        : ratio;
      return effectiveRatio * scale.perValue;
    }

    case 'stack': {
      const count = state.stacks.get(scale.source) ?? 0;
      const effectiveCount = scale.limit !== undefined
        ? Math.min(count, scale.limit)
        : count;
      return effectiveCount * scale.perStack;
    }

    case 'distance':
      throw new Error(
        'DistanceScale requires distance value in context — ' +
          'use evaluateDistanceScale(scale, distance)',
      );

    case 'event':
      throw new Error(
        'EventScale requires event count in context — ' +
          'use evaluateEventScale(scale, eventCount)',
      );
  }
}

export function evaluateDistanceScale(
  scale: Extract<ScaleExpr, { kind: 'distance' }>,
  distance: number,
): number {
  const clamped = Math.max(scale.min, Math.min(scale.max, distance));
  return (clamped - scale.min) * scale.perUnit;
}

export function evaluateEventScale(
  scale: Extract<ScaleExpr, { kind: 'event' }>,
  eventCount: number,
): number {
  const effectiveCount = scale.limit !== undefined
    ? Math.min(eventCount, scale.limit)
    : eventCount;
  return effectiveCount * scale.perEvent;
}

/**
 * Evaluate a full ModifierEffectiveness.
 */
export function evaluateEffectiveness(
  eff: ModifierEffectiveness,
  state: ConditionState,
): ResolvedEffectiveness {
  const active = eff.gate ? evaluateCondition(eff.gate, state) : true;

  if (!active) {
    return { active: false, scale: 0 };
  }

  const scale = eff.scale ? evaluateScale(eff.scale, state) : 1;

  return { active: true, scale };
}
