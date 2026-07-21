import type { ResolvedCharacterStats } from '../../stats/models/character-stats.model.js';

export function calculateArmourMitigation(
  stats: ResolvedCharacterStats,
  hitDamage: number,
): number {
  const armour = stats.defense.armour * (1 + stats.defense.armourIncreased / 100);

  if (armour <= 0 || hitDamage <= 0) return 0;

  return Math.round((armour / (armour + 5 * hitDamage)) * 1000) / 10;
}
