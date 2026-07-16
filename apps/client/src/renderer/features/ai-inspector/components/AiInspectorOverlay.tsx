import * as React from 'react';
import { useEffect, useState } from 'react';
import { useAiInspector } from '../hooks/useAiInspector';
import { formatPrompt } from '../prompt-formatter';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';

export function AiInspectorOverlay(): React.JSX.Element | null {
  const { enabled, hovered, hoveredInfo, selectedInfo, clearSelected } = useAiInspector();
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!enabled || !hovered) {
      setPos(null);
      return;
    }
    const update = (): void => {
      const r = hovered.getBoundingClientRect();
      setPos({ x: r.left + r.width / 2, y: r.top });
    };
    update();
    const onMove = (): void => update();
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    const ro = new ResizeObserver(update);
    ro.observe(hovered);
    return () => {
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
      ro.disconnect();
    };
  }, [enabled, hovered]);

  useEffect(() => {
    if (!enabled || !hovered) return;
    const prev = hovered.style.outline;
    const prevOffset = hovered.style.outlineOffset;
    hovered.style.outline = '2px solid #f59e0b';
    hovered.style.outlineOffset = '1px';
    return () => {
      hovered.style.outline = prev;
      hovered.style.outlineOffset = prevOffset;
    };
  }, [enabled, hovered]);

  if (!enabled || !hovered) return null;

  return (
    <>
      {pos ? (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-black/90 px-2 py-1 text-xs text-white shadow-lg"
          style={{ left: pos.x, top: pos.y - 6 }}
        >
          {hoveredInfo?.name ?? '…'}
        </div>
      ) : null}
      <div
        aria-hidden
        className="pointer-events-none fixed bottom-3 right-3 z-50 max-w-md rounded-md border border-border bg-bg-secondary p-3 text-xs text-text-primary shadow-2xl"
      >
        <div className="mb-1 font-semibold text-accent">AI-инспектор активен</div>
        <div className="text-text-muted">Кликните по элементу — промт скопируется в буфер.</div>
        <pre className="mt-2 max-h-48 overflow-auto rounded bg-bg-primary p-2 font-mono text-[10px] leading-tight text-text-secondary">
          {hoveredInfo ? formatPrompt(hoveredInfo) : ''}
        </pre>
      </div>

      <Dialog open={selectedInfo !== null} onOpenChange={(open) => { if (!open) clearSelected(); }}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedInfo?.name ?? 'Component'}
              {selectedInfo?.file ? (
                <span className="ml-2 text-xs font-normal text-text-muted">
                  {selectedInfo.file}
                  {selectedInfo.line ? `:${selectedInfo.line}` : ''}
                </span>
              ) : null}
            </DialogTitle>
          </DialogHeader>
          <pre className="overflow-auto rounded border border-border bg-bg-primary p-3 font-mono text-xs leading-relaxed text-text-secondary">
            {selectedInfo ? formatPrompt(selectedInfo) : ''}
          </pre>
        </DialogContent>
      </Dialog>
    </>
  );
}
