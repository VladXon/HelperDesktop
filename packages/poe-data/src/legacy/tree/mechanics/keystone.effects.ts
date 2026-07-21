import type { KeystoneEffect } from '../models/passive-tree.model.js';

export const KEYSTONES: Record<string, KeystoneEffect> = {
  'Chaos Inoculation': {
    name: 'Chaos Inoculation',
    effects: ['life_set_to_one', 'immune_chaos'],
    tags: ['defense'],
  },
  'Mind Over Matter': {
    name: 'Mind Over Matter',
    effects: ['mana_absorbs_damage', 'damage_taken_from_mana_before_life'],
    tags: ['defense', 'mana'],
  },
  'Eldritch Battery': {
    name: 'Eldritch Battery',
    effects: ['energy_shield_protects_mana', 'energy_shield_starts_at_zero'],
    tags: ['defense', 'energyShield', 'mana'],
  },
  'Resolute Technique': {
    name: 'Resolute Technique',
    effects: ['cannot_crit', 'always_hit'],
    tags: ['offense'],
  },
  'Iron Reflexes': {
    name: 'Iron Reflexes',
    effects: ['evasion_converted_to_armour'],
    tags: ['defense', 'armour'],
  },
  'Unwavering Stance': {
    name: 'Unwavering Stance',
    effects: ['cannot_evade', 'immune_stun'],
    tags: ['defense'],
  },
  'Blood Magic': {
    name: 'Blood Magic',
    effects: ['skills_cost_life_instead_of_mana', 'remove_mana'],
    tags: ['defense', 'mana'],
  },
  'Pain Attunement': {
    name: 'Pain Attunement',
    effects: ['more_spell_damage_on_low_life'],
    tags: ['offense', 'spell'],
  },
  'Ghost Reaver': {
    name: 'Ghost Reaver',
    effects: ['leech_applies_to_energy_shield_instead_of_life'],
    tags: ['defense', 'energyShield'],
  },
  'Zealots Oath': {
    name: 'Zealot\'s Oath',
    effects: ['life_regen_applies_to_energy_shield'],
    tags: ['defense', 'energyShield'],
  },
  'Divine Shield': {
    name: 'Divine Shield',
    effects: ['armour_applies_to_es_recharge_speed'],
    tags: ['defense', 'energyShield', 'armour'],
  },
  'Acrobatics': {
    name: 'Acrobatics',
    effects: ['can_evade_spell_hits'],
    tags: ['defense', 'evasion'],
  },
  'Elemental Equilibrium': {
    name: 'Elemental Equilibrium',
    effects: ['hit_with_element_exposes_enemy_to_other_elements'],
    tags: ['offense', 'elemental'],
  },
  'Elemental Overload': {
    name: 'Elemental Overload',
    effects: ['more_elemental_damage_on_crit', 'no_crit_multi'],
    tags: ['offense', 'elemental', 'critical'],
  },
};
