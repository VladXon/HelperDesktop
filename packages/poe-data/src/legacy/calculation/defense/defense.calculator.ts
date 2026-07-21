import type { CharacterSnapshot } from '../snapshot.model.js';
import { calculateArmourMitigation } from './armour.js';
import { calculateEvasionChance } from './evasion.js';
import { calculateEffectiveResistances, calculateSpellSuppression } from './resistances.js';
import { calculateBlockChance } from './block.js';
import { calculateRecovery } from './recovery.js';

export interface DefenseReport {
  life: number;
  energyShield: number;
  combinedPool: number;
  effectiveLife: number;
  physReduction: number;
  physReductionLarge: number;
  evadeChance: number;
  resistances: ReturnType<typeof calculateEffectiveResistances>;
  block: ReturnType<typeof calculateBlockChance>;
  recovery: ReturnType<typeof calculateRecovery>;
  spellSuppression: ReturnType<typeof calculateSpellSuppression>;
}

export function calculateDefense(snapshot: CharacterSnapshot, incomingHitSize = 4000): DefenseReport {
  const stats = snapshot.stats;
  const resists = calculateEffectiveResistances(stats);
  const block = calculateBlockChance(stats);
  const recovery = calculateRecovery(stats);
  const suppression = calculateSpellSuppression(stats);

  const life = stats.mechanics.overrides['life'] !== undefined
    ? stats.mechanics.overrides['life']!
    : stats.defense.life;
  const es = stats.defense.energyShield;
  const combinedPool = life + es;

  const physReduction = calculateArmourMitigation(stats, incomingHitSize);
  const physReductionSmall = calculateArmourMitigation(stats, 500);
  const evadeChance = calculateEvasionChance(stats, snapshot.context);

  const effectiveLife = combinedPool / Math.max(0.01, (1 - physReduction / 100));

  return {
    life,
    energyShield: es,
    combinedPool,
    effectiveLife: Math.round(effectiveLife),
    physReduction: Math.round(physReduction * 10) / 10,
    physReductionLarge: Math.round(calculateArmourMitigation(stats, 15000) * 10) / 10,
    evadeChance,
    resistances: resists,
    block,
    recovery,
    spellSuppression: suppression,
  };
}
