export interface BuildSummaryData {
  name: string;
  ascendancy: string;
  level: number;
}

export interface OffenseData {
  mainSkill: { name: string; hitRate: number; averageHit: number; penetration: number };
  totalDps: number;
  bossDps: number;
  uberDps: number;
  damageBreakdown: { physical: number; fire: number; cold: number; lightning: number; chaos: number };
  penetration: number;
  resistanceReduction: number;
  critChance: number;
  critMultiplier: number;
  attackSpeed: number;
  isDotBuild: boolean;
  dotDps: number;
  witherStacks: number;
  shockEffect: number;
}

export interface DefenseData {
  life: number;
  energyShield: number;
  combinedPool: number;
  resistances: {
    fire: { uncapped: number; capped: number; overcap: number };
    cold: { uncapped: number; capped: number; overcap: number };
    lightning: { uncapped: number; capped: number; overcap: number };
    chaos: { uncapped: number; capped: number; overcap: number };
  };
  maxResistances: { fire: number; cold: number; lightning: number };
  armour: number;
  physicalReduction: number;
  evasion: number;
  evadeChance: number;
  block: { attack: number; spell: number };
  spellSuppression: number;
  ehp: { physicalMaxHit: number; elementalMaxHit: number; chaosMaxHit: number };
  ailmentImmunity: Record<string, boolean>;
}

export interface ProblemData {
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  category: string;
}

export interface RecommendationData {
  itemSlot: string;
  upgradePriority: number;
  targetStats: string[];
  estimatedBudgetLow: number;
  estimatedBudgetHigh: number;
  improvementPercent: number;
}

export interface ScalingData {
  primaryScalar: string;
  secondaryScalars: string[];
  diminishingReturns: string[];
  gemLevelImpact: number;
  criticalScalingEfficiency: number;
}

export interface ScoresData {
  overall: number;
  offense: number;
  defense: number;
  sustain: number;
  mapping: number;
  bossing: number;
  leagueStart: number;
  scaling: number;
}

export interface AnalysisData {
  offense: OffenseData;
  defense: DefenseData;
  scaling: ScalingData;
  problems: ProblemData[];
  recommendations: RecommendationData[];
  scores: ScoresData;
  metadata: { analyzerVersion: string; calculationVersion: string; patchVersion: string; analyzedAt: number; buildHash: string };
}

export interface PoeAnalyzeResult {
  import: {
    buildSummary: BuildSummaryData;
    modifierCount: number;
  };
  analysis: AnalysisData;
  explanation: { summary: string } | null;
}
