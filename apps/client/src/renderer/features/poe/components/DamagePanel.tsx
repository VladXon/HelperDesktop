import type * as React from 'react';
import type { OffenseData } from '../types';

interface DamagePanelProps {
  offense: OffenseData;
}

function DmgBar({ label, value, total }: { label: string; value: number; total: number }): React.JSX.Element | null {
  if (value <= 0) return null;
  const pct = total > 0 ? (value / total) * 100 : 0;
  const colors: Record<string, string> = {
    Physical: 'bg-amber-400',
    Fire: 'bg-red-500',
    Cold: 'bg-cyan-400',
    Lightning: 'bg-yellow-300',
    Chaos: 'bg-purple-400',
  };
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-label-sm">
        <span className="text-text-muted">{label}</span>
        <span className="text-text-primary font-mono">{formatNum(value)} ({pct.toFixed(0)}%)</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${colors[label] ?? 'bg-accent'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function DamagePanel({ offense }: DamagePanelProps): React.JSX.Element {
  const db = offense.damageBreakdown;
  const total = db.physical + db.fire + db.cold + db.lightning + db.chaos;

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6">
      <h3 className="text-headline-md font-semibold text-text-primary mb-4">Damage</h3>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatTag label="Main Skill" value={offense.mainSkill.name} />
        <StatTag label="Crit Chance" value={`${offense.critChance.toFixed(1)}%`} />
        <StatTag label="Crit Multi" value={`${offense.critMultiplier.toFixed(0)}%`} />
        <StatTag label="Attack Speed" value={offense.attackSpeed.toFixed(2)} />
        <StatTag label="Penetration" value={`${offense.penetration}%`} />
        <StatTag label="Shock Effect" value={`${offense.shockEffect}%`} />
      </div>

      <div className="space-y-2">
        <DmgBar label="Physical" value={db.physical} total={total} />
        <DmgBar label="Fire" value={db.fire} total={total} />
        <DmgBar label="Cold" value={db.cold} total={total} />
        <DmgBar label="Lightning" value={db.lightning} total={total} />
        <DmgBar label="Chaos" value={db.chaos} total={total} />
      </div>

      {offense.isDotBuild ? (
        <div className="mt-4 pt-3 border-t border-white/5">
          <span className="text-label-sm text-text-muted">DoT DPS: </span>
          <span className="text-body-md text-accent font-mono">{formatNum(offense.dotDps)}</span>
        </div>
      ) : null}
    </div>
  );
}

function StatTag({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="py-2 px-3 bg-white/[0.02] rounded border border-white/5">
      <span className="text-label-sm text-text-muted block">{label}</span>
      <span className="text-body-md text-text-primary font-mono">{value}</span>
    </div>
  );
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toFixed(0);
}
