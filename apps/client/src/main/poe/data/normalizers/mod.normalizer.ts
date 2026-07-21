import type { PoeModifierRecord } from '@helper/shared';

interface ExternalModDTO {
  name?: string;
  domain?: string;
  generationType?: string;
  values?: number[];
  tags?: string[];
  tiers?: number[];
}

export function normalizeMod(raw: ExternalModDTO): PoeModifierRecord {
  return {
    name: (raw.name ?? '').trim(),
    domain: (raw.domain ?? 'item').trim(),
    generationType: (raw.generationType ?? 'prefix').trim(),
    values: raw.values ?? [],
    tags: raw.tags ?? [],
    tiers: raw.tiers ?? [],
  };
}

export function normalizeMods(rawMods: ExternalModDTO[]): PoeModifierRecord[] {
  return rawMods
    .filter((raw) => Boolean((raw.name ?? '').trim()))
    .map(normalizeMod)
    .filter((mod, index, self) =>
      index === self.findIndex((m) => m.name.toLowerCase() === mod.name.toLowerCase()),
    );
}
