import type { Modifier } from './modifier.js';
import type { ConditionState } from '../conditions/condition-expr.js';
import { evaluateCondition } from '../conditions/evaluator.js';
import { evaluateScale } from '../conditions/evaluator.js';

export interface ResolvedModifier {
  readonly modifier: Modifier;
  readonly effectiveValue: number;
}

export function resolveModifiers(
  modifiers: readonly Modifier[],
  state: ConditionState,
): ResolvedModifier[] {
  const resolved: ResolvedModifier[] = [];

  for (const mod of modifiers) {
    if (mod.condition && !evaluateCondition(mod.condition, state)) {
      continue;
    }

    const scale = mod.scale ? evaluateScale(mod.scale, state) : 1;
    const effectiveValue = mod.value * scale;

    if (effectiveValue === 0) continue;

    resolved.push({ modifier: mod, effectiveValue });
  }

  return resolved;
}
