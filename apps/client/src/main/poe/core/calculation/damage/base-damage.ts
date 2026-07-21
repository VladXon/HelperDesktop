import type { ResolvedSkillSnapshot } from '../snapshot.model.js';
import type { DamageResult } from './damage.types.js';

export function calculateBaseDamage(skill: ResolvedSkillSnapshot): DamageResult {
  return { total: 0, breakdown: {} };
}
