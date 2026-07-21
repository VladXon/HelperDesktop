import type { EconomySnapshot } from '@helper/shared';
import type { ExternalEconomyEntry } from '@helper/shared';

export function normalizeEconomyEntry(
  entry: ExternalEconomyEntry,
  league: string,
  now: number,
): EconomySnapshot {
  const currencyName = entry.currencyTypeName ?? entry.name ?? 'Unknown';
  const chaosEq = entry.chaosEquivalent ?? entry.chaosValue ?? 0;
  const divineEq = entry.divineEquivalent ?? entry.divineValue ?? 0;

  return {
    league,
    currency: currencyName,
    chaosEquivalent: chaosEq,
    divineEquivalent: divineEq,
    change24h: 0,
    listingCount: entry.listingCount ?? 0,
    snapshotTime: now,
    history: [{ timestamp: now, rate: chaosEq }],
  };
}

export function normalizeEconomyEntries(
  entries: ExternalEconomyEntry[],
  league: string,
  now: number,
): EconomySnapshot[] {
  return entries
    .filter((e) => (e.currencyTypeName ?? e.name ?? '').trim().length > 0)
    .map((e) => normalizeEconomyEntry(e, league, now));
}
