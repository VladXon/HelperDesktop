import * as React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Calendar, X } from '@phosphor-icons/react';

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
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Calendar size={14} />
            {value ? new Date(value).toLocaleString() : 'Напоминание'}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72">
          <div className="flex flex-col gap-2">
            <Label>Дата и время</Label>
            <Input
              type="datetime-local"
              value={toLocalInput(value)}
              onChange={(e) => onChange(fromInput(e.target.value))}
            />
            <Button variant="ghost" size="sm" onClick={() => onChange(null)} className="self-start">
              Очистить
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      {value ? (
        <Button variant="ghost" size="icon" onClick={() => onChange(null)} title="Очистить">
          <X size={14} />
        </Button>
      ) : null}
    </div>
  );
}
