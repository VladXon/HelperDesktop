export type DamageType = 'physical' | 'fire' | 'cold' | 'lightning' | 'chaos';

export const DAMAGE_TYPES: DamageType[] = ['physical', 'fire', 'cold', 'lightning', 'chaos'];

export interface DamageComponent {
  type: DamageType;
  value: number;
  baseValue: number;
  originType: DamageType;
  tags: string[];
  source: string;
}

export interface DamageBreakdown {
  total: number;
  components: DamageComponent[];
  byType: Record<string, number>;
  contributions: Record<string, number>;
}

export interface DamageReport {
  totalDps: number;
  averageHit: number;
  castRate: number;
  damageTypes: Record<string, number>;
  bossDps: number;
  uberDps: number;
  isDotBuild: boolean;
  breakdown: DamageBreakdown;
}

export function computeByType(components: DamageComponent[]): Record<string, number> {
  const byType: Record<string, number> = {};
  for (const c of components) {
    byType[c.type] = (byType[c.type] ?? 0) + c.value;
  }
  return byType;
}

export function computeTotal(components: DamageComponent[]): number {
  let total = 0;
  for (const c of components) total += c.value;
  return total;
}

export function createBreakdown(components: DamageComponent[], contributions?: Record<string, number>): DamageBreakdown {
  return {
    total: computeTotal(components),
    components,
    byType: computeByType(components),
    contributions: contributions ?? { base: computeTotal(components) },
  };
}

export function emptyBreakdown(): DamageBreakdown {
  return { total: 0, components: [], byType: {}, contributions: {} };
}
