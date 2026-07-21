import type { OffenseReport, DefenseReport, Problem, Warning, UpgradeRecommendation, ScalingReport } from '../models/index.js';

export function evaluateDamageReport(offense: OffenseReport): { problems: Problem[]; warnings: Warning[] } {
  const problems: Problem[] = [];
  const warnings: Warning[] = [];

  if (offense.totalDps < 100000) {
    problems.push({
      severity: 'critical',
      message: `DPS is extremely low (${formatDps(offense.totalDps)}). Review skill gem links and weapon.`,
      category: 'damage',
    });
  } else if (offense.totalDps < 500000) {
    problems.push({
      severity: 'high',
      message: `DPS is below mapping threshold (${formatDps(offense.totalDps)}). Needs significant upgrades.`,
      category: 'damage',
    });
  } else if (offense.totalDps < 1000000) {
    warnings.push({
      message: `DPS is adequate for basic mapping (${formatDps(offense.totalDps)}), but low for endgame.`,
      category: 'damage',
    });
  }

  if (offense.penetration < 5 && !offense.isDotBuild) {
    warnings.push({
      message: 'Low or no elemental penetration. Consider adding penetration support gems or Exposure. ' +
        'Enemies with high resistances will significantly reduce your damage.',
      category: 'damage',
    });
  }

  if (offense.critChance > 0.3 && offense.critMultiplier < 2.0) {
    warnings.push({
      message: `Invested in crit chance (${(offense.critChance * 100).toFixed(1)}%) but crit multiplier is low (${(offense.critMultiplier * 100).toFixed(0)}%). ` +
        'Consider adding crit multiplier sources.',
      category: 'damage',
    });
  }

  if (offense.critChance < 0.1 && offense.critMultiplier < 0.5) {
    warnings.push({
      message: 'Non-crit build with no crit investment — this is fine for DoT or Elemental Overload builds.',
      category: 'damage',
    });
  }

  if (offense.bossDps < 300000) {
    problems.push({
      severity: 'medium',
      message: `Boss DPS is low (${formatDps(offense.bossDps)}). Boss fights will take significantly longer.`,
      category: 'damage',
    });
  }

  return { problems, warnings };
}

export function evaluateDefenseReport(defense: DefenseReport): { problems: Problem[]; warnings: Warning[] } {
  const problems: Problem[] = [];
  const warnings: Warning[] = [];

  const resCheck = [
    { name: 'Fire', stats: defense.resistances.fire },
    { name: 'Cold', stats: defense.resistances.cold },
    { name: 'Lightning', stats: defense.resistances.lightning },
  ];

  for (const { name, stats } of resCheck) {
    if (stats.capped < 75) {
      problems.push({
        severity: 'critical',
        message: `${name} resistance is below cap (${stats.capped}%). Must reach 75% minimum.`,
        category: 'defense',
      });
    } else if (stats.capped < 76) {
      warnings.push({
        message: `${name} resistance is at the minimum cap. Overcap to 100%+ to be safe against curses and exposure.`,
        category: 'defense',
      });
    }
  }

  if (defense.resistances.chaos.capped < 0) {
    warnings.push({
      message: `Negative chaos resistance (${defense.resistances.chaos.capped}%). Chaos damage is dangerous in endgame.`,
      category: 'defense',
    });
  } else if (defense.resistances.chaos.capped < 30) {
    warnings.push({
      message: `Low chaos resistance (${defense.resistances.chaos.capped}%). Aim for at least 30-40%.`,
      category: 'defense',
    });
  }

  if (defense.life < 3000) {
    problems.push({
      severity: 'critical',
      message: `Life is critically low (${defense.life}). Minimum 3000 needed for mapping.`,
      category: 'defense',
    });
  } else if (defense.life < 4500) {
    problems.push({
      severity: 'high',
      message: `Life is low (${defense.life}). Aim for 4500+ for red maps.`,
      category: 'defense',
    });
  } else if (defense.life < 5500) {
    warnings.push({
      message: `Life is acceptable (${defense.life}) but 5500+ recommended for endgame bosses.`,
      category: 'defense',
    });
  }

  const totalPool = defense.combinedPool;
  if (totalPool < 4000) {
    problems.push({
      severity: 'critical',
      message: `Combined HP pool is critically low (${totalPool}). Will die to most hits in yellow+ maps.`,
      category: 'defense',
    });
  }

  if (defense.armour < 5000 && defense.physicalReduction < 10) {
    warnings.push({
      message: `Low physical mitigation (${defense.physicalReduction}% reduction). Consider armour gear, Determination aura, or Granite Flask.`,
      category: 'defense',
    });
  }

  if (defense.spellSuppression < 50) {
    warnings.push({
      message: `Low spell suppression (${defense.spellSuppression}%). Spell damage is deadly in endgame. Suppression cap is extremely valuable.`,
      category: 'defense',
    });
  }

  if (defense.ehp.physicalMaxHit < 5000) {
    problems.push({
      severity: 'high',
      message: `Physical max hit is low (${defense.ehp.physicalMaxHit}). Vulnerable to one-shots from physical bosses.`,
      category: 'defense',
    });
  }

  if (defense.ehp.elementalMaxHit < 10000) {
    warnings.push({
      message: `Elemental max hit is low (${defense.ehp.elementalMaxHit}). Susceptible to elemental burst damage.`,
      category: 'defense',
    });
  }

  return { problems, warnings };
}

