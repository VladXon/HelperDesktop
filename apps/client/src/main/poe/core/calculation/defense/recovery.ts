import type { ResolvedCharacterStats } from '../../stats/models/character-stats.model.js';

export function calculateRecovery(stats: ResolvedCharacterStats): {
  lifeRegen: number;
  lifeRegenPercent: number;
  lifeOnBlock: number;
} {
  return {
    lifeRegen: stats.defense.lifeRegen,
    lifeRegenPercent: 0,
    lifeOnBlock: 0,
  };
}
