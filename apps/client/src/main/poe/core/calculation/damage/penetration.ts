import type { ResolvedCharacterStats } from '../../stats/models/character-stats.model.js';
import type { DamageResult } from './damage.types.js';

export function applyPenetration(
  result: DamageResult,
  stats: ResolvedCharacterStats,
): DamageResult {
  return { total: 0, breakdown: {} };
}
