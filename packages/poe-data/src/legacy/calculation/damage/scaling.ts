import type { ResolvedCharacterStats } from '../../stats/models/character-stats.model.js';
import type { DamageBreakdown } from './damage.types.js';
import { createBreakdown } from './damage.types.js';

export function applyScaling(
  breakdown: DamageBreakdown,
  stats: ResolvedCharacterStats,
): DamageBreakdown {
  const components = breakdown.components.map((comp) => {
    let value = comp.value;

    const typeIncKey = `${comp.type}Damage`;
    const typeIncPct = stats.offense.increasedDamage[typeIncKey] ?? 0;

    const genericInc = stats.offense.increasedDamage['damage'] ?? 0;

    const genericEleInc = isElemental(comp.type)
      ? (stats.offense.increasedDamage['elementalDamage'] ?? 0)
      : 0;

    const totalIncreased = typeIncPct + genericInc + genericEleInc;
    if (totalIncreased !== 0) {
      value = value * (1 + totalIncreased / 100);
    }

    const typeMoreKey = `${comp.type}Damage`;
    const typeMoreMult = stats.offense.moreDamage[typeMoreKey];
    if (typeMoreMult && typeMoreMult !== 1) {
      value = value * typeMoreMult;
    }

    const genericMore = stats.offense.moreDamage['damage'];
    if (genericMore && genericMore !== 1) {
      value = value * genericMore;
    }

    return { ...comp, value };
  });

  const newTotal = components.reduce((s, c) => s + c.value, 0);
  return createBreakdown(components, {
    ...breakdown.contributions,
    scaled: newTotal,
  });
}

function isElemental(type: string): boolean {
  return type === 'fire' || type === 'cold' || type === 'lightning';
}
