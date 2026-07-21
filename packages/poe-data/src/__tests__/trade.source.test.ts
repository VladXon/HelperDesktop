import { describe, it, expect } from 'vitest';
import { createTradeSource } from '../data/sources/trade.source.js';
import { MockHttpClient } from '../http/http-client.js';

describe('createTradeSource', () => {
  it('creates a trade source with correct metadata', () => {
    const client = new MockHttpClient();
    const source = createTradeSource(client);

    expect(source.name).toBe('GGGTrade');
    expect(source.baseUrl).toBe('https://www.pathofexile.com/api/trade');
  });

  it('searchItems returns listings for valid search', async () => {
    const client = new MockHttpClient();
    const searchUrl = 'https://www.pathofexile.com/api/trade/search/Standard';
    client.onPost(searchUrl, {
      id: 'query-hash-123',
      result: ['item1', 'item2', 'item3'],
      total: 500,
    });
    client.onGet(
      'https://www.pathofexile.com/api/trade/fetch/item1,item2,item3?query=query-hash-123',
      {
        result: [
          { listing: { price: { amount: 10, currency: 'chaos', type: '~price' }, indexed: '2025-01-01' }, item: { name: 'Goldrim', typeLine: 'Leather Cap' } },
        ],
      },
    );

    const source = createTradeSource(client);
    const result = await source.searchItems('Standard', { query: { name: 'Goldrim' } }, 'fake-session');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.listings).toHaveLength(1);
      expect(result.data.listings[0]!.name).toBe('Goldrim');
      expect(result.data.listings[0]!.price).toBe(10);
      expect(result.data.total).toBe(500);
    }
  });

  it('searchItems returns empty listings when no results', async () => {
    const client = new MockHttpClient();
    client.onPost('https://www.pathofexile.com/api/trade/search/BadLeague', {
      id: 'empty-query',
      result: [],
      total: 0,
    });

    const source = createTradeSource(client);
    const result = await source.searchItems('BadLeague', { query: {} }, 'fake');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.listings).toEqual([]);
      expect(result.data.total).toBe(0);
    }
  });

  it('searchItems handles HTTP errors', async () => {
    const client = new MockHttpClient();
    client.onPost('https://www.pathofexile.com/api/trade/search/Fail', new Error('HTTP 403'));

    const source = createTradeSource(client);
    const result = await source.searchItems('Fail', { query: {} }, 'bad');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Trade search failed');
    }
  });

  it('fetchExchangeRates returns normalized entries', async () => {
    const client = new MockHttpClient();
    client.onPost(
      'https://www.pathofexile.com/api/trade/exchange/Standard',
      {
        id: 'exchange-123',
        result: ['ex1', 'ex2'],
      },
    );
    client.onGet(
      'https://www.pathofexile.com/api/trade/fetch/ex1,ex2?query=exchange-123',
      {
        result: [
          { listing: { price: { amount: 200, currency: 'chaos' } } },
        ],
      },
    );

    const source = createTradeSource(client);
    const result = await source.fetchExchangeRates('Standard', 'divine');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0]!.currencyTypeName).toBe('divine');
      expect(result.data[0]!.chaosEquivalent).toBe(200);
    }
  });

  it('fetchExchangeRates handles empty results', async () => {
    const client = new MockHttpClient();
    client.onPost(
      'https://www.pathofexile.com/api/trade/exchange/Empty',
      { id: 'no-results', result: [] },
    );

    const source = createTradeSource(client);
    const result = await source.fetchExchangeRates('Empty', 'divine');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('No listings found');
    }
  });
});
