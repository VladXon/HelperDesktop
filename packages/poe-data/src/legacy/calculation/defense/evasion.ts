import type { ResolvedCharacterStats } from '../../stats/models/character-stats.model.js';
import type { CalculationContext } from '../../stats/context/calculation-context.js';

const BASE_ACCURACY = 538;
const ACCURACY_PER_LEVEL = 2;

export function calculateEvasionChance(stats: ResolvedCharacterStats, context?: CalculationContext): number {
  const evasion = stats.defense.evasion * (1 + stats.defense.evasionIncreased / 100);

  if (evasion <= 0) return 0;

  const enemyLevel = context?.enemy?.level ?? 83;
  const enemyAccuracy = BASE_ACCURACY + (enemyLevel - 1) * ACCURACY_PER_LEVEL;

  const chance = evasion / (evasion + enemyAccuracy * Math.pow(evasion, 0.8) * 0.25);
  return Math.round(Math.min(95, Math.max(5, chance * 100)) * 10) / 10;
}
