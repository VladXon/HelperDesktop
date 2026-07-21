import type { ResolvedCharacterStats } from '../../stats/models/character-stats.model.js';
import type { DamageBreakdown } from './damage.types.js';
import { createBreakdown } from './damage.types.js';

export function applyCritical(
  breakdown: DamageBreakdown,
  stats: ResolvedCharacterStats,
): DamageBreakdown {
  const critChance = clamp(stats.offense.criticalChance, 0, 100) / 100;
  const critMulti = 1.5 + (stats.offense.criticalMultiplier > 0
    ? stats.offense.criticalMultiplier / 100
    : 0);

  const critFactor = 1 + critChance * (critMulti - 1);

  const components = breakdown.components.map((comp) => ({
    ...comp,
    value: comp.value * critFactor,
  }));

  return createBreakdown(components, {
    ...breakdown.contributions,
    critMultiplier: Math.round(critMulti * 100) / 100,
    critChance: Math.round(critChance * 100),
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
