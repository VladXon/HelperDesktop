import type { MasteryEffect } from '../models/passive-tree.model.js';

export const MASTERY_EFFECTS: Record<string, MasteryEffect[]> = {
  'Life Mastery': [
    { key: '+50 life', stat: 'life', value: 50, type: 'flat' },
    { key: '10% increased life', stat: 'life', value: 10, type: 'increased' },
    { key: '15% life recoup', stat: 'lifeRecoup', value: 15, type: 'increased' },
  ],
  'Mana Mastery': [
    { key: '+30 mana', stat: 'mana', value: 30, type: 'flat' },
    { key: '10% reduced mana cost', stat: 'manaCost', value: -10, type: 'increased' },
  ],
  'Elemental Mastery': [
    { key: '+15% all elemental resistances', stat: 'allElementalResistance', value: 15, type: 'flat' },
    { key: '20% increased elemental damage', stat: 'elementalDamage', value: 20, type: 'increased' },
  ],
  'Fire Mastery': [
    { key: '20% increased fire damage', stat: 'fireDamage', value: 20, type: 'increased' },
  ],
  'Cold Mastery': [
    { key: '20% increased cold damage', stat: 'coldDamage', value: 20, type: 'increased' },
  ],
  'Lightning Mastery': [
    { key: '20% increased lightning damage', stat: 'lightningDamage', value: 20, type: 'increased' },
  ],
  'Chaos Mastery': [
    { key: '20% increased chaos damage', stat: 'chaosDamage', value: 20, type: 'increased' },
  ],
  'Physical Mastery': [
    { key: '20% increased physical damage', stat: 'physicalDamage', value: 20, type: 'increased' },
  ],
  'Damage Over Time Mastery': [
    { key: '15% increased DoT', stat: 'damageOverTime', value: 15, type: 'increased' },
  ],
  'Reservation Mastery': [
    { key: '15% increased mana reservation efficiency', stat: 'manaReservationEfficiency', value: 15, type: 'increased' },
  ],
  'Armour Mastery': [
    { key: '20% increased armour', stat: 'armour', value: 20, type: 'increased' },
  ],
  'Evasion Mastery': [
    { key: '20% increased evasion', stat: 'evasion', value: 20, type: 'increased' },
  ],
  'Energy Shield Mastery': [
    { key: '20% increased energy shield', stat: 'energyShield', value: 20, type: 'increased' },
  ],
  'Block Mastery': [
    { key: '+3% attack block', stat: 'attackBlock', value: 3, type: 'flat' },
  ],
  'Attack Mastery': [
    { key: '+20% increased attack damage', stat: 'attackDamage', value: 20, type: 'increased' },
  ],
  'Spell Mastery': [
    { key: '+20% increased spell damage', stat: 'spellDamage', value: 20, type: 'increased' },
  ],
  'Critical Mastery': [
    { key: '+25% crit mult', stat: 'criticalMultiplier', value: 25, type: 'increased' },
  ],
};
