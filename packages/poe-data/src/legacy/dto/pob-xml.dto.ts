export interface PoBBuildAttributes {
  level: number;
  className: string;
  ascendClassName: string | null;
  bandit: 'oak' | 'kraityn' | 'aliya' | 'kill-all';
  targetVersion: string;
}

export interface PoBSkill {
  active: boolean;
  name: string;
  level: number;
  quality: number;
  variant: string;
}

export interface PoBSkillSet {
  id: number;
  skills: PoBSkill[];
}

export interface PoBMod {
  text: string;
  implicit: boolean;
  explicit: boolean;
  crafted: boolean;
}

export interface PoBSocket {
  group: number;
  attr: string;
}

export interface PoBItem {
  id: string;
  title: string;
  baseType: string;
  rarity: string;
  rawMods: PoBMod[];
  sockets: PoBSocket[];
}

export interface PoBTree {
  treeVersion: string;
  nodes: number[];
  masteryEffects: Record<number, string>;
  keystones: string[];
  ascendancyNodes: string[];
}

export interface PoBConfig {
  isBoss: boolean;
  enemyResistances: number;
  charges: { frenzy: number; power: number; endurance: number };
}

export interface PoBXmlDTO {
  build: PoBBuildAttributes;
  skills: PoBSkillSet[];
  items: PoBItem[];
  tree: PoBTree;
  config: PoBConfig;
}
