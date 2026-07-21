import type { AdapterResult } from '@helper/shared';
import type { EconomySnapshot } from '@helper/shared';

const NINJA_API_BASE = 'https://poe.ninja/api/data';

interface NinjaCurrencyLine {
  currencyTypeName: string;
  chaosEquivalent: number;
  divineEquivalent: number;
  receive: { value: number };
  pay: { value: number };
  listingCount: number;
}

interface NinjaCurrencyResponse {
  lines: NinjaCurrencyLine[];
  currencyDetails?: Array<{ name: string; icon?: string }>;
}

interface NinjaItemLine {
  name: string;
  chaosValue: number;
  divineValue: number;
  listingCount: number;
  icon?: string;
}

interface NinjaItemResponse {
  lines: NinjaItemLine[];
}

export const ninjaSource = {
  name: 'PoeNinja',
  baseUrl: NINJA_API_BASE,

  async fetchCurrencyOverview(league: string): Promise<AdapterResult<EconomySnapshot[]>> {
    try {
      const url = `${NINJA_API_BASE}/currencyoverview?league=${encodeURIComponent(league)}&type=Currency`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as NinjaCurrencyResponse;

      const snapshots: EconomySnapshot[] = json.lines.map((line) => ({
        league,
        currency: line.currencyTypeName,
        chaosEquivalent: line.chaosEquivalent,
        divineEquivalent: line.divineEquivalent,
        change24h: 0,
        listingCount: line.listingCount,
        snapshotTime: Date.now(),
        history: [{ timestamp: Date.now(), rate: line.chaosEquivalent }],
      }));

      return { ok: true, data: snapshots, meta: { source: 'poe.ninja', fetchedAt: Date.now(), cached: false } };
    } catch (err) {
      return { ok: false, error: `Ninja currency fetch failed: ${err instanceof Error ? err.message : err}` };
    }
  },

  async fetchItemOverview(league: string, type: string): Promise<AdapterResult<EconomySnapshot[]>> {
    try {
      const url = `${NINJA_API_BASE}/itemoverview?league=${encodeURIComponent(league)}&type=${encodeURIComponent(type)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as NinjaItemResponse;

      const snapshots: EconomySnapshot[] = json.lines.map((line) => ({
        league,
        currency: line.name,
        chaosEquivalent: line.chaosValue,
        divineEquivalent: line.divineValue,
        change24h: 0,
        listingCount: line.listingCount,
        snapshotTime: Date.now(),
        history: [{ timestamp: Date.now(), rate: line.chaosValue }],
      }));

      return { ok: true, data: snapshots, meta: { source: 'poe.ninja', fetchedAt: Date.now(), cached: false } };
    } catch (err) {
      return { ok: false, error: `Ninja item fetch failed: ${err instanceof Error ? err.message : err}` };
    }
  },
};
