import type { StatValue } from '../models/stat.model.js';

export interface ResolvedFlat {
  [stat: string]: number;
}

export interface ResolvedIncreased {
  [stat: string]: number;
}

export interface ResolvedMore {
  [stat: string]: number;
}

export interface ConversionEntry {
  from: string;
  to: string;
  percent: number;
}

export interface ResolvedModifiers {
  flat: ResolvedFlat;
  increased: ResolvedIncreased;
  more: ResolvedMore;
  conversions: ConversionEntry[];
  rawModifiers: StatValue[];
}

export function resolveModifiers(rawValues: StatValue[]): ResolvedModifiers {
  const flat: ResolvedFlat = {};
  const increased: ResolvedIncreased = {};
  const more: ResolvedMore = {};
  const conversions: ConversionEntry[] = [];

  for (const sv of rawValues) {
    switch (sv.type) {
      case 'flat':
        flat[sv.name] = (flat[sv.name] ?? 0) + sv.value;
        break;
      case 'increased':
        increased[sv.name] = (increased[sv.name] ?? 0) + sv.value;
        break;
      case 'more':
        more[sv.name] = (more[sv.name] ?? 1) * (1 + sv.value / 100);
        break;
      case 'conversion': {
        const parts = sv.name.split('_to_');
        if (parts.length === 2) {
          conversions.push({ from: parts[0]!, to: parts[1]!, percent: sv.value });
        }
        break;
      }
    }
  }

  return { flat, increased, more, conversions, rawModifiers: rawValues };
}

export function applyIncreased(base: number, increasedPct: number): number {
  return base * (1 + increasedPct / 100);
}

export function applyMore(base: number, moreMultiplier: number): number {
  return base * moreMultiplier;
}
