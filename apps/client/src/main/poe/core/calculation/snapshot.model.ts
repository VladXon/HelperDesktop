import type { ResolvedCharacterStats } from '../stats/models/character-stats.model.js';
import type { CalculationContext } from '../stats/context/calculation-context.js';
import type { SkillSetup } from '../skills/models/skill.model.js';
import type { StatValue } from '../stats/models/stat.model.js';

export interface ResolvedSkillSnapshot {
  name: string;
  tags: string[];
  baseDamage: { type: string; min: number; max: number }[];
  effectiveness: number;
  attackTime: number | null;
  castTime: number | null;
  conversion: { from: string; to: string; percent: number }[];
  supportMultiplier: { more: number; increased: number };
}

export interface CharacterSnapshot {
  stats: ResolvedCharacterStats;
  resolvedSkills: ResolvedSkillSnapshot[];
  activeModifiers: StatValue[];
  context: CalculationContext;
}

export function createCharacterSnapshot(
  stats: ResolvedCharacterStats,
  skills: SkillSetup[],
  context: CalculationContext,
): CharacterSnapshot {
  return {
    stats,
    resolvedSkills: resolveSkills(skills),
    activeModifiers: stats.rawModifiers,
    context,
  };
}

function resolveSkills(skills: SkillSetup[]): ResolvedSkillSnapshot[] {
  return skills
    .filter((s) => s.activeSkill !== null && s.enabled)
    .map((setup) => {
      const gem = setup.activeSkill!;
      let moreTotal = 1.0;
      let increasedTotal = 0;
      for (const sup of setup.supports) {
        if (sup.moreMultiplier > 0) moreTotal *= 1 + sup.moreMultiplier / 100;
        if (sup.increasedMultiplier > 0) increasedTotal += sup.increasedMultiplier;
      }
      return {
        name: gem.name,
        tags: [...gem.tags],
        baseDamage: gem.baseDamage.map((d: { type: string; min: number; max: number }) => ({ type: d.type, min: d.min, max: d.max })),
        effectiveness: gem.effectiveness,
        attackTime: gem.attackTime,
        castTime: gem.castTime,
        conversion: gem.conversion.map((c: { from: string; to: string; percent: number }) => ({ from: c.from, to: c.to, percent: c.percent })),
        supportMultiplier: {
          more: Math.round((moreTotal - 1) * 1000) / 10,
          increased: Math.round(increasedTotal * 10) / 10,
        },
      };
    });
}
