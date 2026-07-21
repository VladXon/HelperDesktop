import type * as React from 'react';
import type { OffenseData, DefenseData } from '../types';

interface StatOverviewProps {
  offense: OffenseData;
  defense: DefenseData;
}

function StatBadge({ label, value, highlight }: { label: string; value: string; highlight?: boolean }): React.JSX.Element {
  return (
    <div className="flex flex-col items-center py-3 px-4 rounded-lg bg-white/[0.02] border border-white/5">
      <span className={`font-mono text-lg font-semibold ${highlight ? 'text-accent' : 'text-text-primary'}`}>{value}</span>
      <span className="text-label-sm text-text-muted mt-0.5">{label}</span>
    </div>
  );
}

export function StatOverview({ offense, defense }: StatOverviewProps): React.JSX.Element {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6">
      <h3 className="text-headline-md font-semibold text-text-primary mb-4">Overview</h3>
      <div className="grid grid-cols-4 gap-3">
        <StatBadge label="Total DPS" value={formatNumber(offense.totalDps)} highlight />
        <StatBadge label="Boss DPS" value={formatNumber(offense.bossDps)} />
        <StatBadge label="Life" value={formatNumber(defense.life)} highlight />
        <StatBadge label="ES" value={formatNumber(defense.energyShield)} />
        <StatBadge label="Armour" value={formatNumber(defense.armour)} />
        <StatBadge label="Evasion" value={formatNumber(defense.evasion)} />
        <StatBadge label="Block" value={`${defense.block.attack}%`} />
        <StatBadge label="Suppress" value={`${defense.spellSuppression}%`} />
      </div>
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toFixed(0);
}
