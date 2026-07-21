import { describe, it, expect } from 'vitest';
import { createWikiSource } from '../data/sources/poe-wiki.source.js';
import { MockHttpClient } from '../http/http-client.js';

const WIKI_BASE = 'https://www.poewiki.net/w/api.php';

function buildWikiUrl(params: Record<string, string>): string {
  const qs = new URLSearchParams(params).toString();
  return `${WIKI_BASE}?${qs}`;
}

describe('createWikiSource', () => {
  it('creates a wiki source with correct metadata', () => {
    const client = new MockHttpClient();
    const source = createWikiSource(client);

    expect(source.name).toBe('PoeWiki');
    expect(source.baseUrl).toBe(WIKI_BASE);
  });

  it('fetchItems returns search results', async () => {
    const client = new MockHttpClient();
    client.onGet(
      buildWikiUrl({
        action: 'query', format: 'json', list: 'search',
        srsearch: 'Mageblood', srnamespace: '0', srlimit: '10',
        origin: '*',
      }),
      {
        query: {
          pages: {
            '123': { pageid: 123, title: 'Mageblood' },
            '456': { pageid: 456, title: 'Mageblood (Legacy)' },
          },
        },
      },
    );

    const source = createWikiSource(client);
    const result = await source.fetchItems('Mageblood');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.length).toBe(2);
      expect(result.data[0]!.title).toBe('Mageblood');
      expect(result.meta.source).toBe('poewiki');
    }
  });

  it('fetchUniques returns normalized items', async () => {
    const client = new MockHttpClient();
    client.onGet(
      buildWikiUrl({
        action: 'cargoquery', format: 'json',
        tables: 'items',
        fields: 'name,base_item,required_level,item_class,flavour_text',
        where: 'rarity="Unique"',
        limit: '500',
        origin: '*',
      }),
      {
        cargoquery: [
          {
            title: {
              name: 'Mageblood',
              base_item: 'Heavy Belt',
              item_class: 'Belt',
              required_level: '44',
              flavour_text: 'Take what you need...',
            },
          },
        ],
      },
    );

    const source = createWikiSource(client);
    const result = await source.fetchUniques();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0]!.name).toBe('Mageblood');
      expect(result.data[0]!.base_item).toBe('Heavy Belt');
      expect(result.data[0]!.source).toBe('poewiki');
    }
  });

  it('fetchSkills returns normalized skills', async () => {
    const client = new MockHttpClient();
    client.onGet(
      buildWikiUrl({
        action: 'cargoquery', format: 'json',
        tables: 'skill',
        fields: 'name,skill_type,gem_level,quality_stat_text',
        limit: '500',
        origin: '*',
      }),
      {
        cargoquery: [
          {
            title: {
              name: 'Boneshatter',
              skill_type: 'Attack',
              gem_level: '20',
              quality_stat_text: '0.5% increased Attack Speed per 1% quality',
            },
          },
        ],
      },
    );

    const source = createWikiSource(client);
    const result = await source.fetchSkills();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0]!.name).toBe('Boneshatter');
      expect(result.data[0]!.skill_type).toBe('Attack');
    }
  });

  it('handles errors gracefully', async () => {
    const client = new MockHttpClient();
    client.onGet(
      buildWikiUrl({
        action: 'cargoquery', format: 'json',
        tables: 'skill',
        fields: 'name,skill_type,gem_level,quality_stat_text',
        limit: '500',
        origin: '*',
      }),
      new Error('Network timeout'),
    );

    const source = createWikiSource(client);
    const result = await source.fetchSkills();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Wiki skills fetch failed');
    }
  });

  it('returns empty results for empty cargoquery', async () => {
    const client = new MockHttpClient();
    client.onGet(
      buildWikiUrl({
        action: 'cargoquery', format: 'json',
        tables: 'items',
        fields: 'name,base_item,required_level,item_class,flavour_text',
        where: 'rarity="Unique"',
        limit: '500',
        origin: '*',
      }),
      { cargoquery: [] },
    );

    const source = createWikiSource(client);
    const result = await source.fetchUniques();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([]);
    }
  });

  it('returns empty pages for no query results', async () => {
    const client = new MockHttpClient();
    client.onGet(
      buildWikiUrl({
        action: 'query', format: 'json', list: 'search',
        srsearch: 'NonExistent', srnamespace: '0', srlimit: '10',
        origin: '*',
      }),
      { query: {} },
    );

    const source = createWikiSource(client);
    const result = await source.fetchItems('NonExistent');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([]);
    }
  });
});
