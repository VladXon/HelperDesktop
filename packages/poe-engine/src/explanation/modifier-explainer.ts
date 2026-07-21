import type { Modifier } from '../modifiers/modifier.js';
import type { ConditionState } from '../conditions/condition-expr.js';
import type { ModifierExplanation } from './explanation-types.js';
import { evaluateCondition } from '../conditions/evaluator.js';
import { evaluateScale } from '../conditions/evaluator.js';
import { stringifyCondition } from '../conditions/stringifier.js';
import { stringifyScale } from '../conditions/stringifier.js';

export function explainModifier(
  modifier: Modifier,
  conditionState: ConditionState,
): ModifierExplanation {
  if (!modifier.condition) {
    const effectiveValue = modifier.scale
      ? modifier.value * evaluateScale(modifier.scale, conditionState)
      : modifier.value;

    const scaleNote = modifier.scale
      ? `, scaled by ${stringifyScale(modifier.scale)}`
      : '';

    return {
      modifier,
      active: true,
      effectiveValue,
      reason: `"${modifier.meta.name}" is always active, provides ${modifier.type} ${modifier.value} to ${modifier.stat.displayName}${scaleNote}`,
    };
  }

  const conditionMet = evaluateCondition(modifier.condition, conditionState);
  const condStr = stringifyCondition(modifier.condition);

  if (!conditionMet) {
    return {
      modifier,
      active: false,
      effectiveValue: 0,
      reason: `"${modifier.meta.name}" is inactive because condition ${condStr} is not met`,
    };
  }

  const effectiveValue = modifier.scale
    ? modifier.value * evaluateScale(modifier.scale, conditionState)
    : modifier.value;

  const scaleNote = modifier.scale
    ? `, scaled by ${stringifyScale(modifier.scale)}`
    : '';

  return {
    modifier,
    active: true,
    effectiveValue,
    reason: `"${modifier.meta.name}" is active (condition ${condStr} met), provides ${modifier.type} ${modifier.value} to ${modifier.stat.displayName}${scaleNote}`,
  };
}

export function explainAllModifiers(
  modifiers: readonly Modifier[],
  conditionState: ConditionState,
): ModifierExplanation[] {
  return modifiers.map((m) => explainModifier(m, conditionState));
}