export function evaluateScaling(
  offense: OffenseReport,
  defense: DefenseReport,
): { problems: Problem[]; warnings: Warning[]; report: ScalingReport } {
  const problems: Problem[] = [];
  const warnings: Warning[] = [];

  const primary = offense.critChance > 0.3 ? 'critical' : 'flat_damage';

  const secondary: string[] = [];
  if (offense.attackSpeed > 1.5) secondary.push('attack_speed');
  if (offense.critMultiplier > 2.0) secondary.push('crit_multi');
  if (offense.penetration > 20) secondary.push('penetration');

  const diminishingReturns: string[] = [];
  if (offense.critChance > 0.8) diminishingReturns.push('crit_chance');
  if (offense.penetration > 50) diminishingReturns.push('penetration');
  if (defense.evadeChance > 85) diminishingReturns.push('evasion');
  if (defense.physicalReduction > 85) diminishingReturns.push('armour');

  return {
    problems,
    warnings,
    report: {
      primaryScalar: primary,
      secondaryScalars: secondary,
      diminishingReturns,
      gemLevelImpact: 1.0,
      criticalScalingEfficiency: offense.critChance > 0.2 ? 0.7 : 0.2,
    },
  };
}

export function detectUpgrades(
  defense: DefenseReport,
): UpgradeRecommendation[] {
  const recommendations: UpgradeRecommendation[] = [];

  const priorityDefense = defense.resistances.fire.capped < 75 ||
    defense.resistances.cold.capped < 75 ||
    defense.resistances.lightning.capped < 75;

  if (priorityDefense) {
    const lowRes = [];
    if (defense.resistances.fire.capped < 75) lowRes.push('fire resistance');
    if (defense.resistances.cold.capped < 75) lowRes.push('cold resistance');
    if (defense.resistances.lightning.capped < 75) lowRes.push('lightning resistance');

    recommendations.push({
      itemSlot: 'helm',
      currentScore: 0,
      upgradePriority: 10,
      targetStats: lowRes,
      estimatedBudgetLow: 1,
      estimatedBudgetHigh: 10,
      improvementPercent: 100,
    });
  }

  if (defense.life < 4500) {
    recommendations.push({
      itemSlot: 'chest',
      currentScore: 30,
      upgradePriority: 9,
      targetStats: ['+90+ maximum life', 'life modifiers'],
      estimatedBudgetLow: 2,
      estimatedBudgetHigh: 30,
      improvementPercent: 25,
    });
  }

  if (defense.ehp.physicalMaxHit < 8000) {
    recommendations.push({
      itemSlot: 'chest',
      currentScore: 40,
      upgradePriority: 7,
      targetStats: ['armour', 'physical damage reduction', 'Determination'],
      estimatedBudgetLow: 5,
      estimatedBudgetHigh: 50,
      improvementPercent: 20,
    });
  }

  if (defense.spellSuppression < 90) {
    recommendations.push({
      itemSlot: 'gloves',
      currentScore: 45,
      upgradePriority: 6,
      targetStats: ['spell suppression', 'life'],
      estimatedBudgetLow: 3,
      estimatedBudgetHigh: 40,
      improvementPercent: 15,
    });
  }

  return recommendations.sort((a, b) => b.upgradePriority - a.upgradePriority);
}

function formatDps(dps: number): string {
  if (dps >= 1_000_000) return `${(dps / 1_000_000).toFixed(1)}M`;
  if (dps >= 1_000) return `${(dps / 1_000).toFixed(0)}K`;
  return String(Math.round(dps));
}
