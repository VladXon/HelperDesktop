import type * as React from 'react';
import type { RecommendationData } from '../types';
import { ArrowUp } from '@phosphor-icons/react';

interface RecommendationsPanelProps {
  recommendations: RecommendationData[];
}

const slotLabels: Record<string, string> = {
  helm: 'Helmet', amulet: 'Amulet', chest: 'Body Armour',
  ring1: 'Ring 1', ring2: 'Ring 2', belt: 'Belt',
  gloves: 'Gloves', boots: 'Boots', mainHand: 'Weapon', offHand: 'Off-hand',
  flask1: 'Flask 1', flask2: 'Flask 2', flask3: 'Flask 3', flask4: 'Flask 4', flask5: 'Flask 5',
  jewel: 'Jewel', abyss: 'Abyss Jewel',
};

export function RecommendationsPanel({ recommendations }: RecommendationsPanelProps): React.JSX.Element {
  if (recommendations.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6">
        <h3 className="text-headline-md font-semibold text-text-primary mb-4">Upgrades</h3>
        <p className="text-body-md text-text-muted">No recommendations available</p>
      </div>
    );
  }

  const sorted = [...recommendations].sort((a, b) => b.upgradePriority - a.upgradePriority);

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6">
      <h3 className="text-headline-md font-semibold text-text-primary mb-4">Upgrades</h3>
      <div className="space-y-3">
        {sorted.map((r, i) => (
          <div key={i} className="p-4 rounded-lg bg-white/[0.02] border border-white/5 hover:border-accent/20 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-body-md text-text-primary font-medium">{slotLabels[r.itemSlot] ?? r.itemSlot}</span>
                <span className="text-label-sm px-1.5 py-0.5 rounded bg-accent/10 text-accent">+{r.improvementPercent}%</span>
              </div>
              <span className="text-label-sm text-text-muted">
                {r.estimatedBudgetLow > 0 ? `${r.estimatedBudgetLow}–${r.estimatedBudgetHigh} c` : '—'}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {r.targetStats.map((stat, j) => (
                <span key={j} className="text-label-sm px-1.5 py-0.5 rounded bg-white/5 text-text-muted">{stat}</span>
              ))}
            </div>
            <div className="flex items-center gap-1 mt-2">
              <ArrowUp size={14} className="text-accent" />
              <span className="text-label-sm text-text-muted">Priority: {r.upgradePriority}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
