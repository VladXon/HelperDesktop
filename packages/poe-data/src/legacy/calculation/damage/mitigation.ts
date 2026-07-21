import type { CalculationContext } from '../../stats/context/calculation-context.js';
import type { DamageBreakdown } from './damage.types.js';
import { createBreakdown } from './damage.types.js';

export function applyMitigation(
  breakdown: DamageBreakdown,
  context: CalculationContext,
): DamageBreakdown {
  const enemy = context.enemy;
  const isBoss = enemy.isBoss || enemy.isGuardian || enemy.isUber;

  const components = breakdown.components.map((comp) => {
    let res = 0;
    switch (comp.type) {
      case 'fire': res = enemy.fireResistance; break;
      case 'cold': res = enemy.coldResistance; break;
      case 'lightning': res = enemy.lightningResistance; break;
      case 'chaos': res = enemy.chaosResistance; break;
      case 'physical': return comp;
    }

    if (isBoss && res < 30) res = 30;
    if (enemy.isUber && res < 50) res = 50;

    let mitigated = comp.value * (1 - res / 100);
    if (mitigated < 0) mitigated = 0;

    return { ...comp, value: mitigated };
  });

  return createBreakdown(components, {
    ...breakdown.contributions,
    mitigated: components.reduce((s, c) => s + c.value, 0),
  });
}
