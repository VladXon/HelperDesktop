import { describe, it, expect } from 'vitest';
import { createNinjaSource } from '../data/sources/ninja.source.js';
import { MockHttpClient } from '../http/http-client.js';

describe('createNinjaSource', () => {
  it('creates a ninja source with correct metadata', () => {
    const client = new MockHttpClient();
    const source = createNinjaSource(client);

    expect(source.name).toBe('PoeNinja');
    expect(source.baseUrl).toBe('https://poe.ninja/api/data');
  });

  it('fetchCurrencyOverview returns normalized entries', async () => {
    const client = new MockHttpClient();
    client.onGet(
      'https://poe.ninja/api/data/currencyoverview?league=Standard&type=Currency',
      {
        lines: [
          { currencyTypeName: 'Chaos Orb', chaosEquivalent: 1, divineEquivalent: 0.005, listingCount: 99999 },
          { currencyTypeName: 'Divine Orb', chaosEquivalent: 200, divineEquivalent: 1, listingCount: 5000 },
        ],
      },
    );

    const source = createNinjaSource(client);
    const result = await source.fetchCurrencyOverview('Standard');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0]!.currencyTypeName).toBe('Chaos Orb');
      expect(result.data[0]!.chaosEquivalent).toBe(1);
      expect(result.data[1]!.currencyTypeName).toBe('Divine Orb');
      expect(result.data[1]!.chaosEquivalent).toBe(200);
      expect(result.meta.source).toBe('poe.ninja');
    }
  });

  it('fetchCurrencyOverview handles HTTP errors', async () => {
    const client = new MockHttpClient();
    client.onGet(
      'https://poe.ninja/api/data/currencyoverview?league=BadLeague&type=Currency',
      new Error('HTTP 404'),
    );

    const source = createNinjaSource(client);
    const result = await source.fetchCurrencyOverview('BadLeague');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Ninja currency fetch failed');
    }
  });

  it('fetchItemOverview returns normalized entries', async () => {
    const client = new MockHttpClient();
    client.onGet(
      'https://poe.ninja/api/data/itemoverview?league=Standard&type=UniqueMap',
      {
        lines: [
          { name: 'Mageblood', chaosValue: 45000, divineValue: 225, listingCount: 120 },
        ],
      },
    );

    const source = createNinjaSource(client);
    const result = await source.fetchItemOverview('Standard', 'UniqueMap');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0]!.name).toBe('Mageblood');
      expect(result.data[0]!.chaosValue).toBe(45000);
    }
  });

  it('fetchItemOverview handles errors', async () => {
    const client = new MockHttpClient();
    client.onGet(
      'https://poe.ninja/api/data/itemoverview?league=Standard&type=Invalid',
      new Error('HTTP 500'),
    );

    const source = createNinjaSource(client);
    const result = await source.fetchItemOverview('Standard', 'Invalid');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Ninja item fetch failed');
    }
  });

  it('handles empty currency lines gracefully', async () => {
    const client = new MockHttpClient();
    client.onGet(
      'https://poe.ninja/api/data/currencyoverview?league=Standard&type=Currency',
      { lines: [] },
    );

    const source = createNinjaSource(client);
    const result = await source.fetchCurrencyOverview('Standard');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([]);
    }
  });
});
