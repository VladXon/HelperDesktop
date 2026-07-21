import type * as React from 'react';
import { Brain } from '@phosphor-icons/react';

interface AIExplanationPanelProps {
  summary: string | null;
}

export function AIExplanationPanel({ summary }: AIExplanationPanelProps): React.JSX.Element {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6">
      <div className="flex items-center gap-2 mb-3">
        <Brain size={20} className="text-accent" />
        <h3 className="text-headline-md font-semibold text-text-primary">AI Explanation</h3>
      </div>
      {summary ? (
        <p className="text-body-md text-text-secondary leading-relaxed whitespace-pre-line">{summary}</p>
      ) : (
        <p className="text-body-md text-text-muted italic">No AI explanation available</p>
      )}
    </div>
  );
}
