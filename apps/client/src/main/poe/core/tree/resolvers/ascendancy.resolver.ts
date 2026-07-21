import type { AscendancyNode } from '../models/passive-tree.model.js';

const ASCENDANCY_EFFECTS: Record<string, Record<string, string[]>> = {
  Elementalist: {
    'Shaper of Flames': ['all_damage_can_ignite', 'ignite_proliferation'],
    'Shaper of Storms': ['all_damage_can_shock', 'increased_shock_effect'],
    'Heart of Destruction': ['increased_aoe', 'more_elemental_damage'],
    'Mastermind of Discord': ['reduced_herald_reservation', 'increased_herald_damage'],
  },
  Berserker: {
    'Aspect of Carnage': ['more_damage', 'increased_damage_taken'],
    'Flawless Savagery': ['increased_crit_chance', 'increased_attack_speed'],
    'War Bringer': ['warcry_power', 'life_recovery_from_warcry'],
  },
};

export function resolveAscendancy(
  nodeName: string,
  ascendancyClassName: string,
): AscendancyNode | null {
  const classEffects = ASCENDANCY_EFFECTS[ascendancyClassName];
  if (!classEffects) {
    return { name: nodeName, effects: [] };
  }

  const effects = classEffects[nodeName];
  if (!effects) {
    return { name: nodeName, effects: [] };
  }

  return { name: nodeName, effects };
}

export function resolveAllAscendancy(
  nodeNames: string[],
  ascendancyClassName: string,
): AscendancyNode[] {
  return nodeNames
    .map((name) => resolveAscendancy(name, ascendancyClassName))
    .filter((node): node is AscendancyNode => node !== null);
}

export function getAscendancyEffects(ascendancyClassName: string): string[] {
  const classEffects = ASCENDANCY_EFFECTS[ascendancyClassName];
  if (!classEffects) return [];
  return Object.values(classEffects).flat();
}
