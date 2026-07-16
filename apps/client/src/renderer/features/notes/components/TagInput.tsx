import * as React from 'react';
import { X } from '@phosphor-icons/react';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';

export function TagInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }): React.JSX.Element {
  const [draft, setDraft] = React.useState<string>('');

  const add = (): void => {
    const v = draft.trim();
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
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-bg-secondary px-2 py-1.5">
      {value.map((t) => (
        <Badge key={t} variant="secondary" className="gap-1">
          {t}
          <button
            type="button"
            onClick={() => onChange(value.filter((x) => x !== t))}
            className="text-text-muted hover:text-text-primary"
          >
            <X size={10} />
          </button>
        </Badge>
      ))}
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKey}
        onBlur={add}
        placeholder={value.length === 0 ? 'Добавьте тег' : ''}
        className="h-7 flex-1 min-w-[80px] border-0 bg-transparent px-1 py-0 focus-visible:ring-0"
      />
    </div>
  );
}
