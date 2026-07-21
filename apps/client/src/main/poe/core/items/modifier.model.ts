export type ModSource = 'item' | 'tree' | 'gem' | 'cluster' | 'jewel';

export type ModCategory =
  | 'explicit'
  | 'implicit'
  | 'crafted'
  | 'enchant'
  | 'fractured'
  | 'influence'
  | 'synthesized'
  | 'veiled'
  | 'corrupted';

export type StatType = 'flat' | 'increased' | 'more' | 'less' | 'conversion' | 'chance';

export interface ModifierStat {
  stat: string;
  value: number;
  type: StatType;
}

export interface Modifier {
  id: string;
  source: ModSource;
  category: ModCategory;
  text: string;
  stats: ModifierStat[];
  tags: string[];
  tier?: number;
  values: number[];
}
