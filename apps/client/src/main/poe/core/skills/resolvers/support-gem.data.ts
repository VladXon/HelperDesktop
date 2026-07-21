export interface SupportGemData {
  moreMultiplier: number;
  increasedMultiplier: number;
  tags: string[];
  restrictions: string[];
}

export type SupportGemLookup = Record<string, SupportGemData>;

export const SUPPORT_GEM_DATA: SupportGemLookup = {
  'melee physical damage': {
    moreMultiplier: 49,
    increasedMultiplier: 0,
    tags: ['melee', 'physical', 'attack'],
    restrictions: [],
  },
  brutality: {
    moreMultiplier: 59,
    increasedMultiplier: 0,
    tags: ['melee', 'physical', 'attack'],
    restrictions: ['elemental', 'chaos'],
  },
  'close combat': {
    moreMultiplier: 39,
    increasedMultiplier: 0,
    tags: ['melee', 'attack'],
    restrictions: [],
  },
  impale: {
    moreMultiplier: 39,
    increasedMultiplier: 0,
    tags: ['physical', 'attack'],
    restrictions: [],
  },
  'elemental damage with attacks': {
    moreMultiplier: 39,
    increasedMultiplier: 0,
    tags: ['elemental', 'attack'],
    restrictions: ['physical'],
  },
  'elemental focus': {
    moreMultiplier: 39,
    increasedMultiplier: 0,
    tags: ['elemental'],
    restrictions: ['cold', 'freeze', 'chill', 'ignite', 'shock'],
  },
  'concentrated effect': {
    moreMultiplier: 39,
    increasedMultiplier: 0,
    tags: ['aoe'],
    restrictions: [],
  },
  'increased area of effect': {
    moreMultiplier: 0,
    increasedMultiplier: 49,
    tags: ['aoe'],
    restrictions: [],
  },
  'trap and mine damage': {
    moreMultiplier: 39,
    increasedMultiplier: 0,
    tags: ['trap', 'mine'],
    restrictions: [],
  },
  'burning damage': {
    moreMultiplier: 39,
    increasedMultiplier: 0,
    tags: ['fire', 'dot'],
    restrictions: [],
  },
  'swift assembly': {
    moreMultiplier: 26,
    increasedMultiplier: 0,
    tags: ['trap', 'mine'],
    restrictions: [],
  },
  'swift affliction': {
    moreMultiplier: 44,
    increasedMultiplier: 0,
    tags: ['dot', 'duration'],
    restrictions: [],
  },
  'controlled destruction': {
    moreMultiplier: 39,
    increasedMultiplier: 0,
    tags: ['spell'],
    restrictions: [],
  },
  'faster attacks': {
    moreMultiplier: 0,
    increasedMultiplier: 54,
    tags: ['attack'],
    restrictions: [],
  },
  'greater multiple projectiles': {
    moreMultiplier: 0,
    increasedMultiplier: 0,
    tags: ['projectile'],
    restrictions: [],
  },
  'lesser multiple projectiles': {
    moreMultiplier: 0,
    increasedMultiplier: 0,
    tags: ['projectile'],
    restrictions: [],
  },
};
