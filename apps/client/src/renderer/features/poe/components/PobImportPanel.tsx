import type * as React from 'react';
import { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Spinner } from '@phosphor-icons/react';

interface PobImportPanelProps {
  onAnalyze: (url: string) => void;
  loading: boolean;
}

export function PobImportPanel({ onAnalyze, loading }: PobImportPanelProps): React.JSX.Element {
  const [url, setUrl] = useState<string>('');

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    onAnalyze(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <div className="glass-input rounded-lg flex items-center h-10 px-4 flex-1 group">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://pobb.in/..."
          disabled={loading}
          className="bg-transparent border-none outline-none text-body-md w-full text-text-primary placeholder:text-text-muted/40 p-0 focus:ring-0"
        />
      </div>
      <Button type="submit" disabled={loading || !url.trim()} className="gap-2 shadow-[0_0_20px_rgba(139,92,246,0.3)]">
        {loading ? <Spinner size={18} className="animate-spin" /> : null}
        Analyze Build
      </Button>
    </form>
  );
}
