import type { ResolvedCharacterStats } from '../../stats/models/character-stats.model.js';
import type { DamageBreakdown } from './damage.types.js';
import { createBreakdown } from './damage.types.js';

export function applyPenetration(
  breakdown: DamageBreakdown,
  stats: ResolvedCharacterStats,
): DamageBreakdown {
  const components = breakdown.components.map((comp) => {
    const pen = getPenetration(comp.type, stats);
    if (pen === 0) return comp;

    const resistanceToZero = Math.min(comp.value * (Math.abs(pen) / 100), comp.value);
    const effectiveness = comp.value + (pen > 0 ? resistanceToZero : -resistanceToZero);

    return { ...comp, value: Math.max(0, effectiveness) };
  });

  return createBreakdown(components, {
    ...breakdown.contributions,
    penetrated: components.reduce((s, c) => s + c.value, 0),
  });
}

function getPenetration(type: string, stats: ResolvedCharacterStats): number {
  let pen = 0;
  switch (type) {
    case 'fire':
      pen = stats.offense.firePenetration;
      break;
    case 'cold':
      pen = stats.offense.coldPenetration;
      break;
    case 'lightning':
      pen = stats.offense.lightningPenetration;
      break;
    case 'chaos':
      pen = 0;
      break;
    default:
      return 0;
  }
  pen += stats.offense.elementalPenetration;
  return pen;
}
