import { net } from 'electron';

const POE_API_BASE = 'https://www.pathofexile.com';
const MAX_LISTINGS = 20;
const EXCHANGE_CACHE_TTL = 30_000;
const LEAGUE_CACHE_TTL = 300_000;

let rateLimitGate: Promise<unknown> = Promise.resolve();
function rateLimited<T>(fn: () => Promise<T>): Promise<T> {
  const result = rateLimitGate.then(fn);
  rateLimitGate = result.then(() => new Promise((r) => setTimeout(r, 334))).catch(() => new Promise((r) => setTimeout(r, 334)));
  return result;
}

const pendingRequests = new Map<string, Promise<unknown>>();

function coalesce<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = pendingRequests.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const promise = fn().finally(() => { pendingRequests.delete(key); });
  pendingRequests.set(key, promise);
  return promise;
}

const exchangeCache = new Map<string, { data: { listings: unknown[]; total: number }; expiresAt: number }>();

function exchangeCacheKey(league: string, have: string, want: string): string {
  return `${league}:${have}:${want}`;
}

let leagueCache: { data: Array<{ id: string; text: string }>; expiresAt: number } | null = null;

function getCachedExchange(league: string, have: string, want: string): { listings: unknown[]; total: number } | null {
  const key = exchangeCacheKey(league, have, want);
  const entry = exchangeCache.get(key);
  if (entry && Date.now() < entry.expiresAt) return entry.data;
  if (entry) exchangeCache.delete(key);
  return null;
}

function setCachedExchange(league: string, have: string, want: string, data: { listings: unknown[]; total: number }): void {
  const key = exchangeCacheKey(league, have, want);
  exchangeCache.set(key, { data, expiresAt: Date.now() + EXCHANGE_CACHE_TTL });
}

function getCachedLeagues(): Array<{ id: string; text: string }> | null {
  if (leagueCache && Date.now() < leagueCache.expiresAt) return leagueCache.data;
  leagueCache = null;
  return null;
}

function setCachedLeagues(data: Array<{ id: string; text: string }>): void {
  leagueCache = { data, expiresAt: Date.now() + LEAGUE_CACHE_TTL };
}

export interface PoeTradeService {
  getLeagues(): Promise<Array<{ id: string; text: string }>>;
  fetchExchangeRate(league: string, have: string, want: string): Promise<{ listings: unknown[]; total: number }>;
  searchItems(league: string, query: Record<string, unknown>): Promise<{ id: string; items: unknown[]; total: number }>;
  fetchExchangeHistory(): Promise<unknown>;
}

export function createPoeTradeService(): PoeTradeService {
  return {
    async getLeagues(): Promise<Array<{ id: string; text: string }>> {
      const cached = getCachedLeagues();
      if (cached) return cached;
      return coalesce('leagues', async () => {
        const cached2 = getCachedLeagues();
        if (cached2) return cached2;
        const url = `${POE_API_BASE}/api/trade/data/leagues`;
        const res = await rateLimited(() => net.fetch(url, { headers: { 'User-Agent': 'HelperDesktop/1.0' } }));
        if (!res.ok) throw new Error(`GGG API ${res.status}`);
        const data = (await res.json()) as { result: Array<{ id: string; text: string }> };
        const leagues = data.result ?? [];
        setCachedLeagues(leagues);
        return leagues;
      });
    },

    async fetchExchangeRate(league: string, have: string, want: string): Promise<{ listings: unknown[]; total: number }> {
      const cached = getCachedExchange(league, have, want);
      if (cached) return cached;
      const cacheKey = exchangeCacheKey(league, have, want);
      return coalesce(`exchange:${cacheKey}`, async () => {
        const cached2 = getCachedExchange(league, have, want);
        if (cached2) return cached2;

        const body = JSON.stringify({ exchange: { status: { option: 'online' }, have: [have], want: [want] } });
        const res = await rateLimited(() =>
          net.fetch(`${POE_API_BASE}/api/trade/exchange/${encodeURIComponent(league)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'HelperDesktop/1.0' },
            body,
          }),
        );
        if (!res.ok) throw new Error(`GGG API ${res.status}`);
        const data = (await res.json()) as { id: string; result: Record<string, unknown>; total: number };
        const listingIds = Object.keys(data.result).slice(0, MAX_LISTINGS);
        if (listingIds.length === 0) {
          const empty = { listings: [], total: data.total };
          setCachedExchange(league, have, want, empty);
          return empty;
        }

        const hash = listingIds.join(',');
        const detailRes = await rateLimited(() =>
          net.fetch(`${POE_API_BASE}/api/trade/fetch/${hash}?query=${data.id}`, {
            headers: { 'User-Agent': 'HelperDesktop/1.0' },
          }),
        );
        if (!detailRes.ok) throw new Error(`GGG API ${detailRes.status}`);
        const detailData = (await detailRes.json()) as { result: Record<string, unknown>[] };
        const result = { listings: detailData.result ?? [], total: data.total };
        setCachedExchange(league, have, want, result);
        return result;
      });
    },

    async searchItems(league: string, query: Record<string, unknown>): Promise<{ id: string; items: unknown[]; total: number }> {
      const queryKey = JSON.stringify({ league, query });
      return coalesce(`search:${queryKey}`, async () => {
        const res = await rateLimited(() =>
          net.fetch(`${POE_API_BASE}/api/trade/search/${encodeURIComponent(league)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'HelperDesktop/1.0' },
            body: JSON.stringify(query),
          }),
        );
        if (!res.ok) throw new Error(`GGG API ${res.status}`);
        const data = (await res.json()) as { id: string; result: string[]; total: number };
        const ids = data.result.slice(0, MAX_LISTINGS);
        if (ids.length === 0) return { id: data.id, items: [], total: data.total };

        const hash = ids.join(',');
        const detailRes = await rateLimited(() =>
          net.fetch(`${POE_API_BASE}/api/trade/fetch/${hash}?query=${data.id}`, {
            headers: { 'User-Agent': 'HelperDesktop/1.0' },
          }),
        );
        if (!detailRes.ok) throw new Error(`GGG API ${detailRes.status}`);
        const detailData = (await detailRes.json()) as { result: unknown[] };
        return { id: data.id, items: detailData.result, total: data.total };
      });
    },

    async fetchExchangeHistory(): Promise<unknown> {
      return coalesce('exchange-history', async () => {
        const res = await rateLimited(() =>
          net.fetch('https://web.poecdn.com/api/currency-exchange', {
            headers: { 'User-Agent': 'HelperDesktop/1.0' },
          }),
        );
        if (!res.ok) throw new Error(`GGG API ${res.status}`);
        return res.json();
      });
    },
  };
}
