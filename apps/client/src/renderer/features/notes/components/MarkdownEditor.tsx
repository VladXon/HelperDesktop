import type * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MarkdownView } from './MarkdownView';

export function MarkdownEditor({ value, onChange }: { value: string; onChange: (v: string) => void }): React.JSX.Element {
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const editBtnRef = useRef<HTMLButtonElement>(null);
  const previewBtnRef = useRef<HTMLButtonElement>(null);
  const [indicator, setIndicator] = useState<{ width: number; left: number }>({ width: 0, left: 0 });

  const updateIndicator = useCallback((t: 'edit' | 'preview') => {
    const btn = t === 'edit' ? editBtnRef.current : previewBtnRef.current;
    if (btn) {
      setIndicator({ width: btn.offsetWidth, left: btn.offsetLeft });
    }
  }, []);

  useEffect(() => { updateIndicator(tab); }, [tab, updateIndicator]);

  return (
    <div className="w-full rounded-lg border border-white/[0.06] bg-black/20 overflow-hidden">
      <div className="relative flex items-center gap-0.5 px-2 py-2">
        <div className="relative flex">
          <button
            ref={editBtnRef}
            type="button"
            onClick={() => setTab('edit')}
            className={`relative z-10 px-3 py-1 text-xs font-medium rounded-sm transition-colors ${
              tab === 'edit' ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            Редактор
          </button>
          <button
            ref={previewBtnRef}
            type="button"
            onClick={() => setTab('preview')}
            className={`relative z-10 px-3 py-1 text-xs font-medium rounded-sm transition-colors ${
              tab === 'preview' ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            Предпросмотр
          </button>
          <div
            className="absolute top-0 left-0 h-full bg-white/[0.08] rounded-sm -z-0 transition-all duration-150 ease-out"
            style={{ width: indicator.width, transform: `translateX(${indicator.left}px)` }}
          />
        </div>
      </div>
      <div className="relative">
        {tab === 'edit' ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder=""
            rows={10}
            className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted/25 font-mono leading-relaxed resize-none border-none px-4 py-3 focus:outline-none focus-visible:outline-none focus:shadow-none"
          />
        ) : (
          <div className="min-h-[200px] px-4 py-3">
            {value.trim() ? (
              <MarkdownView source={value} />
            ) : (
              <div className="text-sm text-text-muted/40 italic">Ничего не написано</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
