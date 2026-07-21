export type EquipmentSlot = 'helm' | 'amulet' | 'chest' | 'ring1' | 'ring2' | 'belt' | 'gloves' | 'boots' | 'mainHand' | 'offHand' | 'flask1' | 'flask2' | 'flask3' | 'flask4' | 'flask5' | 'jewel' | 'abyss';

export type ItemRarity = 'normal' | 'magic' | 'rare' | 'unique';

export type Influence = 'shaper' | 'elder' | 'crusader' | 'hunter' | 'redeemer' | 'warlord';

export interface Modifier {
  name: string;
  values: string[];
  domain: string;
}

export interface SocketGroup {
  group: number;
  colours: string;
  links: number;
}

export interface DamageRange {
  type: 'physical' | 'fire' | 'cold' | 'lightning' | 'chaos';
  min: number;
  max: number;
}

export interface ComputedItemStats {
  armour: number;
  evasion: number;
  energyShield: number;
  ward: number;
  life: number;
  mana: number;
  resistances: { fire: number; cold: number; lightning: number; chaos: number };
  maxResistances: { fire: number; cold: number; lightning: number };
  attributes: { str: number; dex: number; int: number };
  flatDamage: DamageRange[];
  increasedDamage: Record<string, number>;
  castSpeed: number;
  attackSpeed: number;
  criticalChance: number;
  criticalMultiplier: number;
  spellSuppression: number;
  blockChance: { attack: number; spell: number };
  lifeRegen: number;
  onBlockGain: number;
  movementSpeed: number;
  implicits: Modifier[];
  explicits: Modifier[];
  crafts: Modifier[];
}

export interface EquippedItem {
  slot: EquipmentSlot;
  identity: { name: string; baseType: string; rarity: ItemRarity };
  rawMods: Modifier[];
  computedStats: ComputedItemStats;
  sockets: SocketGroup[];
}

export interface ClusterJewelSummary {
  name: string;
  baseType: string;
  stats: Record<string, number>;
  socketIndex: number;
}

export interface PassiveTreeSnapshot {
  version: string;
  allocatedHashes: number[];
  masteryChoices: Record<number, string>;
  keystones: string[];
  clusterJewels: ClusterJewelSummary[];
  ascendancyNodes: string[];
}

export interface CharacterBase {
  class: string;
  ascendancy: string | null;
  level: number;
  bandits: 'oak' | 'kraityn' | 'aliya' | 'kill-all';
}

export interface ChargeState {
  frenzy: number;
  power: number;
  endurance: number;
}

export interface BuildConfig {
  isBoss: boolean;
  enemyResistances: number;
  charges: ChargeState;
  curses: string[];
  customMods: string[];
}

export interface SkillGem {
  name: string;
  level: number;
  quality: number;
  variant: 'regular' | 'anomalous' | 'divergent' | 'phantasmal';
}

export interface SkillSetup {
  id: string;
  activeGem: SkillGem;
  supportGems: SkillGem[];
  isEnabled: boolean;
}

export interface Build {
  game: 'poe1' | 'poe2';
  name: string;
  source: 'pob' | 'api' | 'manual';
  character: CharacterBase;
  passiveTree: PassiveTreeSnapshot;
  items: EquippedItem[];
  skills: SkillSetup[];
  config: BuildConfig;
}
