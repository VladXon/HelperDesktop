export interface DamageResult {
  total: number;
  breakdown: Record<string, number>;
}

export interface DamageReport {
  totalDps: number;
  averageHit: number;
  attackRate: number;
  damageTypes: Record<string, number>;
  bossDps: number;
  uberDps: number;
  isDotBuild: boolean;
}
