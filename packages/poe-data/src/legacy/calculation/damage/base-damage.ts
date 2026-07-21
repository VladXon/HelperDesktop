import type { ResolvedSkillSnapshot } from '../snapshot.model.js';
import type { DamageComponent, DamageBreakdown } from './damage.types.js';
import { computeTotal, computeByType, createBreakdown } from './damage.types.js';

export function calculateBaseDamage(skill: ResolvedSkillSnapshot): DamageBreakdown {
  const components: DamageComponent[] = [];

  for (const bd of skill.baseDamage) {
    const avgBase = (bd.min + bd.max) / 2;
    const effectiveAvg = avgBase * skill.effectiveness;
    if (effectiveAvg <= 0) continue;

    components.push({
      type: bd.type as DamageComponent['type'],
      value: effectiveAvg,
      baseValue: avgBase,
      originType: bd.type as DamageComponent['type'],
      tags: [...skill.tags],
      source: 'skill',
    });
  }

  return createBreakdown(components);
}
