import type * as React from 'react';
import type { DefenseData } from '../types';

interface DefensePanelProps {
  defense: DefenseData;
}

function ResistBar({ label, value, max }: { label: string; value: number; max: number }): React.JSX.Element {
  const pct = Math.min(100, (value / max) * 100);
  const color = value >= 75 ? 'bg-green-400' : value >= 50 ? 'bg-yellow-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-3">
      <span className="text-label-sm text-text-muted w-20 text-right">{label}</span>
      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-label-sm font-mono w-12 ${value >= 75 ? 'text-green-400' : value >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{value}%</span>
    </div>
  );
}

function EhpBlock({ label, value }: { label: string; value: number }): React.JSX.Element {
  return (
    <div className="flex justify-between py-2 px-3 bg-white/[0.02] rounded">
      <span className="text-body-md text-text-muted">{label}</span>
      <span className="text-body-md text-text-primary font-mono">{formatNum(value)}</span>
    </div>
  );
}

export function DefensePanel({ defense }: DefensePanelProps): React.JSX.Element {
  const ailments = Object.entries(defense.ailmentImmunity).filter(([, v]) => v);
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6">
      <h3 className="text-headline-md font-semibold text-text-primary mb-4">Defense</h3>

      <div className="space-y-2 mb-5">
        <ResistBar label="Fire" value={defense.resistances.fire.capped} max={defense.maxResistances.fire} />
        <ResistBar label="Cold" value={defense.resistances.cold.capped} max={defense.maxResistances.cold} />
        <ResistBar label="Lightning" value={defense.resistances.lightning.capped} max={defense.maxResistances.lightning} />
        <ResistBar label="Chaos" value={defense.resistances.chaos.capped} max={75} />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <EhpBlock label="Phys Max Hit" value={defense.ehp.physicalMaxHit} />
        <EhpBlock label="Ele Max Hit" value={defense.ehp.elementalMaxHit} />
        <EhpBlock label="Chaos Max Hit" value={defense.ehp.chaosMaxHit} />
        <EhpBlock label="Phys Reduction" value={defense.physicalReduction} />
      </div>

      {ailments.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {ailments.map(([name]) => (
            <span key={name} className="text-label-sm px-2 py-0.5 rounded bg-green-400/10 text-green-400">{name}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toFixed(0);
}
