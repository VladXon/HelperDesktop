import type { SessionStatus, ExchangeRateResult, ItemSearchResult } from './types';

export async function setSession(poesessid: string): Promise<{ valid: boolean; accountName?: string }> {
  try {
    const result = await window.api.poe.connectSession(poesessid);
    return { valid: result.connected, accountName: result.accountName };
  } catch {
    return { valid: false };
  }
}

export async function getSession(): Promise<SessionStatus> {
  return window.api.poe.getSession();
}

export async function clearSession(): Promise<void> {
  return window.api.poe.clearSession();
}

export async function getLeagues(): Promise<{ id: string; text: string }[]> {
  return window.api.poe.getLeagues();
}

export async function fetchExchangeRate(league: string, have: string, want: string): Promise<ExchangeRateResult> {
  const raw = await window.api.poe.fetchExchangeRate(league, have, want);
  const listings = (raw.listings ?? []).map(parseExchangeListing);
  return { listings, total: raw.total };
}

export async function searchItems(league: string, query: Record<string, unknown>): Promise<ItemSearchResult> {
  return window.api.poe.searchItems(league, query) as Promise<ItemSearchResult>;
}

export async function fetchCharacters(): Promise<unknown[]> {
  return window.api.poe.fetchCharacters();
}

export async function fetchStashItems(league: string, tabIndex: number): Promise<unknown> {
  return window.api.poe.fetchStashItems(league, tabIndex);
}

export async function fetchExchangeHistory(): Promise<unknown> {
  return window.api.poe.fetchExchangeHistory();
}

function parseExchangeListing(raw: unknown): { price: number; currency: string; amount: number; accountName: string } {
  const item = raw as Record<string, unknown>;
  const listing = (item.listing ?? {}) as Record<string, unknown>;
  const price = (listing.price ?? {}) as Record<string, unknown>;
  const exchange = (price.exchange ?? {}) as Record<string, unknown>;
  const priceItem = (price.item ?? {}) as Record<string, unknown>;
  const account = (listing.account ?? {}) as Record<string, unknown>;
  return {
    price: (exchange.amount ?? price.amount ?? 0) as number,
    currency: (priceItem.currency ?? 'chaos') as string,
    amount: (exchange.amount ?? 0) as number,
    accountName: (account.name ?? '?') as string,
  };
}
