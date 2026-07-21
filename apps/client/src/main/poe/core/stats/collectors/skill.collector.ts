import type { StatValue } from '../models/stat.model.js';
import type { SkillSetup } from '../../skills/models/skill.model.js';
import { calculateSupportMultiplier } from '../../skills/resolvers/support-gem.resolver.js';

export function collectSkillStats(setups: SkillSetup[]): StatValue[] {
  const result: StatValue[] = [];
  const src: StatValue['source'] = 'skill';

  for (const setup of setups) {
    if (!setup.activeSkill) continue;

    const { more, increased } = calculateSupportMultiplier(setup.supports);

    if (more > 0) {
      result.push({ name: 'moreDamage', value: more, source: src, type: 'more' });
    }
    if (increased > 0) {
      result.push({ name: 'increasedDamage', value: increased, source: src, type: 'increased' });
    }

    for (const rule of setup.activeSkill.conversion) {
      result.push({
        name: `${rule.from}_to_${rule.to}`,
        value: rule.percent,
        source: src,
        type: 'conversion',
      });
    }
  }

  return result;
}
