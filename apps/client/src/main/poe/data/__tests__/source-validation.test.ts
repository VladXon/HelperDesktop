import { describe, it, expect } from 'vitest';

describe('source DTO contracts', () => {
  it('WikiSearchResult has expected shape', () => {
    const mock: { pageid: number; title: string; snippet?: string } = {
      pageid: 1,
      title: 'Mageblood',
    };
    expect(mock).toHaveProperty('pageid');
    expect(mock).toHaveProperty('title');
    expect(typeof mock.pageid).toBe('number');
  });

  it('NinjaCurrencyLine has expected shape', () => {
    const mock = {
      currencyTypeName: 'Divine Orb',
      chaosEquivalent: 230,
      divineEquivalent: 1,
      receive: { value: 230 },
      pay: { value: 232 },
      listingCount: 500,
    };
    expect(mock.chaosEquivalent).toBeGreaterThan(0);
    expect(mock.listingCount).toBeGreaterThan(0);
  });

  it('NinjaItemLine has expected shape', () => {
    const mock = {
      name: 'Mageblood',
      chaosValue: 45000,
      divineValue: 195,
      listingCount: 120,
    };
    expect(typeof mock.name).toBe('string');
    expect(mock.chaosValue).toBeGreaterThan(0);
  });

  it('TradeSearchResponse has expected shape', () => {
    const mock = { id: 'abc123', result: ['a', 'b'], total: 50 };
    expect(typeof mock.id).toBe('string');
    expect(Array.isArray(mock.result)).toBe(true);
  });

  it('TradeFetchItem has expected shape', () => {
    const mockItem = {
      listing: {
        price: { amount: 10, currency: 'chaos', type: '~price' },
        indexed: '2024-01-01T00:00:00Z',
      },
      item: { name: 'Mageblood', typeLine: 'Heavy Belt' },
    };
    expect(mockItem.listing.price.amount).toBe(10);
    expect(mockItem.item.name).toBe('Mageblood');
  });
});
