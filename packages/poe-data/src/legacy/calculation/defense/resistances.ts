import type { ResolvedCharacterStats } from '../../stats/models/character-stats.model.js';

export interface EffectiveResistances {
  fire: number;
  cold: number;
  lightning: number;
  chaos: number;
  maxFire: number;
  maxCold: number;
  maxLightning: number;
  maxChaos: number;
}

const DEFAULT_MAX_RES = 75;

export function calculateEffectiveResistances(stats: ResolvedCharacterStats): EffectiveResistances {
  const d = stats.defense;
  return {
    fire: d.fireResistance,
    cold: d.coldResistance,
    lightning: d.lightningResistance,
    chaos: d.chaosResistance,
    maxFire: DEFAULT_MAX_RES + (d.maxFireResistance || 0),
    maxCold: DEFAULT_MAX_RES + (d.maxColdResistance || 0),
    maxLightning: DEFAULT_MAX_RES + (d.maxLightningResistance || 0),
    maxChaos: DEFAULT_MAX_RES + (d.maxFireResistance || 0),
  };
}

export function calculateSpellSuppression(stats: ResolvedCharacterStats): {
  chance: number;
  reduction: number;
} {
  const suppression = stats.defense.spellSuppression;
  const cappedChance = Math.min(Math.max(suppression, 0), 100);

  return {
    chance: cappedChance,
    reduction: cappedChance > 0 ? 50 : 0,
  };
}
