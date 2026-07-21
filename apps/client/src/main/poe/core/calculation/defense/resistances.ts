import type { ResolvedCharacterStats } from '../../stats/models/character-stats.model.js';

export function calculateEffectiveResistances(stats: ResolvedCharacterStats): {
  fire: number; cold: number; lightning: number; chaos: number;
  maxFire: number; maxCold: number; maxLightning: number;
} {
  return {
    fire: stats.defense.fireResistance,
    cold: stats.defense.coldResistance,
    lightning: stats.defense.lightningResistance,
    chaos: stats.defense.chaosResistance,
    maxFire: 75 + (stats.defense.maxFireResistance || 0),
    maxCold: 75 + (stats.defense.maxColdResistance || 0),
    maxLightning: 75 + (stats.defense.maxLightningResistance || 0),
  };
}
