import type { ResolvedCharacterStats } from '../../stats/models/character-stats.model.js';

export function calculateRecovery(stats: ResolvedCharacterStats): {
  lifeRegen: number;
  lifeRegenPercent: number;
  lifeOnBlock: number;
  esRechargeRate: number;
} {
  const maxLife = stats.defense.life;
  const lifeRegenPercent = maxLife > 0
    ? Math.round((stats.defense.lifeRegen / maxLife) * 1000) / 10
    : 0;

  return {
    lifeRegen: stats.defense.lifeRegen,
    lifeRegenPercent,
    lifeOnBlock: stats.defense.life,
    esRechargeRate: stats.defense.energyShield * 0.25,
  };
}
