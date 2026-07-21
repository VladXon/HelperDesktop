import type { SkillTag, DamageRange, ConversionRule, SkillMechanic } from '../models/skill.model.js';

export interface GemData {
  tags: SkillTag[];
  baseDamageRanges: DamageRange[];
  effectiveness: number;
  attackTime: number | null;
  castTime: number | null;
  conversion: ConversionRule[];
  mechanics: SkillMechanic[];
}

export type GemLookup = Record<string, GemData>;

export const GEM_LIBRARY: GemLookup = {
  boneshatter: {
    tags: ['physical', 'attack', 'melee', 'strike', 'aoe'],
    baseDamageRanges: [],
    effectiveness: 1.35,
    attackTime: 0.85,
    castTime: null,
    conversion: [],
    mechanics: [{ type: 'selfCast', multiplier: 1.0 }],
  },

  'fire trap': {
    tags: ['fire', 'spell', 'trap', 'aoe', 'duration', 'dot'],
    baseDamageRanges: [
      { type: 'fire', min: 1, max: 1 },
    ],
    effectiveness: 2.6,
    attackTime: null,
    castTime: 1.0,
    conversion: [],
    mechanics: [{ type: 'trap', multiplier: 1.0 }],
  },

  'righteous fire': {
    tags: ['fire', 'spell', 'aoe', 'duration', 'dot'],
    baseDamageRanges: [],
    effectiveness: 0.7,
    attackTime: null,
    castTime: 0,
    conversion: [],
    mechanics: [{ type: 'selfCast', multiplier: 1.0 }],
  },

  fireball: {
    tags: ['fire', 'spell', 'projectile', 'aoe'],
    baseDamageRanges: [
      { type: 'fire', min: 1095, max: 1643 },
    ],
    effectiveness: 3.7,
    attackTime: null,
    castTime: 0.75,
    conversion: [],
    mechanics: [{ type: 'selfCast', multiplier: 1.0 }],
  },

  'lightning strike': {
    tags: ['lightning', 'attack', 'melee', 'projectile', 'strike'],
    baseDamageRanges: [],
    effectiveness: 2.25,
    attackTime: 0.85,
    castTime: null,
    conversion: [
      { from: 'physical', to: 'lightning', percent: 50, kind: 'conversion' },
    ],
    mechanics: [{ type: 'selfCast', multiplier: 1.0 }],
  },

  'glacial hammer': {
    tags: ['cold', 'attack', 'melee', 'strike'],
    baseDamageRanges: [],
    effectiveness: 2.69,
    attackTime: 0.85,
    castTime: null,
    conversion: [
      { from: 'physical', to: 'cold', percent: 100, kind: 'conversion' },
    ],
    mechanics: [{ type: 'selfCast', multiplier: 1.0 }],
  },

  'leap slam': {
    tags: ['physical', 'attack', 'melee', 'aoe', 'movement', 'travel', 'slam'],
    baseDamageRanges: [],
    effectiveness: 1.0,
    attackTime: 0.7,
    castTime: null,
    conversion: [],
    mechanics: [{ type: 'selfCast', multiplier: 1.0 }],
  },

  'blade vortex': {
    tags: ['physical', 'spell', 'aoe', 'duration', 'orb'],
    baseDamageRanges: [
      { type: 'physical', min: 14, max: 21 },
    ],
    effectiveness: 0.3,
    attackTime: null,
    castTime: 0.5,
    conversion: [],
    mechanics: [{ type: 'selfCast', multiplier: 1.0 }],
  },
};
