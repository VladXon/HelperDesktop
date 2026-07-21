import type { EquipmentSlot } from './build';

export interface Problem {
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  category: string;
}

export interface Warning {
  message: string;
  category: string;
}

export interface LeechSummary {
  totalLeech: number;
  leechRate: number;
  duration: number;
}

export interface GuardSkillSummary {
  name: string;
  uptime: number;
  mitigation: number;
}

export interface SkillSummary {
  name: string;
  hitRate: number;
  averageHit: number;
  penetration: number;
}

export interface OffenseReport {
  mainSkill: SkillSummary;
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

export interface DefenseReport {
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
  recovery: {
    lifeRegen: number;
    lifeRegenPercent: number;
    leech: LeechSummary;
    lifeOnHit: number;
    lifeOnBlock: number;
    energyShieldRecharge: number;
    esRechargeDelay: number;
    recoupPercent: number;
  };
  ehp: { physicalMaxHit: number; elementalMaxHit: number; chaosMaxHit: number };
  ailmentImmunity: Record<string, boolean>;
  guardSkill: GuardSkillSummary | null;
}

export interface UpgradeRecommendation {
  itemSlot: EquipmentSlot;
  currentScore: number;
  upgradePriority: number;
  targetStats: string[];
  estimatedBudgetLow: number;
  estimatedBudgetHigh: number;
  improvementPercent: number;
}

export interface ScalingReport {
  primaryScalar: string;
  secondaryScalars: string[];
  diminishingReturns: string[];
  gemLevelImpact: number;
  criticalScalingEfficiency: number;
}

export interface BuildScores {
  overall: number;
  offense: number;
  defense: number;
  sustain: number;
  mapping: number;
  bossing: number;
  leagueStart: number;
  scaling: number;
}

export interface BuildSummary {
  buildName: string;
  game: string;
  class: string;
  ascendancy: string;
  level: number;
  mainSkill: string;
}

export interface AnalysisMetadata {
  analyzerVersion: string;
  patchVersion: string;
  analyzedAt: number;
  buildHash: string;
}

export interface AnalysisContext {
  patch: string;
  enemy: { type: 'normal' | 'rare' | 'boss' | 'uber'; resistance: number };
  budget: 'league-start' | 'budget' | 'endgame';
}

export interface AnalysisResult {
  build: BuildSummary;
  facts: {
    offense: OffenseReport;
    defense: DefenseReport;
    scaling: ScalingReport;
  };
  insights: {
    problems: Problem[];
    warnings: Warning[];
    recommendations: UpgradeRecommendation[];
  };
  scores: BuildScores;
  metadata: AnalysisMetadata;
}

export interface DamageProfile {
  hits: { physical: number; fire: number; cold: number; lightning: number; chaos: number };
  ailments: { ignite: number; bleed: number; poison: number };
  final: { dps: number; bossDps: number };
}

export interface ScalingVector {
  category: 'gear' | 'passive' | 'gem' | 'jewel' | 'cluster';
  stat: string;
  currentValue: number;
  marginalGain: number;
  efficiency: number;
}
