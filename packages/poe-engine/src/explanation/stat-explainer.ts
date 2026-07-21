import type { StatKey } from '../registry/stat-key.js';
import type { ModifierSnapshot } from '../moddb/modifier-snapshot.js';
import type { ConditionState } from '../conditions/condition-expr.js';
import type { ComputedStats } from '../calculator/computed-stats.js';
import type { StatExplanation, ValueSource } from './explanation-types.js';
import { resolveModifiers } from '../modifiers/modifier-pipeline.js';
import type { ResolvedModifier } from '../modifiers/modifier-pipeline.js';
import { STAT_REGISTRY } from '../registry/stat-registry.js';

function getBase(statId: string): number {
  const key = STAT_REGISTRY[statId];
  if (!key) return 0;
  if (key.aggregation.kind === 'product') return key.defaultBase ?? 1;
  return key.defaultBase ?? 0;
}

function fmt(n: number): string {
  if (Number.isInteger(n)) return String(n);
  const rounded = Math.round(n * 10) / 10;
  return String(rounded);
}

export function explainStat(
  stat: StatKey,
  snapshot: ModifierSnapshot,
  conditionState: ConditionState,
  computedStats: ComputedStats,
): StatExplanation {
  const finalValue = computedStats.get(stat);
  const statMods = snapshot.modifiers.filter((m) => m.stat.id === stat.id);
  const resolved = resolveModifiers(statMods, conditionState);

  const {
    flatContributions,
    increasedContributions,
    moreContributions,
    lessContributions,
    overrideContributions,
  } = groupByType(resolved);

  const base = getBase(stat.id);
  const formula = buildFormula(
    base,
    flatContributions,
    increasedContributions,
    moreContributions,
    lessContributions,
    overrideContributions,
  );

  const explanation = generateExplanation(
    stat,
    base,
    flatContributions,
    increasedContributions,
    moreContributions,
    lessContributions,
    overrideContributions,
  );

  return {
    stat,
    value: finalValue,
    explanation,
    breakdown: {
      base,
      flatContributions,
      increasedContributions,
      moreContributions,
      lessContributions,
      overrideContributions,
      formula,
    },
  };
}

export function explainAllStats(
  snapshot: ModifierSnapshot,
  conditionState: ConditionState,
  computedStats: ComputedStats,
): StatExplanation[] {
  const statIds = new Set<string>();
  for (const mod of snapshot.modifiers) {
    statIds.add(mod.stat.id);
  }

  const explanations: StatExplanation[] = [];
  for (const statId of statIds) {
    const statKey = STAT_REGISTRY[statId];
    if (!statKey) continue;
    explanations.push(explainStat(statKey, snapshot, conditionState, computedStats));
  }

  explanations.sort((a, b) => a.stat.category.localeCompare(b.stat.category));

  return explanations;
}

function groupByType(resolved: readonly ResolvedModifier[]) {
  const flatContributions: ValueSource[] = [];
  const increasedContributions: ValueSource[] = [];
  const moreContributions: ValueSource[] = [];
  const lessContributions: ValueSource[] = [];
  const overrideContributions: ValueSource[] = [];

  for (const rm of resolved) {
    const source: ValueSource = {
      source: rm.modifier.source,
      value: rm.effectiveValue,
      label: rm.modifier.meta.name,
    };

    switch (rm.modifier.type) {
      case 'flat':
        flatContributions.push(source);
        break;
      case 'increased':
        increasedContributions.push(source);
        break;
      case 'more':
        moreContributions.push(source);
        break;
      case 'less':
        lessContributions.push(source);
        break;
      case 'override':
        overrideContributions.push(source);
        break;
    }
  }

  return {
    flatContributions,
    increasedContributions,
    moreContributions,
    lessContributions,
    overrideContributions,
  };
}

function buildFormula(
  base: number,
  flats: readonly ValueSource[],
  increased: readonly ValueSource[],
  mores: readonly ValueSource[],
  lesses: readonly ValueSource[],
  overrides: readonly ValueSource[],
): string {
  if (overrides.length > 0) {
    const vals = overrides.map((s) => fmt(s.value)).join(', ');
    return `override(max(${vals}))`;
  }

  const flatSum = flats.reduce((a, b) => a + b.value, 0);
  const incSum = increased.reduce((a, b) => a + b.value, 0);

  const baseStr = fmt(base);
  const flatStr = flatSum >= 0 ? `+${fmt(flatSum)}` : fmt(flatSum);
  let inner = flatSum !== 0 ? `(${baseStr} ${flatStr})` : baseStr;

  if (incSum !== 0) {
    const sign = incSum > 0 ? '+' : '';
    inner += ` × (1 ${sign}${fmt(incSum)}%)`;
  }

  for (const more of mores) {
    const sign = more.value > 0 ? '+' : '';
    inner += ` × (1 ${sign}${more.value}%)`;
  }

  for (const less of lesses) {
    inner += ` × (1 -${less.value}%)`;
  }

  return inner;
}

function generateExplanation(
  stat: StatKey,
  base: number,
  flats: readonly ValueSource[],
  increased: readonly ValueSource[],
  mores: readonly ValueSource[],
  lesses: readonly ValueSource[],
  overrides: readonly ValueSource[],
): string {
  if (overrides.length > 0) {
    const names = overrides.map((s) => s.label).join(', ');
    return `${stat.displayName} is overridden to ${fmt(overrides[0]!.value)} by ${names}`;
  }

  const parts: string[] = [];

  if (base > 0) {
    parts.push(`${fmt(base)} base ${stat.displayName.toLowerCase()}`);
  }

  const flatSum = flats.reduce((a, b) => a + b.value, 0);
  if (flatSum > 0 && flats.length > 0) {
    const labels = uniqueLabels(flats);
    parts.push(`+${fmt(flatSum)} flat from ${labels}`);
  } else if (flatSum < 0) {
    const labels = uniqueLabels(flats);
    parts.push(`${fmt(flatSum)} flat from ${labels}`);
  }

  const incSum = increased.reduce((a, b) => a + b.value, 0);
  if (incSum > 0) {
    const labels = uniqueLabels(increased);
    parts.push(`+${fmt(incSum)}% increased from ${labels}`);
  } else if (incSum < 0) {
    const labels = uniqueLabels(increased);
    parts.push(`${fmt(incSum)}% increased from ${labels}`);
  }

  for (const more of mores) {
    const sign = more.value > 0 ? '+' : '';
    parts.push(`${sign}${more.value}% more from ${more.label}`);
  }

  for (const less of lesses) {
    const sign = less.value > 0 ? '+' : '';
    parts.push(`${sign}${less.value}% less from ${less.label}`);
  }

  if (parts.length === 0) {
    return `${stat.displayName}: ${fmt(stat.defaultBase ?? 0)} (no modifiers)`;
  }

  return `${stat.displayName}: ${parts.join(', ')}`;
}

function uniqueLabels(sources: readonly ValueSource[]): string {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const s of sources) {
    if (!seen.has(s.label)) {
      seen.add(s.label);
      names.push(s.label);
    }
  }
  return names.join(', ');
}
