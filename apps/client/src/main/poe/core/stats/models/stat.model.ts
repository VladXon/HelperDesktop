export type StatSource = 'item' | 'tree' | 'skill' | 'ascendancy' | 'keystone' | 'mastery';
export type StatType = 'flat' | 'increased' | 'more' | 'conversion';

export interface StatValue {
  name: string;
  value: number;
  source: StatSource;
  type: StatType;
}
