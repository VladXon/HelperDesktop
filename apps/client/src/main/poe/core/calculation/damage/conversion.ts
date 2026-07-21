import type { ResolvedSkillSnapshot } from '../snapshot.model.js';
import type { DamageResult } from './damage.types.js';

export function applyConversion(
  baseResult: DamageResult,
  skill: ResolvedSkillSnapshot,
): DamageResult {
  return { total: 0, breakdown: {} };
}
