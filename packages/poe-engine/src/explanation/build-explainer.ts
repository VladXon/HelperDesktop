import type { ExplanationContext } from './explanation-context.js';
import type {
  ExplanationResult,
  ConditionExplanation,
} from './explanation-types.js';
import { explainAllStats } from './stat-explainer.js';
import { explainAllModifiers } from './modifier-explainer.js';
import type { Modifier } from '../modifiers/modifier.js';
import type { ConditionState } from '../conditions/condition-expr.js';
import type { ConditionExpr } from '../conditions/condition-expr.js';
import { evaluateCondition } from '../conditions/evaluator.js';
import { stringifyCondition } from '../conditions/stringifier.js';

export function explainBuild(context: ExplanationContext): ExplanationResult {
  const stats = explainAllStats(
    context.modifiers,
    context.conditionState,
    context.stats,
  );

  const flatModifiers = context.layers.flatMap((layer) => [...layer.modifiers]);
  const modifiers = explainAllModifiers(flatModifiers, context.conditionState);

  const conditions = explainAllConditions(
    flatModifiers,
    context.conditionState,
  );

  const summary = buildSummary(
    context.stats.size,
    flatModifiers.length,
    modifiers.filter((m) => m.active).length,
    conditions.filter((c) => !c.active).length,
  );

  return { summary, stats, modifiers, conditions };
}

function explainAllConditions(
  modifiers: readonly Modifier[],
  conditionState: ConditionState,
): ConditionExplanation[] {
  const seen = new Map<string, ConditionExplanation>();

  for (const mod of modifiers) {
    if (!mod.condition) continue;

    const condStr = stringifyCondition(mod.condition);

    if (seen.has(condStr)) continue;

    const active = evaluateCondition(mod.condition, conditionState);

    seen.set(condStr, {
      condition: condStr,
      active,
      explanation: active
        ? `Condition ${condStr} is met - affected modifiers are active`
        : `Condition ${condStr} is NOT met - affected modifiers are disabled`,
    });
  }

  return [...seen.values()];
}

function buildSummary(
  statCount: number,
  totalMods: number,
  activeMods: number,
  inactiveMods: number,
): string {
  const parts: string[] = [];

  parts.push(`Your build has ${statCount} computed stats from ${totalMods} modifiers`);

  if (activeMods === totalMods) {
    parts.push(`(all ${activeMods} modifiers are active)`);
  } else {
    parts.push(
      `(${activeMods} active, ${inactiveMods} inactive due to unmet conditions)`,
    );
  }

  return parts.join(' ');
}
