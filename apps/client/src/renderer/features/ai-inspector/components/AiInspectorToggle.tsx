import type * as React from 'react';
import { MagicWand } from '@phosphor-icons/react';
import { useAiInspector } from '../hooks/useAiInspector';

export function AiInspectorToggle(): React.JSX.Element | null {
  const { enabled, setEnabled } = useAiInspector();
  return (
    <button
      type="button"
      onClick={() => setEnabled(!enabled)}
      title={enabled ? 'Выключить AI-инспектор' : 'Включить AI-инспектор'}
      data-ai-inspector-ignore
      data-active={enabled}
      className={
        'app-no-drag flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs transition-colors ' +
        (enabled
          ? 'border-accent bg-accent/10 text-accent'
          : 'border-border bg-bg-primary text-text-muted hover:text-text-primary')
      }
    >
      <MagicWand size={14} weight={enabled ? 'fill' : 'regular'} />
      <span>AI</span>
    </button>
  );
}
