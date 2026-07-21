import type { StatKey } from '../registry/stat-key.js';
import type { ResolvedModifier } from './modifier-pipeline.js';
import { STAT_REGISTRY } from '../registry/stat-registry.js';

function getBase(statId: string): number {
  const key: StatKey | undefined = STAT_REGISTRY[statId];
  if (!key) return 0;
  if (key.aggregation.kind === 'product') return key.defaultBase ?? 1;
  return key.defaultBase ?? 0;
}

function getCap(statId: string): number | undefined {
  const key: StatKey | undefined = STAT_REGISTRY[statId];
  if (!key) return undefined;
  if (key.aggregation.kind === 'flag') return undefined;
  return key.defaultCap;
}

function applyCap(value: number, statId: string): number {
  const cap = getCap(statId);
  if (cap === undefined) return value;
  return Math.min(value, cap);
}

export function aggregateModifiers(
  resolved: readonly ResolvedModifier[],
): Record<string, number> {
  const byStat = new Map<string, ResolvedModifier[]>();

  for (const rm of resolved) {
    const statId = rm.modifier.stat.id;
    let group = byStat.get(statId);
    if (!group) {
      group = [];
      byStat.set(statId, group);
    }
    group.push(rm);
  }

  const results: Record<string, number> = {};

  for (const [statId, mods] of byStat) {
    const key: StatKey | undefined = STAT_REGISTRY[statId];
    const aggKind = key?.aggregation.kind ?? 'sum';

    switch (aggKind) {
      case 'flag':
        results[statId] = computeFlag(mods);
        break;
      case 'override':
        results[statId] = computeOverride(mods, statId);
        break;
      case 'maximum':
        results[statId] = computeMaximum(mods, statId);
        break;
      case 'product':
        results[statId] = computeProduct(mods, statId);
        break;
      case 'sum':
      default:
        results[statId] = computeSum(mods, statId);
        break;
    }
  }

  return results;
}

function groupByType(mods: readonly ResolvedModifier[]) {
  const flats: number[] = [];
  const increased: number[] = [];
  const mores: number[] = [];
  const lesses: number[] = [];
  const overrides: number[] = [];

  for (const rm of mods) {
    switch (rm.modifier.type) {
      case 'flat':
        flats.push(rm.effectiveValue);
        break;
      case 'increased':
        increased.push(rm.effectiveValue);
        break;
      case 'more':
        mores.push(rm.effectiveValue);
        break;
      case 'less':
        lesses.push(rm.effectiveValue);
        break;
      case 'override':
        overrides.push(rm.effectiveValue);
        break;
    }
  }

  return { flats, increased, mores, lesses, overrides };
}

function computeSum(mods: readonly ResolvedModifier[], statId: string): number {
  const { flats, increased, mores, lesses, overrides } = groupByType(mods);

  if (overrides.length > 0) {
    return applyCap(Math.max(...overrides), statId);
  }

  const base = getBase(statId);
  const flatSum = flats.reduce((a, b) => a + b, 0);
  const incSum = increased.reduce((a, b) => a + b, 0);
  const moreProd = mores.reduce((a, b) => a * (1 + b / 100), 1);
  const lessProd = lesses.reduce((a, b) => a * (1 - b / 100), 1);

  const result = (base + flatSum) * (1 + incSum / 100) * moreProd * lessProd;

  return applyCap(result, statId);
}

function computeProduct(
  mods: readonly ResolvedModifier[],
  statId: string,
): number {
  const { flats, increased, mores, lesses, overrides } = groupByType(mods);

  if (overrides.length > 0) {
    return applyCap(Math.max(...overrides), statId);
  }

  const base = getBase(statId);
  const flatSum = flats.reduce((a, b) => a + b, 0);
  const incSum = increased.reduce((a, b) => a + b, 0);
  const moreProd = mores.reduce((a, b) => a * (1 + b / 100), 1);
  const lessProd = lesses.reduce((a, b) => a * (1 - b / 100), 1);

  const result = (base + flatSum) * (1 + incSum / 100) * moreProd * lessProd;

  return applyCap(result, statId);
}

function computeMaximum(
  mods: readonly ResolvedModifier[],
  statId: string,
): number {
  const { overrides } = groupByType(mods);

  if (overrides.length > 0) {
    return applyCap(Math.max(...overrides), statId);
  }

  const base = getBase(statId);

  const computed = computeSum(mods, statId);

  return applyCap(Math.max(base, computed), statId);
}

function computeOverride(
  mods: readonly ResolvedModifier[],
  statId: string,
): number {
  const { overrides } = groupByType(mods);

  if (overrides.length > 0) {
    return applyCap(Math.max(...overrides), statId);
  }

  const base = getBase(statId);

  const computed = computeSum(mods, statId);

  return applyCap(computed, statId);
}

function computeFlag(mods: readonly ResolvedModifier[]): number {
  for (const rm of mods) {
    if (rm.effectiveValue > 0) return 1;
  }
  return 0;
}
