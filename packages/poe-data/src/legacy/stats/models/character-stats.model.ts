import type { StatValue, TracedStat } from './stat.model.js';

export interface DefenseStats {
  life: number;
  energyShield: number;
  mana: number;
  armour: number;
  evasion: number;
  ward: number;
  fireResistance: number;
  coldResistance: number;
  lightningResistance: number;
  chaosResistance: number;
  maxFireResistance: number;
  maxColdResistance: number;
  maxLightningResistance: number;
  attackBlock: number;
  spellBlock: number;
  spellSuppression: number;
  lifeRegen: number;
  armourIncreased: number;
  evasionIncreased: number;
  energyShieldIncreased: number;
  lifeIncreased: number;
}

export interface TracedDefenseStats {
  life: TracedStat;
  energyShield: TracedStat;
  mana: TracedStat;
  armour: TracedStat;
  evasion: TracedStat;
  fireResistance: TracedStat;
  coldResistance: TracedStat;
  lightningResistance: TracedStat;
  chaosResistance: TracedStat;
  attackBlock: TracedStat;
  spellBlock: TracedStat;
  lifeRegen: TracedStat;
  spellSuppression: TracedStat;
}

export interface OffenseStats {
  attackSpeed: number;
  castSpeed: number;
  movementSpeed: number;
  criticalChance: number;
  criticalMultiplier: number;
  firePenetration: number;
  coldPenetration: number;
  lightningPenetration: number;
  elementalPenetration: number;
  damageOverTimeMultiplier: number;
  flatDamage: Record<string, { min: number; max: number }>;
  increasedDamage: Record<string, number>;
  moreDamage: Record<string, number>;
}

export interface MechanicsState {
  keystones: string[];
  ailments: string[];
  conversion: { from: string; to: string; percent: number; kind: string }[];
  overrides: Record<string, number>;
}

export interface AttributeStats {
  strength: number;
  dexterity: number;
  intelligence: number;
}

export interface ResolvedCharacterStats {
  defense: DefenseStats;
  offense: OffenseStats;
  mechanics: MechanicsState;
  attributes: AttributeStats;
  rawModifiers: StatValue[];
  traced: TracedDefenseStats;
}

export function emptyDefense(): DefenseStats {
  return {
    life: 0, energyShield: 0, mana: 0, armour: 0, evasion: 0, ward: 0,
    fireResistance: 0, coldResistance: 0, lightningResistance: 0, chaosResistance: 0,
    maxFireResistance: 0, maxColdResistance: 0, maxLightningResistance: 0,
    attackBlock: 0, spellBlock: 0, spellSuppression: 0, lifeRegen: 0,
    armourIncreased: 0, evasionIncreased: 0, energyShieldIncreased: 0, lifeIncreased: 0,
  };
}

export function emptyOffense(): OffenseStats {
  return {
    attackSpeed: 0, castSpeed: 0, movementSpeed: 0,
    criticalChance: 0, criticalMultiplier: 0,
    firePenetration: 0, coldPenetration: 0, lightningPenetration: 0, elementalPenetration: 0,
    damageOverTimeMultiplier: 0,
    flatDamage: {},
    increasedDamage: {},
    moreDamage: {},
  };
}

export function emptyMechanics(): MechanicsState {
  return { keystones: [], ailments: [], conversion: [], overrides: {} };
}

export function emptyAttributes(): AttributeStats {
  return { strength: 0, dexterity: 0, intelligence: 0 };
}
