import type { StatValue } from '../models/stat.model.js';
import type { SkillSetup } from '../../skills/models/skill.model.js';
import { calculateSupportMultiplier } from '../../skills/resolvers/support-gem.resolver.js';

export function collectSkillStats(setups: SkillSetup[]): StatValue[] {
  const result: StatValue[] = [];

  for (const setup of setups) {
    if (!setup.activeSkill) continue;

    const skillName = setup.activeSkill.name;
    const { more, increased } = calculateSupportMultiplier(setup.supports);

    if (more > 0) {
      result.push({
        name: 'moreDamage',
        value: more,
        source: 'skill',
        type: 'more',
        scope: 'skill',
        modifierName: `${skillName} supports`,
      });
    }
    if (increased > 0) {
      result.push({
        name: 'increasedDamage',
        value: increased,
        source: 'skill',
        type: 'increased',
        scope: 'skill',
        modifierName: `${skillName} supports`,
      });
    }

    for (const rule of setup.activeSkill.conversion) {
      result.push({
        name: `${rule.from}_to_${rule.to}`,
        value: rule.percent,
        source: 'skill',
        type: 'conversion',
        scope: 'skill',
        modifierName: `${skillName}: ${rule.kind}`,
      });
    }
  }

  return result;
}
