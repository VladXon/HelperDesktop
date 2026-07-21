import type { PoeModifierRecord, ExternalModifierDTO } from '@helper/shared';

export function normalizeMod(raw: ExternalModifierDTO): PoeModifierRecord {
  return {
    name: (raw.name ?? '').trim(),
    domain: (raw.domain ?? 'item').trim(),
    generationType: (raw.generationType ?? 'prefix').trim(),
    values: raw.values ?? [],
    tags: raw.tags ?? [],
    tiers: raw.tiers ?? [],
  };
}

export function normalizeMods(rawMods: ExternalModifierDTO[]): PoeModifierRecord[] {
  return rawMods
    .filter((raw) => Boolean((raw.name ?? '').trim()))
    .map(normalizeMod)
    .filter((mod, index, self) =>
      index === self.findIndex((m) => m.name.toLowerCase() === mod.name.toLowerCase()),
    );
}
