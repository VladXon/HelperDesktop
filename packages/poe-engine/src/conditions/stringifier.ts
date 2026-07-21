import type { ConditionExpr } from './condition-expr.js';
import type { ConditionLeaf } from './condition-leaf.js';
import type { ScaleExpr } from './scale-expr.js';

/**
 * Converts a ConditionExpr to a human-readable string.
 *
 * Used for AI explanations and debug output.
 */
export function stringifyCondition(expr: ConditionExpr): string {
  switch (expr.kind) {
    case 'always':
      return '(always)';

    case 'never':
      return '(never)';

    case 'AND':
      if (expr.children.length === 0) return '(always)';
      return `(AND ${expr.children.map(stringifyCondition).join(' ')})`;

    case 'OR':
      if (expr.children.length === 0) return '(never)';
      return `(OR ${expr.children.map(stringifyCondition).join(' ')})`;

    case 'NOT':
      return `(NOT ${stringifyCondition(expr.child)})`;

    default:
      return stringifyLeaf(expr);
  }
}

function stringifyLeaf(leaf: ConditionLeaf): string {
  switch (leaf.kind) {
    case 'state':
      return `player.${leaf.var}`;

    case 'charge': {
      let s = `charges.${leaf.chargeKind}`;
      if (leaf.min !== undefined) s += ` >= ${leaf.min}`;
      if (leaf.max !== undefined) s += ` <= ${leaf.max}`;
      return s;
    }

    case 'skillTag':
      return leaf.negate
        ? `skill.NOT.${leaf.tag}`
        : `skill.${leaf.tag}`;

    case 'actor':
      return leaf.negate
        ? `${leaf.actor}.NOT.${leaf.var}`
        : `${leaf.actor}.${leaf.var}`;

    case 'statThreshold': {
      const op = operatorSymbol(leaf.operator);
      return `${leaf.statKey.id} ${op} ${leaf.value}`;
    }

    case 'slot':
      return leaf.negate
        ? `NOT.slot:${leaf.slotName}`
        : `slot:${leaf.slotName}`;

    case 'socketedIn':
      return leaf.negate
        ? `NOT.socketedIn:${leaf.slotName}`
        : `socketedIn:${leaf.slotName}`;

    case 'globalEffect':
      return leaf.negate
        ? `NOT.globalEffect:${leaf.effectType}`
        : `globalEffect:${leaf.effectType}`;

    case 'recently':
      return `recently.${leaf.event}(${leaf.window ?? 4000}ms)`;

    case 'timer':
      return `timer:${leaf.interval}ms.${leaf.phase}`;

    case 'duringAction':
      return `during.${leaf.action}`;

    case 'stack': {
      let s = `stacks.${leaf.source}`;
      if (leaf.min !== undefined) s += ` >= ${leaf.min}`;
      if (leaf.max !== undefined) s += ` <= ${leaf.max}`;
      return s;
    }
  }
}

function operatorSymbol(
  op: 'greaterThan' | 'lessThan' | 'equals' | 'greaterOrEqual' | 'lessOrEqual',
): string {
  switch (op) {
    case 'greaterThan': return '>';
    case 'lessThan': return '<';
    case 'equals': return '==';
    case 'greaterOrEqual': return '>=';
    case 'lessOrEqual': return '<=';
  }
}

/**
 * Converts a ScaleExpr to a human-readable string.
 */
export function stringifyScale(scale: ScaleExpr): string {
  switch (scale.kind) {
    case 'constant':
      return `×${scale.value}`;

    case 'charge':
      return `×${scale.perCharge}/charge.${scale.chargeKind}${
        scale.limit ? ` (max ${scale.limit})` : ''
      }`;

    case 'stat':
      return `×${scale.perValue}/per${scale.per}.${scale.statKey.id}${
        scale.limit ? ` (max ${scale.limit})` : ''
      }`;

    case 'stack':
      return `×${scale.perStack}/stack.${scale.source}${
        scale.limit ? ` (max ${scale.limit})` : ''
      }`;

    case 'distance':
      return `×(distance [${scale.min}-${scale.max}] ×${scale.perUnit}/unit)`;

    case 'event':
      return `×${scale.perEvent}/event.${scale.event}(${scale.window}ms)${
        scale.limit ? ` (max ${scale.limit})` : ''
      }`;
  }
}
