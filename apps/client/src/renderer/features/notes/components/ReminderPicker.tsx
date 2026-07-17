import type * as React from 'react';
import { useCallback } from 'react';
import { Bell, BellRinging, Clock, X } from '@phosphor-icons/react';
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover';
import { Button } from '../../../components/ui/button';

function formatDateInput(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatTimeInput(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

interface QuickOption {
  label: string;
  getValue: () => number;
}

function setTime(ts: number, hours: number, minutes: number): number {
  const d = new Date(ts);
  d.setHours(hours, minutes, 0, 0);
  return d.getTime();
}

function nextWeekday(day: number): number {
  const d = new Date();
  const current = d.getDay();
  let diff = day - current;
  if (diff <= 0) diff += 7;
  d.setDate(d.getDate() + diff);
  return d.getTime();
}

const quickOptions: QuickOption[] = [
  { label: 'Сегодня 18:00', getValue: () => setTime(Date.now(), 18, 0) },
  { label: 'Завтра 9:00', getValue: () => setTime(Date.now() + 86400000, 9, 0) },
  { label: '+1 час', getValue: () => Date.now() + 3600000 },
  { label: 'На выходных', getValue: () => setTime(nextWeekday(6), 12, 0) },
  { label: 'На неделе', getValue: () => setTime(nextWeekday(1), 9, 0) },
];

export function ReminderPicker({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }): React.JSX.Element {
  const dateStr = value ? formatDateInput(value) : '';
  const timeStr = value ? formatTimeInput(value) : '';

  const onDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const d = e.target.value;
    if (!d) { onChange(null); return; }
    const hours = value ? new Date(value).getHours() : 18;
    const minutes = value ? new Date(value).getMinutes() : 0;
    const ts = new Date(d).setHours(hours, minutes, 0, 0);
    onChange(Number.isFinite(ts) ? ts : null);
  }, [value, onChange]);

  const onTimeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const t = e.target.value;
    if (!t) { onChange(null); return; }
    const base = value ? new Date(value) : new Date();
    const [h, m] = t.split(':').map(Number);
    const ts = new Date(base).setHours(h ?? 0, m ?? 0, 0, 0);
    onChange(Number.isFinite(ts) ? ts : null);
  }, [value, onChange]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center gap-1.5 text-xs transition-colors ${value ? 'text-accent hover:text-accent-hover' : 'text-text-secondary hover:text-text-primary'}`}
        >
          {value ? <BellRinging size={14} /> : <Bell size={14} />}
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
      <PopoverContent align="start" className="w-[280px] p-3">
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              type="date"
              value={dateStr}
              onChange={onDateChange}
              className="flex-1 rounded-md border border-white/[0.06] bg-black/20 px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent/50 transition-colors [color-scheme:dark]"
            />
            <input
              type="time"
              value={timeStr}
              onChange={onTimeChange}
              className="flex-1 rounded-md border border-white/[0.06] bg-black/20 px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent/50 transition-colors [color-scheme:dark]"
            />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {quickOptions.map((opt) => (
              <Button
                key={opt.label}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange(opt.getValue())}
                className="text-xs justify-start"
              >
                <Clock size={12} className="shrink-0" />
                {opt.label}
              </Button>
            ))}
          </div>
          {value ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)} className="text-xs text-red-400 hover:text-red-300">
              Очистить
            </Button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
