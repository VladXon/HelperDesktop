import type { ResolvedCharacterStats } from '../../stats/models/character-stats.model.js';
import type { DamageResult } from './damage.types.js';

export function calculateAddedDamage(
  stats: ResolvedCharacterStats,
  baseResult: DamageResult,
): DamageResult {
  return { total: 0, breakdown: {} };
}
