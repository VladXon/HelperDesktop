import type * as React from 'react';
import { Clock, X } from '@phosphor-icons/react';
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover';
import { Button } from '../../../components/ui/button';

export function ReminderPicker({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }): React.JSX.Element {
  const format = (ts: number): string => {
    const d = new Date(ts);
    const pad = (n: number): string => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const toLocalInput = (ts: number | null): string => (ts ? format(ts) : '');

  const fromInput = (v: string): number | null => {
    if (!v) return null;
    const ts = new Date(v).getTime();
    return Number.isFinite(ts) ? ts : null;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
        >
          <Clock size={14} />
          {value ? (
            <span>{new Date(value).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
          ) : (
            <span>Напоминание</span>
          )}
          {value ? (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
              className="ml-1 opacity-40 hover:opacity-100 transition-opacity"
            >
              <X size={10} weight="bold" />
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3">
        <div className="flex flex-col gap-2">
          <input
            type="datetime-local"
            value={toLocalInput(value)}
            onChange={(e) => onChange(fromInput(e.target.value))}
            className="rounded-md border border-white/[0.06] bg-black/20 px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent/50 transition-colors"
          />
          <div className="flex gap-1.5">
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)} className="text-xs">
              Очистить
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
