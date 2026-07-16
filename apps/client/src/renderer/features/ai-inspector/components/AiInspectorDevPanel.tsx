import * as React from 'react';
import { useAiInspector } from '../hooks/useAiInspector';
import { formatPrompt } from '../prompt-formatter';
import { Bug } from '@phosphor-icons/react';

export function AiInspectorDevPanel(): React.JSX.Element | null {
  const { enabled, hoveredInfo, pinnedInfo } = useAiInspector();

  if (!import.meta.env.DEV || !enabled) return null;

  const displayInfo = pinnedInfo ?? hoveredInfo;

  return (
    <details className="group mt-2 rounded-md border border-accent/20 bg-accent/5">
      <summary className="flex cursor-pointer select-none items-center gap-1.5 px-3 py-2 text-xs font-medium text-accent hover:text-accent-hover">
        <Bug size={14} />
        AI Inspector
        <span className="ml-auto text-text-muted">{pinnedInfo ? 'pinned' : hoveredInfo ? 'hover' : 'idle'}</span>
      </summary>
      <div className="border-t border-accent/10 px-3 py-2">
        {displayInfo ? (
          <pre className="max-h-32 overflow-auto rounded bg-bg-primary p-2 font-mono text-[10px] leading-tight text-text-secondary">
            {formatPrompt(displayInfo)}
          </pre>
        ) : (
          <p className="text-xs text-text-muted">Наведите на элемент или кликните для копирования промта.</p>
        )}
      </div>
    </details>
  );
}
