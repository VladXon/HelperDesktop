import * as React from 'react';
import { X } from '@phosphor-icons/react';

const TAG_COLORS = [
  { dot: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  { dot: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
  { dot: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  { dot: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  { dot: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  { dot: '#ec4899', bg: 'rgba(236,72,153,0.12)' },
  { dot: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  { dot: '#34d399', bg: 'rgba(52,211,153,0.12)' },
];

function tagColor(tag: string): { dot: string; bg: string } {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = ((hash << 5) - hash) + tag.charCodeAt(i);
    hash |= 0;
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]!;
}

export function TagInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }): React.JSX.Element {
  const [draft, setDraft] = React.useState<string>('');
  const [focused, setFocused] = React.useState<boolean>(false);

  const add = (): void => {
    const v = draft.trim().toLowerCase();
    if (!v) return;
    if (value.includes(v)) {
      setDraft('');
      return;
    }
    if (value.length >= 10) return;
    onChange([...value, v]);
    setDraft('');
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add();
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 rounded-lg border px-3 py-2 transition-all ${
        focused
          ? 'border-accent/50 bg-black/30'
          : 'border-white/[0.06] bg-black/20'
      }`}
    >
      {value.map((t) => {
        const c = tagColor(t);
        return (
          <span
            key={t}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium"
            style={{ backgroundColor: c.bg, color: c.dot }}
          >
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: c.dot }} />
            {t}
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x !== t))}
              className="ml-0.5 rounded-sm opacity-50 hover:opacity-100 transition-opacity"
            >
              <X size={10} weight="bold" />
            </button>
          </span>
        );
      })}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKey}
        onBlur={() => { setFocused(false); add(); }}
        onFocus={() => setFocused(true)}
        placeholder={value.length === 0 ? 'Добавить тег' : ''}
        className="h-6 flex-1 min-w-[80px] bg-transparent text-xs text-text-primary placeholder:text-text-muted/30 outline-none border-none p-0 m-0"
      />
    </div>
  );
}
