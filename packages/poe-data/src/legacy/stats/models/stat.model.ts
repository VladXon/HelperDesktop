export type StatSource = 'item' | 'tree' | 'skill' | 'ascendancy' | 'keystone' | 'mastery';
export type StatType = 'flat' | 'increased' | 'more' | 'conversion';
export type ModifierScope = 'localItem' | 'global' | 'skill' | 'enemy';

export interface StatSourceRef {
  source: string;
  value: number;
  type: StatType;
  scope: ModifierScope;
}

export interface TracedStat {
  value: number;
  sources: StatSourceRef[];
}

export interface StatValue {
  name: string;
  value: number;
  source: StatSource;
  type: StatType;
  scope: ModifierScope;
  modifierName: string;
}

export function makeTracedStat(): TracedStat {
  return { value: 0, sources: [] };
}

export function addToTracedStat(stat: TracedStat, source: StatSourceRef): void {
  stat.value += source.value;
  stat.sources.push(source);
}
