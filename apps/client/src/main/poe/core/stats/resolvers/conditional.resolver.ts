import type { StatValue } from '../models/stat.model.js';

export type ConditionType = 'always' | 'requiresCharge' | 'requiresLowLife' | 'requiresFullLife' | 'requiresEnemy' | 'requiresLeeching';

export interface ConditionalModifier {
  stat: StatValue;
  condition: ConditionType;
}

export function resolveConditionalModifiers(
  modifiers: ConditionalModifier[],
  config: { hasCharges: boolean; isLowLife: boolean; isFullLife: boolean; isLeeching: boolean; isBoss: boolean },
): StatValue[] {
  return modifiers
    .filter((cm) => isConditionActive(cm.condition, config))
    .map((cm) => cm.stat);
}

function isConditionActive(
  condition: ConditionType,
  config: { hasCharges: boolean; isLowLife: boolean; isFullLife: boolean; isLeeching: boolean; isBoss: boolean },
): boolean {
  switch (condition) {
    case 'always': return true;
    case 'requiresCharge': return config.hasCharges;
    case 'requiresLowLife': return config.isLowLife;
    case 'requiresFullLife': return config.isFullLife;
    case 'requiresLeeching': return config.isLeeching;
    case 'requiresEnemy': return config.isBoss;
    default: return false;
  }
}
