import type { CharacterSnapshot } from '../snapshot.model.js';
import { calculateArmourMitigation } from './armour.js';
import { calculateEvasionChance } from './evasion.js';
import { calculateEffectiveResistances } from './resistances.js';
import { calculateBlockChance } from './block.js';
import { calculateRecovery } from './recovery.js';

export interface DefenseReport {
  life: number;
  energyShield: number;
  combinedPool: number;
  effectiveLife: number;
  physReduction: number;
  evadeChance: number;
  resistances: ReturnType<typeof calculateEffectiveResistances>;
  block: ReturnType<typeof calculateBlockChance>;
  recovery: ReturnType<typeof calculateRecovery>;
  spellSuppression: number;
}

export function calculateDefense(snapshot: CharacterSnapshot): DefenseReport {
  const stats = snapshot.stats;
  const resists = calculateEffectiveResistances(stats);
  const block = calculateBlockChance(stats);
  const recovery = calculateRecovery(stats);

  const life = stats.mechanics.overrides['life'] !== undefined
    ? stats.mechanics.overrides['life']!
    : stats.defense.life;
  const es = stats.defense.energyShield;
  const combinedPool = life + es;
  const physReduction = calculateArmourMitigation(stats, 1000);
  const evadeChance = calculateEvasionChance(stats);

  return {
    life,
    energyShield: es,
    combinedPool,
    effectiveLife: combinedPool / (1 - physReduction / 100),
    physReduction,
    evadeChance,
    resistances: resists,
    block,
    recovery,
    spellSuppression: stats.defense.spellSuppression,
  };
}
