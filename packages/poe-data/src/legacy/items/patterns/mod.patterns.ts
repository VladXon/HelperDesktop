import type { ModifierStat } from '../modifier.model.js';

export interface ModPattern {
  pattern: RegExp;
  parser: (match: RegExpMatchArray) => ModifierStat[];
  tags: string[];
  priority: number;
}

export const MOD_PATTERNS: ModPattern[] = [

  // ---- Life ----
  {
    pattern: /^\+(\d+(?:\.\d+)?)\s+to\s+maximum\s+life$/i,
    parser: (m) => [{ stat: 'life', value: Number(m[1]), type: 'flat' }],
    tags: ['life', 'maximum'],
    priority: 100,
  },
  {
    pattern: /^(\d+(?:\.\d+)?)%\s+increased\s+maximum\s+life$/i,
    parser: (m) => [{ stat: 'life', value: Number(m[1]), type: 'increased' }],
    tags: ['life', 'maximum'],
    priority: 100,
  },

  // ---- Energy Shield ----
  {
    pattern: /^\+(\d+(?:\.\d+)?)\s+to\s+maximum\s+energy\s+shield$/i,
    parser: (m) => [{ stat: 'energyShield', value: Number(m[1]), type: 'flat' }],
    tags: ['defense', 'energyShield'],
    priority: 100,
  },
  {
    pattern: /^(\d+(?:\.\d+)?)%\s+increased\s+maximum\s+energy\s+shield$/i,
    parser: (m) => [{ stat: 'energyShield', value: Number(m[1]), type: 'increased' }],
    tags: ['defense', 'energyShield'],
    priority: 100,
  },

  // ---- Mana ----
  {
    pattern: /^\+(\d+(?:\.\d+)?)\s+to\s+maximum\s+mana$/i,
    parser: (m) => [{ stat: 'mana', value: Number(m[1]), type: 'flat' }],
    tags: ['mana', 'maximum'],
    priority: 100,
  },

  // ---- Armour ----
  {
    pattern: /^\+(\d+(?:\.\d+)?)\s+to\s+armour$/i,
    parser: (m) => [{ stat: 'armour', value: Number(m[1]), type: 'flat' }],
    tags: ['defense', 'armour'],
    priority: 90,
  },
  {
    pattern: /^(\d+(?:\.\d+)?)%\s+increased\s+armour$/i,
    parser: (m) => [{ stat: 'armour', value: Number(m[1]), type: 'increased' }],
    tags: ['defense', 'armour'],
    priority: 90,
  },

  // ---- Evasion ----
  {
    pattern: /^\+(\d+(?:\.\d+)?)\s+to\s+evasion\s+rating$/i,
    parser: (m) => [{ stat: 'evasion', value: Number(m[1]), type: 'flat' }],
    tags: ['defense', 'evasion'],
    priority: 90,
  },
  {
    pattern: /^(\d+(?:\.\d+)?)%\s+increased\s+evasion\s+rating$/i,
    parser: (m) => [{ stat: 'evasion', value: Number(m[1]), type: 'increased' }],
    tags: ['defense', 'evasion'],
    priority: 90,
  },

  // ---- Ward ----
  {
    pattern: /^\+(\d+(?:\.\d+)?)\s+to\s+ward$/i,
    parser: (m) => [{ stat: 'ward', value: Number(m[1]), type: 'flat' }],
    tags: ['defense', 'ward'],
    priority: 90,
  },

  // ---- Resistances (specific elements first) ----
  {
    pattern: /^\+(\d+(?:\.\d+)?)%\s+to\s+fire\s+resistance$/i,
    parser: (m) => [{ stat: 'fireResistance', value: Number(m[1]), type: 'flat' }],
    tags: ['resist', 'fire'],
    priority: 100,
  },
  {
    pattern: /^\+(\d+(?:\.\d+)?)%\s+to\s+cold\s+resistance$/i,
    parser: (m) => [{ stat: 'coldResistance', value: Number(m[1]), type: 'flat' }],
    tags: ['resist', 'cold'],
    priority: 100,
  },
  {
    pattern: /^\+(\d+(?:\.\d+)?)%\s+to\s+lightning\s+resistance$/i,
    parser: (m) => [{ stat: 'lightningResistance', value: Number(m[1]), type: 'flat' }],
    tags: ['resist', 'lightning'],
    priority: 100,
  },
  {
    pattern: /^\+(\d+(?:\.\d+)?)%\s+to\s+chaos\s+resistance$/i,
    parser: (m) => [{ stat: 'chaosResistance', value: Number(m[1]), type: 'flat' }],
    tags: ['resist', 'chaos'],
    priority: 100,
  },

  // ---- Max Resistances ----
  {
    pattern: /^\+(\d+(?:\.\d+)?)%\s+to\s+maximum\s+fire\s+resistance$/i,
    parser: (m) => [{ stat: 'maxFireResistance', value: Number(m[1]), type: 'flat' }],
    tags: ['resist', 'maximum', 'fire'],
    priority: 100,
  },
  {
    pattern: /^\+(\d+(?:\.\d+)?)%\s+to\s+maximum\s+cold\s+resistance$/i,
    parser: (m) => [{ stat: 'maxColdResistance', value: Number(m[1]), type: 'flat' }],
    tags: ['resist', 'maximum', 'cold'],
    priority: 100,
  },
  {
    pattern: /^\+(\d+(?:\.\d+)?)%\s+to\s+maximum\s+lightning\s+resistance$/i,
    parser: (m) => [{ stat: 'maxLightningResistance', value: Number(m[1]), type: 'flat' }],
    tags: ['resist', 'maximum', 'lightning'],
    priority: 100,
  },
  {
    pattern: /^\+(\d+(?:\.\d+)?)\s+to\s+maximum\s+fire\s+resistance$/i,
    parser: (m) => [{ stat: 'maxFireResistance', value: Number(m[1]), type: 'flat' }],
    tags: ['resist', 'maximum', 'fire'],
    priority: 98,
  },
  {
    pattern: /^\+(\d+(?:\.\d+)?)\s+to\s+maximum\s+cold\s+resistance$/i,
    parser: (m) => [{ stat: 'maxColdResistance', value: Number(m[1]), type: 'flat' }],
    tags: ['resist', 'maximum', 'cold'],
    priority: 98,
  },
  {
    pattern: /^\+(\d+(?:\.\d+)?)\s+to\s+maximum\s+lightning\s+resistance$/i,
    parser: (m) => [{ stat: 'maxLightningResistance', value: Number(m[1]), type: 'flat' }],
    tags: ['resist', 'maximum', 'lightning'],
    priority: 98,
  },

  // ---- All/Elemental Resistances (less specific, lower priority) ----
  {
    pattern: /^\+(\d+(?:\.\d+)?)%\s+to\s+all\s+elemental\s+resistances$/i,
    parser: (m) => {
      const v = Number(m[1]);
      return [
        { stat: 'fireResistance', value: v, type: 'flat' },
        { stat: 'coldResistance', value: v, type: 'flat' },
        { stat: 'lightningResistance', value: v, type: 'flat' },
      ];
    },
    tags: ['resist', 'all', 'elemental'],
    priority: 70,
  },
  {
    pattern: /^\+(\d+(?:\.\d+)?)%\s+to\s+elemental\s+resistances$/i,
    parser: (m) => {
      const v = Number(m[1]);
      return [
        { stat: 'fireResistance', value: v, type: 'flat' },
        { stat: 'coldResistance', value: v, type: 'flat' },
        { stat: 'lightningResistance', value: v, type: 'flat' },
      ];
    },
    tags: ['resist', 'all', 'elemental'],
    priority: 70,
  },

  // ---- Attributes ----
  {
    pattern: /^\+(\d+(?:\.\d+)?)\s+to\s+strength$/i,
    parser: (m) => [{ stat: 'strength', value: Number(m[1]), type: 'flat' }],
    tags: ['attribute', 'strength'],
    priority: 90,
  },
  {
    pattern: /^\+(\d+(?:\.\d+)?)\s+to\s+dexterity$/i,
    parser: (m) => [{ stat: 'dexterity', value: Number(m[1]), type: 'flat' }],
    tags: ['attribute', 'dexterity'],
    priority: 90,
  },
  {
    pattern: /^\+(\d+(?:\.\d+)?)\s+to\s+intelligence$/i,
    parser: (m) => [{ stat: 'intelligence', value: Number(m[1]), type: 'flat' }],
    tags: ['attribute', 'intelligence'],
    priority: 90,
  },
  {
    pattern: /^\+(\d+(?:\.\d+)?)\s+to\s+all\s+attributes$/i,
    parser: (m) => {
      const v = Number(m[1]);
      return [
        { stat: 'strength', value: v, type: 'flat' },
        { stat: 'dexterity', value: v, type: 'flat' },
        { stat: 'intelligence', value: v, type: 'flat' },
      ];
    },
    tags: ['attribute', 'all'],
    priority: 80,
  },

  // ---- Flat Damage (specific types first) ----
  {
    pattern: /^adds\s+(\d+(?:\.\d+)?)\s+to\s+(\d+(?:\.\d+)?)\s+physical\s+damage$/i,
    parser: (m) => [
      { stat: 'physicalDamage', value: Number(m[1]), type: 'flat' },
      { stat: 'physicalDamage', value: Number(m[2]), type: 'flat' },
    ],
    tags: ['damage', 'physical'],
    priority: 100,
  },
  {
    pattern: /^adds\s+(\d+(?:\.\d+)?)\s+to\s+(\d+(?:\.\d+)?)\s+fire\s+damage$/i,
    parser: (m) => [
      { stat: 'fireDamage', value: Number(m[1]), type: 'flat' },
      { stat: 'fireDamage', value: Number(m[2]), type: 'flat' },
    ],
    tags: ['damage', 'fire'],
    priority: 100,
  },
  {
    pattern: /^adds\s+(\d+(?:\.\d+)?)\s+to\s+(\d+(?:\.\d+)?)\s+cold\s+damage$/i,
    parser: (m) => [
      { stat: 'coldDamage', value: Number(m[1]), type: 'flat' },
      { stat: 'coldDamage', value: Number(m[2]), type: 'flat' },
    ],
    tags: ['damage', 'cold'],
    priority: 100,
  },
  {
    pattern: /^adds\s+(\d+(?:\.\d+)?)\s+to\s+(\d+(?:\.\d+)?)\s+lightning\s+damage$/i,
    parser: (m) => [
      { stat: 'lightningDamage', value: Number(m[1]), type: 'flat' },
      { stat: 'lightningDamage', value: Number(m[2]), type: 'flat' },
    ],
    tags: ['damage', 'lightning'],
    priority: 100,
  },
  {
    pattern: /^adds\s+(\d+(?:\.\d+)?)\s+to\s+(\d+(?:\.\d+)?)\s+chaos\s+damage$/i,
    parser: (m) => [
      { stat: 'chaosDamage', value: Number(m[1]), type: 'flat' },
      { stat: 'chaosDamage', value: Number(m[2]), type: 'flat' },
    ],
    tags: ['damage', 'chaos'],
    priority: 100,
  },

  // ---- Increased Damage (specific types first) ----
  {
    pattern: /^\+?(\d+(?:\.\d+)?)%\s+increased\s+elemental\s+damage\s+with\s+attack\s+skills$/i,
    parser: (m) => [{ stat: 'elementalDamageWithAttacks', value: Number(m[1]), type: 'increased' }],
    tags: ['damage', 'elemental', 'attack'],
    priority: 100,
  },
  {
    pattern: /^\+?(\d+(?:\.\d+)?)%\s+increased\s+spell\s+damage$/i,
    parser: (m) => [{ stat: 'spellDamage', value: Number(m[1]), type: 'increased' }],
    tags: ['damage', 'spell'],
    priority: 100,
  },
  {
    pattern: /^\+?(\d+(?:\.\d+)?)%\s+increased\s+fire\s+damage$/i,
    parser: (m) => [{ stat: 'fireDamage', value: Number(m[1]), type: 'increased' }],
    tags: ['damage', 'fire'],
    priority: 90,
  },
  {
    pattern: /^\+?(\d+(?:\.\d+)?)%\s+increased\s+cold\s+damage$/i,
    parser: (m) => [{ stat: 'coldDamage', value: Number(m[1]), type: 'increased' }],
    tags: ['damage', 'cold'],
    priority: 90,
  },
  {
    pattern: /^\+?(\d+(?:\.\d+)?)%\s+increased\s+lightning\s+damage$/i,
    parser: (m) => [{ stat: 'lightningDamage', value: Number(m[1]), type: 'increased' }],
    tags: ['damage', 'lightning'],
    priority: 90,
  },
  {
    pattern: /^\+?(\d+(?:\.\d+)?)%\s+increased\s+physical\s+damage$/i,
    parser: (m) => [{ stat: 'physicalDamage', value: Number(m[1]), type: 'increased' }],
    tags: ['damage', 'physical'],
    priority: 90,
  },
  {
    pattern: /^\+?(\d+(?:\.\d+)?)%\s+increased\s+chaos\s+damage$/i,
    parser: (m) => [{ stat: 'chaosDamage', value: Number(m[1]), type: 'increased' }],
    tags: ['damage', 'chaos'],
    priority: 90,
  },

  // ---- Damage Over Time Multiplier ----
  {
    pattern: /^\+(\d+(?:\.\d+)?)%\s+to\s+fire\s+damage\s+over\s+time\s+multiplier$/i,
    parser: (m) => [{ stat: 'fireDamageOverTimeMultiplier', value: Number(m[1]), type: 'increased' }],
    tags: ['damage', 'fire', 'dot'],
    priority: 100,
  },

  // ---- Speed ----
  {
    pattern: /^\+?(\d+(?:\.\d+)?)%\s+increased\s+attack\s+speed$/i,
    parser: (m) => [{ stat: 'attackSpeed', value: Number(m[1]), type: 'increased' }],
    tags: ['speed', 'attack'],
    priority: 90,
  },
  {
    pattern: /^\+?(\d+(?:\.\d+)?)%\s+increased\s+cast\s+speed$/i,
    parser: (m) => [{ stat: 'castSpeed', value: Number(m[1]), type: 'increased' }],
    tags: ['speed', 'cast'],
    priority: 90,
  },
  {
    pattern: /^\+?(\d+(?:\.\d+)?)%\s+increased\s+movement\s+speed$/i,
    parser: (m) => [{ stat: 'movementSpeed', value: Number(m[1]), type: 'increased' }],
    tags: ['speed', 'movement'],
    priority: 90,
  },
  {
    pattern: /^\+(\d+(?:\.\d+)?)%\s+to\s+movement\s+speed$/i,
    parser: (m) => [{ stat: 'movementSpeed', value: Number(m[1]), type: 'increased' }],
    tags: ['speed', 'movement'],
    priority: 85,
  },

  // ---- Critical ----
  {
    pattern: /^\+(\d+(?:\.\d+)?)%\s+to\s+critical\s+strike\s+chance$/i,
    parser: (m) => [{ stat: 'criticalChance', value: Number(m[1]), type: 'flat' }],
    tags: ['critical'],
    priority: 90,
  },
  {
    pattern: /^\+(\d+(?:\.\d+)?)%\s+to\s+critical\s+strike\s+multiplier$/i,
    parser: (m) => [{ stat: 'criticalMultiplier', value: Number(m[1]), type: 'flat' }],
    tags: ['critical'],
    priority: 90,
  },

  // ---- Block ----
  {
    pattern: /^\+(\d+(?:\.\d+)?)%\s+chance\s+to\s+block\s+attack\s+damage$/i,
    parser: (m) => [{ stat: 'attackBlock', value: Number(m[1]), type: 'flat' }],
    tags: ['defense', 'block'],
    priority: 90,
  },
  {
    pattern: /^\+(\d+(?:\.\d+)?)%\s+chance\s+to\s+block\s+spell\s+damage$/i,
    parser: (m) => [{ stat: 'spellBlock', value: Number(m[1]), type: 'flat' }],
    tags: ['defense', 'block'],
    priority: 90,
  },

  // ---- Spell Suppression ----
  {
    pattern: /^\+(\d+(?:\.\d+)?)%\s+chance\s+to\s+suppress\s+spell\s+damage$/i,
    parser: (m) => [{ stat: 'spellSuppression', value: Number(m[1]), type: 'flat' }],
    tags: ['defense', 'suppression'],
    priority: 90,
  },

  // ---- Life Recovery ----
  {
    pattern: /^recover\s+(\d+(?:\.\d+)?)%\s+of\s+life\s+when\s+you\s+block$/i,
    parser: (m) => [{ stat: 'lifeOnBlock', value: Number(m[1]), type: 'flat' }],
    tags: ['life', 'block', 'recovery'],
    priority: 90,
  },
  {
    pattern: /^\+(\d+(?:\.\d+)?)\s+life\s+when\s+you\s+block$/i,
    parser: (m) => [{ stat: 'lifeOnBlock', value: Number(m[1]), type: 'flat' }],
    tags: ['life', 'block', 'recovery'],
    priority: 90,
  },
  {
    pattern: /^regenerate\s+(\d+(?:\.\d+)?)%\s+of\s+life\s+per\s+second$/i,
    parser: (m) => [{ stat: 'lifeRegen', value: Number(m[1]), type: 'increased' }],
    tags: ['life', 'regen'],
    priority: 90,
  },
  {
    pattern: /^\+(\d+(?:\.\d+)?)\s+life\s+regenerated\s+per\s+second$/i,
    parser: (m) => [{ stat: 'lifeRegen', value: Number(m[1]), type: 'flat' }],
    tags: ['life', 'regen'],
    priority: 90,
  },

  // ---- Conversion ----
  {
    pattern: /^gain\s+(\d+(?:\.\d+)?)%\s+of\s+physical\s+damage\s+as\s+extra\s+fire\s*$/i,
    parser: (m) => [{ stat: 'physicalAsExtraFire', value: Number(m[1]), type: 'conversion' }],
    tags: ['conversion', 'physical', 'fire'],
    priority: 100,
  },
  {
    pattern: /^gain\s+(\d+(?:\.\d+)?)%\s+of\s+physical\s+damage\s+as\s+extra\s+cold\s*$/i,
    parser: (m) => [{ stat: 'physicalAsExtraCold', value: Number(m[1]), type: 'conversion' }],
    tags: ['conversion', 'physical', 'cold'],
    priority: 100,
  },
  {
    pattern: /^gain\s+(\d+(?:\.\d+)?)%\s+of\s+physical\s+damage\s+as\s+extra\s+lightning\s*$/i,
    parser: (m) => [{ stat: 'physicalAsExtraLightning', value: Number(m[1]), type: 'conversion' }],
    tags: ['conversion', 'physical', 'lightning'],
    priority: 100,
  },
  {
    pattern: /^gain\s+(\d+(?:\.\d+)?)%\s+of\s+physical\s+damage\s+as\s+extra\s+chaos\s*$/i,
    parser: (m) => [{ stat: 'physicalAsExtraChaos', value: Number(m[1]), type: 'conversion' }],
    tags: ['conversion', 'physical', 'chaos'],
    priority: 100,
  },
  {
    pattern: /^gain\s+(\d+(?:\.\d+)?)%\s+of\s+physical\s+damage\s+as\s+extra\s+fire\s+damage$/i,
    parser: (m) => [{ stat: 'physicalAsExtraFire', value: Number(m[1]), type: 'conversion' }],
    tags: ['conversion', 'physical', 'fire'],
    priority: 95,
  },
  {
    pattern: /^gain\s+(\d+(?:\.\d+)?)%\s+of\s+physical\s+damage\s+as\s+extra\s+cold\s+damage$/i,
    parser: (m) => [{ stat: 'physicalAsExtraCold', value: Number(m[1]), type: 'conversion' }],
    tags: ['conversion', 'physical', 'cold'],
    priority: 95,
  },
  {
    pattern: /^gain\s+(\d+(?:\.\d+)?)%\s+of\s+physical\s+damage\s+as\s+extra\s+lightning\s+damage$/i,
    parser: (m) => [{ stat: 'physicalAsExtraLightning', value: Number(m[1]), type: 'conversion' }],
    tags: ['conversion', 'physical', 'lightning'],
    priority: 95,
  },
  {
    pattern: /^gain\s+(\d+(?:\.\d+)?)%\s+of\s+physical\s+damage\s+as\s+extra\s+chaos\s+damage$/i,
    parser: (m) => [{ stat: 'physicalAsExtraChaos', value: Number(m[1]), type: 'conversion' }],
    tags: ['conversion', 'physical', 'chaos'],
    priority: 95,
  },

  // ---- Enemy Resistance Reduction ----
  {
    pattern: /^enemies\s+have\s+-(\d+(?:\.\d+)?)%\s+to\s+fire\s+resistance$/i,
    parser: (m) => [{ stat: 'enemyFireResistance', value: -Number(m[1]), type: 'flat' }],
    tags: ['resist', 'enemy', 'fire'],
    priority: 100,
  },
  {
    pattern: /^enemies\s+have\s+-(\d+(?:\.\d+)?)%\s+to\s+cold\s+resistance$/i,
    parser: (m) => [{ stat: 'enemyColdResistance', value: -Number(m[1]), type: 'flat' }],
    tags: ['resist', 'enemy', 'cold'],
    priority: 100,
  },
  {
    pattern: /^enemies\s+have\s+-(\d+(?:\.\d+)?)%\s+to\s+lightning\s+resistance$/i,
    parser: (m) => [{ stat: 'enemyLightningResistance', value: -Number(m[1]), type: 'flat' }],
    tags: ['resist', 'enemy', 'lightning'],
    priority: 100,
  },

  // ---- Fallback: generic "% increased" pattern (lowest priority) ----
  {
    pattern: /^\+?(\d+(?:\.\d+)?)%\s+increased\s+(.+)$/i,
    parser: (m) => [{ stat: m[2]!.toLowerCase().replace(/\s+/g, '_'), value: Number(m[1]), type: 'increased' }],
    tags: ['generic'],
    priority: 10,
  },
  {
    pattern: /^\+(\d+(?:\.\d+)?)%\s+to\s+(.+)$/i,
    parser: (m) => [{ stat: m[2]!.toLowerCase().replace(/\s+/g, '_'), value: Number(m[1]), type: 'flat' }],
    tags: ['generic'],
    priority: 5,
  },
];
