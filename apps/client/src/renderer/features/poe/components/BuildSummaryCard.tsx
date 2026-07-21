import type * as React from 'react';
import type { BuildSummaryData } from '../types';

interface BuildSummaryCardProps {
  build: BuildSummaryData;
  modifierCount: number;
}

export function BuildSummaryCard({ build, modifierCount }: BuildSummaryCardProps): React.JSX.Element {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-headline-md font-semibold text-text-primary">{build.name}</h2>
        <span className="text-label-sm text-text-muted bg-white/5 px-2 py-0.5 rounded">{modifierCount} modifiers</span>
      </div>
      <div className="flex gap-6 text-body-md">
        <div className="flex items-center gap-2">
          <span className="text-text-muted">Class</span>
          <span className="text-text-primary">{build.ascendancy || build.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-text-muted">Level</span>
          <span className="text-text-primary font-mono">{build.level}</span>
        </div>
      </div>
    </div>
  );
}
