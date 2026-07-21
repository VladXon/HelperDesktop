import type * as React from 'react';
import type { ProblemData } from '../types';
import { WarningCircle, XCircle, Info } from '@phosphor-icons/react';

interface ProblemsPanelProps {
  problems: ProblemData[];
}

const severityConfig: Record<ProblemData['severity'], { icon: typeof WarningCircle; color: string; bg: string }> = {
  critical: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10' },
  high: { icon: WarningCircle, color: 'text-orange-400', bg: 'bg-orange-400/10' },
  medium: { icon: WarningCircle, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  low: { icon: Info, color: 'text-text-muted', bg: 'bg-white/5' },
};

export function ProblemsPanel({ problems }: ProblemsPanelProps): React.JSX.Element {
  if (problems.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6">
        <h3 className="text-headline-md font-semibold text-text-primary mb-4">Problems</h3>
        <p className="text-body-md text-text-muted">No issues detected</p>
      </div>
    );
  }

  const sorted = [...problems].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[a.severity] - order[b.severity];
  });

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6">
      <h3 className="text-headline-md font-semibold text-text-primary mb-4">
        Problems <span className="text-label-sm text-text-muted ml-2">({problems.length})</span>
      </h3>
      <div className="space-y-2">
        {sorted.map((p, i) => {
          const cfg = severityConfig[p.severity];
          return (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${cfg.bg}`}>
              <cfg.icon size={18} className={`${cfg.color} mt-0.5 shrink-0`} />
              <div className="flex-1 min-w-0">
                <span className={`text-label-sm ${cfg.color} uppercase`}>{p.severity}</span>
                <p className="text-body-md text-text-primary mt-0.5">{p.message}</p>
                <span className="text-label-sm text-text-muted">{p.category}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
