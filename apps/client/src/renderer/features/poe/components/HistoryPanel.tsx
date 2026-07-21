import type * as React from 'react';
import { useState, useEffect } from 'react';
import { Trash, Scales } from '@phosphor-icons/react';

interface BuildListItem {
  id: number;
  buildHash: string;
  name: string | null;
  characterClass: string | null;
  ascendancy: string | null;
  level: number | null;
  overallScore: number | null;
  lastAnalyzedAt: string | null;
  createdAt: string;
}

interface HistoryPanelProps {
  onSelect: (hash: string) => void;
  onCompare: (hash: string) => void;
  selectedForCompare: string | null;
}

export function HistoryPanel({ onSelect, onCompare, selectedForCompare }: HistoryPanelProps): React.JSX.Element {
  const [builds, setBuilds] = useState<BuildListItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadBuilds = async () => {
    setLoading(true);
    try {
      const list = await window.api.poe.listBuilds();
      setBuilds(list as BuildListItem[]);
    } catch {
      void 0;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBuilds();
  }, []);

  const handleDelete = async (hash: string) => {
    try {
      await window.api.poe.deleteBuild(hash);
      setBuilds((prev) => prev.filter((b) => b.buildHash !== hash));
    } catch {
      void 0;
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6">
        <h3 className="text-headline-md font-semibold text-text-primary mb-4">Saved Builds</h3>
        <p className="text-body-md text-text-muted animate-pulse">Loading...</p>
      </div>
    );
  }

  if (builds.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6">
        <h3 className="text-headline-md font-semibold text-text-primary mb-4">Saved Builds</h3>
        <p className="text-body-md text-text-muted">No saved builds yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6">
      <h3 className="text-headline-md font-semibold text-text-primary mb-4">
        Saved Builds <span className="text-label-sm text-text-muted ml-2">({builds.length})</span>
      </h3>
      <div className="space-y-2">
        {builds.map((b) => (
          <div
            key={b.buildHash}
            className={`p-3 rounded-lg border transition-colors cursor-pointer ${
              selectedForCompare === b.buildHash
                ? 'border-accent/50 bg-accent/5'
                : 'border-white/5 bg-white/[0.02] hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <button
                type="button"
                className="flex-1 text-left"
                onClick={() => onSelect(b.buildHash)}
              >
                <span className="text-body-md text-text-primary font-medium">
                  {b.name ?? b.characterClass ?? 'Unknown'}
                  {b.ascendancy ? ` — ${b.ascendancy}` : ''}
                </span>
                <div className="flex gap-3 text-label-sm text-text-muted mt-0.5">
                  <span>Level {b.level ?? '?'}</span>
                  {b.overallScore != null ? <span>Score: {b.overallScore}</span> : null}
                  <span>{new Date(b.createdAt).toLocaleDateString()}</span>
                </div>
              </button>
              <div className="flex gap-1 ml-2">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onCompare(b.buildHash); }}
                  className="p-1.5 rounded hover:bg-accent/10 text-text-muted hover:text-accent transition-colors"
                  title="Compare"
                >
                  <Scales size={16} />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDelete(b.buildHash); }}
                  className="p-1.5 rounded hover:bg-red-400/10 text-text-muted hover:text-red-400 transition-colors"
                  title="Delete"
                >
                  <Trash size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
