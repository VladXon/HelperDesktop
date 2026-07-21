import type { AdapterResult, ExternalEconomyEntry } from '@helper/shared';
import type { HttpClient } from '../../http/http-client.js';

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

export interface TradeSource {
  readonly name: string;
  readonly baseUrl: string;
  searchItems(league: string, body: TradeSearchRequest, poesessid: string): Promise<AdapterResult<TradeSearchResult>>;
  fetchExchangeRates(league: string, currency: string): Promise<AdapterResult<ExternalEconomyEntry[]>>;
}

export function createTradeSource(httpClient: HttpClient): TradeSource {
  return {
    name: 'GGGTrade',
    baseUrl: TRADE_API_BASE,

    async searchItems(league: string, body: TradeSearchRequest, poesessid: string): Promise<AdapterResult<TradeSearchResult>> {
      try {
        const queryJson = JSON.stringify(body);
        const json = await httpClient.post<{ id: string; result: string[]; total: number }>(
          `${TRADE_API_BASE}/search/${encodeURIComponent(league)}`,
          body,
          { headers: { Cookie: `POESESSID=${poesessid}` } },
        );
        const queryHash = json.id;
        const top10 = json.result.slice(0, 10);
        if (top10.length === 0) {
          return { ok: true, data: { queryHash, total: json.total, listings: [], league }, meta: { source: 'trade', fetchedAt: Date.now(), cached: false } };
        }
        const fetchUrl = `${TRADE_API_BASE}/fetch/${top10.join(',')}?query=${queryHash}`;
        const fetchJson = await httpClient.get<{ result: TradeFetchItem[] }>(fetchUrl, {
          headers: { Cookie: `POESESSID=${poesessid}` },
        });
        const listings: TradeListing[] = (fetchJson.result ?? []).map((entry) => ({
          name: entry.item.name ?? entry.item.typeLine ?? 'Unknown',
          typeLine: entry.item.typeLine ?? '',
          price: entry.listing.price?.amount ?? 0,
          currency: entry.listing.price?.currency ?? 'chaos',
          listedAt: entry.listing.indexed ?? '',
        }));
        return { ok: true, data: { queryHash, total: json.total, listings, league }, meta: { source: 'trade', fetchedAt: Date.now(), cached: false } };
      } catch (err) {
        return { ok: false, error: `Trade search failed: ${err instanceof Error ? err.message : String(err)}` };
      }
    },

    async fetchExchangeRates(league: string, currency: string): Promise<AdapterResult<ExternalEconomyEntry[]>> {
      try {
        const body = { exchange: { status: { option: 'online' }, have: [currency], want: ['chaos'] } };
        const json = await httpClient.post<{ id: string; result: string[] }>(
          `${TRADE_API_BASE}/exchange/${encodeURIComponent(league)}`,
          body,
        );
        const top5 = json.result.slice(0, 5);
        if (top5.length === 0) return { ok: false, error: 'No listings found' };
        const fetchUrl = `${TRADE_API_BASE}/fetch/${top5.join(',')}?query=${json.id}`;
        const fetchJson = await httpClient.get<{ result: Array<{ listing: { price: { amount: number; currency: string } } }> }>(fetchUrl);
        const entries: ExternalEconomyEntry[] = (fetchJson.result ?? []).map((e) => ({
          currencyTypeName: currency,
          chaosEquivalent: e.listing.price.amount,
          listingCount: 0,
        }));
        return { ok: true, data: entries, meta: { source: 'trade-exchange', fetchedAt: Date.now(), cached: false } };
      } catch (err) {
        return { ok: false, error: `Exchange rate fetch failed: ${err instanceof Error ? err.message : String(err)}` };
      }
    },
  };
}
