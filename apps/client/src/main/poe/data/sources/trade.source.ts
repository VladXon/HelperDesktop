import type { AdapterResult, ExternalEconomyEntry } from '@helper/shared';

const TRADE_API_BASE = 'https://www.pathofexile.com/api/trade';

interface TradeSearchRequest {
  query: Record<string, unknown>;
  sort?: { price: string };
}

interface TradeListing {
  name: string;
  typeLine: string;
  price: number;
  currency: string;
  listedAt: string;
}

export interface TradeSearchResult {
  queryHash: string;
  total: number;
  listings: TradeListing[];
  league: string;
}

interface TradeFetchItem {
  listing: { price?: { amount: number; currency: string; type: string }; indexed: string };
  item: { name?: string; typeLine?: string };
}

export const tradeSource = {
  name: 'GGGTrade',
  baseUrl: TRADE_API_BASE,

  async searchItems(
    league: string,
    body: TradeSearchRequest,
    poesessid: string,
  ): Promise<AdapterResult<TradeSearchResult>> {
    try {
      const queryJson = JSON.stringify(body);
      const res = await fetch(`${TRADE_API_BASE}/search/${encodeURIComponent(league)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: `POESESSID=${poesessid}` },
        body: queryJson,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as { id: string; result: string[]; total: number };
      const queryHash = json.id;
      const top10 = json.result.slice(0, 10);
      if (top10.length === 0) {
        return { ok: true, data: { queryHash, total: json.total, listings: [], league }, meta: { source: 'trade', fetchedAt: Date.now(), cached: false } };
      }
      const fetchUrl = `${TRADE_API_BASE}/fetch/${top10.join(',')}?query=${queryHash}`;
      const fetchRes = await fetch(fetchUrl, { headers: { Cookie: `POESESSID=${poesessid}` } });
      if (!fetchRes.ok) throw new Error(`HTTP ${fetchRes.status}`);
      const fetchJson = await fetchRes.json() as { result: TradeFetchItem[] };
      const listings: TradeListing[] = (fetchJson.result ?? []).map((entry) => ({
        name: entry.item.name ?? entry.item.typeLine ?? 'Unknown',
        typeLine: entry.item.typeLine ?? '',
        price: entry.listing.price?.amount ?? 0,
        currency: entry.listing.price?.currency ?? 'chaos',
        listedAt: entry.listing.indexed ?? '',
      }));
      return { ok: true, data: { queryHash, total: json.total, listings, league }, meta: { source: 'trade', fetchedAt: Date.now(), cached: false } };
    } catch (err) {
      return { ok: false, error: `Trade search failed: ${err instanceof Error ? err.message : err}` };
    }
  },

  async fetchExchangeRates(
    league: string,
    currency: string,
  ): Promise<AdapterResult<ExternalEconomyEntry[]>> {
    try {
      const body = { exchange: { status: { option: 'online' }, have: [currency], want: ['chaos'] } };
      const res = await fetch(`${TRADE_API_BASE}/exchange/${encodeURIComponent(league)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as { id: string; result: string[] };
      const top5 = json.result.slice(0, 5);
      if (top5.length === 0) return { ok: false, error: 'No listings found' };
      const fetchUrl = `${TRADE_API_BASE}/fetch/${top5.join(',')}?query=${json.id}`;
      const fetchRes = await fetch(fetchUrl);
      if (!fetchRes.ok) throw new Error(`HTTP ${fetchRes.status}`);
      const fetchJson = await fetchRes.json() as { result: Array<{ listing: { price: { amount: number; currency: string } } }> };
      const entries: ExternalEconomyEntry[] = (fetchJson.result ?? []).map((e) => ({
        currencyTypeName: currency,
        chaosEquivalent: e.listing.price.amount,
        listingCount: 0,
      }));
      return { ok: true, data: entries, meta: { source: 'trade-exchange', fetchedAt: Date.now(), cached: false } };
    } catch (err) {
      return { ok: false, error: `Exchange rate fetch failed: ${err instanceof Error ? err.message : err}` };
    }
  },
};
