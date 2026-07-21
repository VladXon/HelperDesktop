import type { Problem, UpgradeRecommendation, OffenseReport, DefenseReport } from '../models/index.js';

export interface ProblemExplanation {
  problem: Problem;
  detail: string;
  fix: string;
  priority: number;
}

export function explainProblem(problem: Problem, context: { offense: OffenseReport; defense: DefenseReport }): ProblemExplanation {
  const templates: Record<string, (p: Problem, ctx: typeof context) => { detail: string; fix: string; priority: number }> = {
    damage: (p) => ({
      detail: `Your build deals ${formatNumber(context.offense.totalDps)} DPS which is below thresholds for current content. You may struggle against map bosses and rares.`,
      fix: 'Upgrade your weapon, add more support gems, or invest in damage nodes on the passive tree. Ensure your main skill is 6-linked.',
      priority: p.severity === 'critical' ? 10 : p.severity === 'high' ? 8 : 5,
    }),
    defense: (p) => {
      if (p.message.includes('resistance')) {
        return {
          detail: `Elemental resistances are the most important defensive layer in Path of Exile. At 75%, you take only 25% of the damage. Below 75%, you take significantly more.`,
          fix: 'Replace gear pieces with resistance rolls. Use Purity of Elements aura. Craft resistances with your crafting bench.',
          priority: 10,
        };
      }
      if (p.message.includes('Life')) {
        return {
          detail: `Low life pool makes you vulnerable to one-shots. For red maps, aim for at least 4500 life or equivalent combined pool.`,
          fix: 'Upgrade body armour and other gear slots for higher life rolls. Consider hybrid life/ES if going that route.',
          priority: 8,
        };
      }
      return {
        detail: `Your build has defensive gaps that will cause problems in harder content.`,
        fix: 'Balance your defensive layers: resistances, life pool, armour/evasion, and recovery.',
        priority: 6,
      };
    },
    default: () => ({
      detail: 'This issue affects your build performance.',
      fix: 'Address this issue by reviewing your gear and passive tree.',
      priority: 4,
    }),
  };

  const handler = templates[problem.category] ?? templates['default']!;
  const result = handler(problem, context);
  return { problem: { ...problem, severity: problem.severity }, ...result };
}

export function explainRecommendation(rec: UpgradeRecommendation): string {
  const budgetLabel = rec.estimatedBudgetLow === rec.estimatedBudgetHigh
    ? `${rec.estimatedBudgetLow}c`
    : `${rec.estimatedBudgetLow}-${rec.estimatedBudgetHigh}c`;

  const slotNames: Record<string, string> = {
    helm: 'Helmet',
    amulet: 'Amulet',
    chest: 'Body Armour',
    ring1: 'Ring',
    ring2: 'Ring',
    belt: 'Belt',
    gloves: 'Gloves',
    boots: 'Boots',
    mainHand: 'Weapon',
    offHand: 'Offhand',
  };

  const slotName = slotNames[rec.itemSlot] || rec.itemSlot;

  return [
    `**${slotName}** — Priority: ${rec.upgradePriority}/10`,
    `Target stats: ${rec.targetStats.join(', ')}`,
    `Expected improvement: ~${rec.improvementPercent}%`,
    `Budget: ${budgetLabel}`,
  ].join('\n');
}

export function buildRecommendationList(
  problems: Problem[],
  recommendations: UpgradeRecommendation[],
  context: { offense: OffenseReport; defense: DefenseReport },
): string[] {
  const lines: string[] = [];

  const critical = problems.filter((p) => p.severity === 'critical');
  const high = problems.filter((p) => p.severity === 'high');

  if (critical.length > 0) {
    lines.push('### CRITICAL ISSUES');
    for (const p of critical) {
      const exp = explainProblem(p, context);
      lines.push(`- **${exp.problem.message}**`);
      lines.push(`  ${exp.fix}`);
    }
  }

  if (high.length > 0) {
    lines.push('### HIGH PRIORITY');
    for (const p of high) {
      const exp = explainProblem(p, context);
      lines.push(`- ${exp.problem.message}`);
    }
  }

  if (recommendations.length > 0) {
    lines.push('### UPGRADE RECOMMENDATIONS');
    for (const rec of recommendations.slice(0, 5)) {
      lines.push(explainRecommendation(rec));
      lines.push('');
    }
  }

  return lines;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(Math.round(n));
}
