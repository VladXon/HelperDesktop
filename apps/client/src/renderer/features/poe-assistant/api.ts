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
  const local = await window.api.poe.getSession();
  if (local.valid && local.accountName) return local;
  const server = await window.api.poe.getOAuthStatus().catch(() => null);
  if (server?.connected && server.accountName) {
    return { configured: true, valid: server.tokenValid, accountName: server.accountName };
  }
  return local;
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
  const account = (listing.account ?? {}) as Record<string, unknown>;

  // Search format: listing.price.exchange.amount
  const price = (listing.price ?? {}) as Record<string, unknown>;
  const searchExchange = (price.exchange ?? {}) as Record<string, unknown>;
  const searchItem = (price.item ?? {}) as Record<string, unknown>;
  if (searchExchange.amount) {
    return {
      price: Number(searchExchange.amount ?? 0),
      currency: String(searchItem.currency ?? 'chaos'),
      amount: Number(searchExchange.amount ?? 0),
      accountName: String(account.name ?? '?'),
    };
  }

  // Exchange format: listing.offers[0].exchange.amount
  const offers = (listing.offers ?? []) as Array<Record<string, unknown>>;
  if (offers.length > 0) {
    const offer = offers[0]!;
    const offerExchange = (offer.exchange ?? {}) as Record<string, unknown>;
    const offerItem = (offer.item ?? {}) as Record<string, unknown>;
    return {
      price: Number(offerExchange.amount ?? 0),
      currency: String(offerItem.currency ?? 'chaos'),
      amount: Number(offerItem.amount ?? 1),
      accountName: String(account.name ?? '?'),
    };
  }

  return { price: 0, currency: 'chaos', amount: 0, accountName: String(account.name ?? '?') };
}
