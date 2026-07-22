import type { ResolvedCharacterStats } from '../../stats/models/character-stats.model.js';
import type { DamageBreakdown } from './damage.types.js';
import { createBreakdown } from './damage.types.js';

export interface PenetrationResult {
  breakdown: DamageBreakdown;
  penetrationByType: Record<string, number>;
}

export function applyPenetration(
  breakdown: DamageBreakdown,
  stats: ResolvedCharacterStats,
): PenetrationResult {
  const penetrationByType: Record<string, number> = {};
  const components = breakdown.components.map((comp) => {
    const pen = getPenetration(comp.type, stats);
    penetrationByType[comp.type] = pen;
    return comp;
  });

  return {
    breakdown: createBreakdown(components, {
      ...breakdown.contributions,
      penetrated: components.reduce((s, c) => s + c.value, 0),
    }),
    penetrationByType,
  };
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
