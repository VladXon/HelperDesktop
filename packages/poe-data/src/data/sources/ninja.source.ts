import type { AdapterResult, ExternalEconomyEntry } from '@helper/shared';
import type { HttpClient } from '../../http/http-client.js';

const NINJA_API_BASE = 'https://poe.ninja/api/data';

export interface NinjaSource {
  readonly name: string;
  readonly baseUrl: string;
  fetchCurrencyOverview(league: string): Promise<AdapterResult<ExternalEconomyEntry[]>>;
  fetchItemOverview(league: string, type: string): Promise<AdapterResult<ExternalEconomyEntry[]>>;
}

export function createNinjaSource(httpClient: HttpClient): NinjaSource {
  return {
    name: 'PoeNinja',
    baseUrl: NINJA_API_BASE,

    async fetchCurrencyOverview(league: string): Promise<AdapterResult<ExternalEconomyEntry[]>> {
      try {
        const url = `${NINJA_API_BASE}/currencyoverview?league=${encodeURIComponent(league)}&type=Currency`;
        const json = await httpClient.get<{
          lines: Array<{ currencyTypeName: string; chaosEquivalent: number; divineEquivalent: number; listingCount: number }>;
        }>(url);
        const entries: ExternalEconomyEntry[] = json.lines.map((line) => ({
          currencyTypeName: line.currencyTypeName,
          chaosEquivalent: line.chaosEquivalent,
          divineEquivalent: line.divineEquivalent,
          listingCount: line.listingCount,
        }));
        return { ok: true, data: entries, meta: { source: 'poe.ninja', fetchedAt: Date.now(), cached: false } };
      } catch (err) {
        return { ok: false, error: `Ninja currency fetch failed: ${err instanceof Error ? err.message : String(err)}` };
      }
    },

    async fetchItemOverview(league: string, type: string): Promise<AdapterResult<ExternalEconomyEntry[]>> {
      try {
        const url = `${NINJA_API_BASE}/itemoverview?league=${encodeURIComponent(league)}&type=${encodeURIComponent(type)}`;
        const json = await httpClient.get<{
          lines: Array<{ name: string; chaosValue: number; divineValue: number; listingCount: number }>;
        }>(url);
        const entries: ExternalEconomyEntry[] = json.lines.map((line) => ({
          name: line.name,
          chaosValue: line.chaosValue,
          divineValue: line.divineValue,
          listingCount: line.listingCount,
        }));
        return { ok: true, data: entries, meta: { source: 'poe.ninja', fetchedAt: Date.now(), cached: false } };
      } catch (err) {
        return { ok: false, error: `Ninja item fetch failed: ${err instanceof Error ? err.message : String(err)}` };
      }
    },
  };
}
