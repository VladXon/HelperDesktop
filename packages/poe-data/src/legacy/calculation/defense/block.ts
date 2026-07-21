import type { ResolvedCharacterStats } from '../../stats/models/character-stats.model.js';

export function calculateBlockChance(stats: ResolvedCharacterStats): {
  attackBlock: number;
  spellBlock: number;
} {
  return {
    attackBlock: Math.min(stats.defense.attackBlock, 75),
    spellBlock: Math.min(stats.defense.spellBlock, 75),
  };
}
