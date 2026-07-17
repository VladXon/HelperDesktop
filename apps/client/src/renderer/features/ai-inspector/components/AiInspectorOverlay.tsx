import * as React from 'react';
import { X, ArrowFatUp } from '@phosphor-icons/react';
import { useAiInspector } from '../hooks/useAiInspector';
import { formatPrompt } from '../prompt-formatter';

export function AiInspectorOverlay(): React.JSX.Element | null {
  const { enabled, mousePos, hovered, hoveredInfo, pinnedInfo, clearPinned, pinParent } = useAiInspector();
  const outlinedRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!enabled || !hovered) return;

    outlinedRef.current = hovered;
    const prev = hovered.style.outline;
    const prevOffset = hovered.style.outlineOffset;
    hovered.style.outline = '2px solid #f59e0b';
    hovered.style.outlineOffset = '1px';

    return () => {
      hovered.style.outline = prev;
      hovered.style.outlineOffset = prevOffset;
    };
  }, [enabled, hovered]);

  React.useEffect(() => {
    return () => {
      if (outlinedRef.current) {
        outlinedRef.current.style.outline = '';
        outlinedRef.current.style.outlineOffset = '';
        outlinedRef.current = null;
      }
    };
  }, []);

  if (!enabled || (!hovered && !pinnedInfo)) return null;

  const displayInfo = pinnedInfo ?? hoveredInfo;

  return (
    <>
      {mousePos && hovered ? (
        <div
          className="pointer-events-none fixed z-[60] -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-black/90 px-2 py-1 text-xs text-white shadow-lg"
          style={{ left: mousePos.x, top: mousePos.y - 8 }}
        >
          {hoveredInfo?.name ?? '…'}
        </div>
      ) : null}
      <div
        data-ai-inspector-ignore
        className="fixed bottom-3 right-3 z-[60] max-w-md rounded-md border border-border bg-bg-secondary p-3 text-xs text-text-primary shadow-2xl"
      >
        <div className="mb-1 flex items-center justify-between">
          <span className="font-semibold text-accent">AI Inspector</span>
          <div className="flex items-center gap-1">
            {pinnedInfo ? (
              <>
                <button
                  type="button"
                  onClick={pinParent}
                  title="К родительскому компоненту (Alt+Click)"
                  data-ai-inspector-ignore
                  className="flex h-5 w-5 items-center justify-center rounded text-text-muted hover:bg-bg-primary hover:text-text-primary"
                >
                  <ArrowFatUp size={12} />
                </button>
                <button
                  type="button"
                  onClick={clearPinned}
                  data-ai-inspector-ignore
                  className="flex h-5 w-5 items-center justify-center rounded text-text-muted hover:bg-bg-primary hover:text-text-primary"
                >
                  <X size={12} />
                </button>
              </>
            ) : null}
          </div>
        </div>
        <div className="text-text-muted">
          {pinnedInfo
            ? 'Промт скопирован в буфер. Alt+Click — родитель.'
            : 'Кликните по элементу — промт скопируется в буфер.'}
        </div>
        {displayInfo ? (
          <pre className="mt-2 max-h-48 overflow-auto rounded bg-bg-primary p-2 font-mono text-[10px] leading-tight text-text-secondary">
            {formatPrompt(displayInfo)}
          </pre>
        ) : null}
      </div>
    </>
  );
}
