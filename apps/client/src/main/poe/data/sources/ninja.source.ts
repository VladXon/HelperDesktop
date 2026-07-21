import type { AdapterResult, ExternalEconomyEntry } from '@helper/shared';

const NINJA_API_BASE = 'https://poe.ninja/api/data';

export const ninjaSource = {
  name: 'PoeNinja',
  baseUrl: NINJA_API_BASE,

  async fetchCurrencyOverview(league: string): Promise<AdapterResult<ExternalEconomyEntry[]>> {
    try {
      const url = `${NINJA_API_BASE}/currencyoverview?league=${encodeURIComponent(league)}&type=Currency`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as { lines: Array<{ currencyTypeName: string; chaosEquivalent: number; divineEquivalent: number; listingCount: number }> };
      const entries: ExternalEconomyEntry[] = json.lines.map((line) => ({
        currencyTypeName: line.currencyTypeName,
        chaosEquivalent: line.chaosEquivalent,
        divineEquivalent: line.divineEquivalent,
        listingCount: line.listingCount,
      }));
      return { ok: true, data: entries, meta: { source: 'poe.ninja', fetchedAt: Date.now(), cached: false } };
    } catch (err) {
      return { ok: false, error: `Ninja currency fetch failed: ${err instanceof Error ? err.message : err}` };
    }
  },

  async fetchItemOverview(league: string, type: string): Promise<AdapterResult<ExternalEconomyEntry[]>> {
    try {
      const url = `${NINJA_API_BASE}/itemoverview?league=${encodeURIComponent(league)}&type=${encodeURIComponent(type)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as { lines: Array<{ name: string; chaosValue: number; divineValue: number; listingCount: number }> };
      const entries: ExternalEconomyEntry[] = json.lines.map((line) => ({
        name: line.name,
        chaosValue: line.chaosValue,
        divineValue: line.divineValue,
        listingCount: line.listingCount,
      }));
      return { ok: true, data: entries, meta: { source: 'poe.ninja', fetchedAt: Date.now(), cached: false } };
    } catch (err) {
      return { ok: false, error: `Ninja item fetch failed: ${err instanceof Error ? err.message : err}` };
    }
  },
};
