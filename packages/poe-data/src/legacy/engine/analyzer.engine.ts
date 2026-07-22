import type { Build, AnalysisResult, AnalysisContext, BuildSummary, BuildScores, OffenseReport, DefenseReport, ScalingReport, Problem, Warning, UpgradeRecommendation, AnalysisMetadata } from '../models/index.js';
import { resolveBuildStats } from '../resolvers/stat-resolver.js';
import { estimateOffense } from '../calculators/damage.calculator.js';
import { calculateDefense } from '../calculators/defense.calculator.js';
import { evaluateDamageReport, evaluateDefenseReport, evaluateScaling, detectUpgrades } from '../rules/index.js';

const ANALYZER_VERSION = '2.0.0';
const CALCULATION_VERSION = '1.0.0';

function hashBuild(build: Build): string {
  const identity = `${build.character.class}:${build.character.ascendancy}:${build.character.level}:${build.items.length}:${build.skills.length}`;
  let hash = 0;
  for (let i = 0; i < identity.length; i++) {
    const char = identity.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function computeScores(
  offense: OffenseReport,
  defense: DefenseReport,
  problems: Problem[],
): BuildScores {
  const critCount = problems.filter((p) => p.severity === 'critical').length;
  const highCount = problems.filter((p) => p.severity === 'high').length;

  let offenseScore = 0;
  if (offense.totalDps >= 10_000_000) offenseScore = 95;
  else if (offense.totalDps >= 5_000_000) offenseScore = 85;
  else if (offense.totalDps >= 2_000_000) offenseScore = 70;
  else if (offense.totalDps >= 1_000_000) offenseScore = 55;
  else if (offense.totalDps >= 500_000) offenseScore = 35;
  else if (offense.totalDps >= 100_000) offenseScore = 15;
  else offenseScore = 5;

  let defenseScore = 0;
  const resOk = defense.resistances.fire.capped >= 75 &&
    defense.resistances.cold.capped >= 75 &&
    defense.resistances.lightning.capped >= 75;

  if (resOk && defense.combinedPool >= 6000 && defense.physicalReduction >= 50) defenseScore = 90;
  else if (resOk && defense.combinedPool >= 5000) defenseScore = 70;
  else if (resOk && defense.combinedPool >= 4000) defenseScore = 50;
  else if (resOk) defenseScore = 30;
  else defenseScore = 10;

  let sustainScore = 0;
  if (defense.recovery.lifeRegenPercent >= 5) sustainScore = 80;
  else if (defense.recovery.lifeRegenPercent >= 2) sustainScore = 55;
  else if (defense.recovery.lifeOnBlock > 0) sustainScore = 45;
  else sustainScore = 25;

  const mappingScore = Math.round((offenseScore * 0.4 + defenseScore * 0.3 + sustainScore * 0.3));
  const bossingScore = Math.round((offenseScore * 0.3 + defenseScore * 0.5 + sustainScore * 0.2));
  const leagueStartScore = Math.round((defenseScore * 0.4 + sustainScore * 0.4 + (100 - offenseScore * 0.5) * 0.2));
  const scalingScore = offenseScore > 60 ? 80 : offenseScore > 30 ? 50 : 20;

  const overall = Math.round(
    (offenseScore * 0.3 + defenseScore * 0.3 + sustainScore * 0.15 +
      mappingScore * 0.1 + bossingScore * 0.1 + scalingScore * 0.05) -
    (critCount * 15 + highCount * 5),
  );

  return {
    overall: Math.max(0, Math.min(100, overall)),
    offense: offenseScore,
    defense: defenseScore,
    sustain: sustainScore,
    mapping: mappingScore,
    bossing: bossingScore,
    leagueStart: leagueStartScore,
    scaling: scalingScore,
  };
}

function detectMainSkill(build: Build): { name: string; effectiveness: number } {
  const enabledSkills = build.skills.filter((s) => s.isEnabled && s.activeGem.name);
  if (enabledSkills.length === 0) return { name: 'Unknown', effectiveness: 1.0 };

  // Pick skill with most support gems (highest link count)
  let bestSkill = enabledSkills[0]!;
  let maxLinks = 0;
  for (const skill of enabledSkills) {
    const linkCount = (skill.supportGems?.length ?? 0) + 1; // +1 for active gem
    if (linkCount > maxLinks) {
      maxLinks = linkCount;
      bestSkill = skill;
    }
  }
  return { name: bestSkill.activeGem.name, effectiveness: 1.0 };
}

export function analyze(build: Build, context?: Partial<AnalysisContext>): AnalysisResult {
  const ctx: AnalysisContext = {
    patch: context?.patch ?? '3.25',
    enemy: context?.enemy ?? { type: 'boss', resistance: 30 },
    budget: context?.budget ?? 'budget',
  };

  const resolvedStats = resolveBuildStats(
    build.items.map((item) => ({
      slot: item.slot,
      computedStats: item.computedStats,
      rawMods: item.rawMods,
    })),
  );

  const mainSkill = detectMainSkill(build);
  const offense = estimateOffense(resolvedStats, build.config, mainSkill.name, [], mainSkill.effectiveness, 0.8);
  const defense = calculateDefense(resolvedStats, build.config, build.character.level, build.character.class);

  const damageEvaluation = evaluateDamageReport(offense);
  const defenseEvaluation = evaluateDefenseReport(defense);
  const scalingEvaluation = evaluateScaling(offense, defense);
  const upgradeRecommendations = detectUpgrades(defense);

  const allProblems = [...damageEvaluation.problems, ...defenseEvaluation.problems, ...scalingEvaluation.problems];
  const allWarnings = [...damageEvaluation.warnings, ...defenseEvaluation.warnings, ...scalingEvaluation.warnings];

  const scores = computeScores(offense, defense, allProblems);

  const summary: BuildSummary = {
    buildName: build.name,
    game: build.game,
    class: build.character.class,
    ascendancy: build.character.ascendancy ?? '',
    level: build.character.level,
    mainSkill: mainSkill.name,
  };

  const metadata: AnalysisMetadata = {
    analyzerVersion: ANALYZER_VERSION,
    calculationVersion: CALCULATION_VERSION,
    patchVersion: ctx.patch,
    analyzedAt: Date.now(),
    buildHash: hashBuild(build),
  };

  return {
    build: summary,
    facts: {
      offense,
      defense,
      scaling: scalingEvaluation.report,
    },
    insights: {
      problems: allProblems,
      warnings: allWarnings,
      recommendations: upgradeRecommendations,
    },
    scores,
    metadata,
  };
}
