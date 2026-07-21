import type { StatValue } from '../models/stat.model.js';

export interface KeystoneApplication {
  overrides: Record<string, number>;
  flags: string[];
}

const KEYSTONE_LOGIC: Record<string, KeystoneApplication> = {
  'Chaos Inoculation': {
    overrides: { life: 1 },
    flags: ['chaos_immunity'],
  },
  'Mind Over Matter': {
    overrides: {},
    flags: ['mana_damage_absorption', 'damage_taken_from_mana'],
  },
  'Eldritch Battery': {
    overrides: {},
    flags: ['es_protects_mana'],
  },
  'Resolute Technique': {
    overrides: {},
    flags: ['cannot_crit', 'always_hit'],
  },
  'Iron Reflexes': {
    overrides: {},
    flags: ['evasion_converted_to_armour'],
  },
  'Acrobatics': {
    overrides: {},
    flags: ['can_evade_spells'],
  },
  'Elemental Overload': {
    overrides: {},
    flags: ['no_crit_multi', 'more_elemental_if_crit'],
  },
};

export function applyKeystoneEffects(rawModifiers: StatValue[]): {
  overrides: Record<string, number>;
  flags: string[];
} {
  const overrides: Record<string, number> = {};
  const flags: string[] = [];

  for (const mod of rawModifiers) {
    if (mod.source === 'keystone') {
      const logic = KEYSTONE_LOGIC[mod.name];
      if (logic) {
        Object.assign(overrides, logic.overrides);
        flags.push(...logic.flags);
      }
    }
  }

  return { overrides, flags };
}
