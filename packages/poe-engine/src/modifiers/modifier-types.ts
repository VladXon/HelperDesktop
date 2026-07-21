export type ModifierSource =
  | 'base'
  | 'passiveTree'
  | 'ascendancy'
  | 'mastery'
  | 'clusterJewel'
  | 'timelessJewel'
  | 'item'
  | 'implicit'
  | 'explicit'
  | 'crafted'
  | 'corruption'
  | 'enchantment'
  | 'skillGem'
  | 'supportGem'
  | 'keystone'
  | 'bandit'
  | 'pantheon'
  | 'flask'
  | 'buff'
  | 'aura'
  | 'curse'
  | 'debuff'
  | 'charge'
  | 'monsterMod';

export type ModifierType =
  | 'flat'
  | 'increased'
  | 'more'
  | 'less'
  | 'override';

export interface ModifierMeta {
  readonly name: string;
  readonly description?: string;
  readonly priority?: number;
  readonly tags?: readonly string[];
}
