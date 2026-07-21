import { describe, it, expect } from 'vitest';
import { normalizeItem, normalizeItems } from '../data/normalizers/item.normalizer.js';
import { normalizeSkill, normalizeSkills } from '../data/normalizers/skill.normalizer.js';
import { normalizeMod, normalizeMods } from '../data/normalizers/mod.normalizer.js';
import { normalizeEconomyEntry, normalizeEconomyEntries } from '../data/normalizers/economy.normalizer.js';
import { normalizeLeague, normalizeLeagues } from '../data/normalizers/league.normalizer.js';
import type { ExternalItemDTO, ExternalSkillDTO, ExternalModifierDTO, ExternalEconomyEntry, ExternalLeagueDTO } from '@helper/shared';

describe('item.normalizer', () => {
  it('normalizes an item with full data', () => {
    const raw: ExternalItemDTO = {
      name: 'Mageblood',
      base_item: 'Heavy Belt',
      item_class: 'Belt',
      required_level: '44',
      flavour_text: 'Take what you need...',
      source: 'poewiki',
    };

    const result = normalizeItem(raw, 1000);
    expect(result.game).toBe('poe1');
    expect(result.name).toBe('Mageblood');
    expect(result.baseType).toBe('Heavy Belt');
    expect(result.itemType).toBe('Belt');
    expect(result.level).toBe(44);
    expect(result.flavourText).toBe('Take what you need...');
    expect(result.updatedAt).toBe(1000);
  });

  it('normalizes an item with minimal data', () => {
    const raw: ExternalItemDTO = { name: 'Tabula Rasa' };
    const result = normalizeItem(raw, 2000);

    expect(result.name).toBe('Tabula Rasa');
    expect(result.level).toBe(0);
    expect(result.category).toBe('unique');
  });

  it('normalizes multiple items with deduplication', () => {
    const items: ExternalItemDTO[] = [
      { name: 'Mageblood' },
      { name: 'Mageblood' },
      { name: 'Tabula Rasa' },
    ];

    const result = normalizeItems(items, 1000);
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.name)).toEqual(['Mageblood', 'Tabula Rasa']);
  });

  it('filters items without names', () => {
    const items: ExternalItemDTO[] = [
      { name: '' },
      { name: '   ' },
      {},
    ];

    const result = normalizeItems(items, 1000);
    expect(result).toHaveLength(0);
  });

  it('maps item type from name when category is missing', () => {
    const raw: ExternalItemDTO = { name: 'Amazing Ring' };
    const result = normalizeItem(raw, 1000);

    expect(result.itemType).toBe('Ring');
  });
});

describe('skill.normalizer', () => {
  it('normalizes a skill', () => {
    const raw: ExternalSkillDTO = {
      name: 'Boneshatter',
      skill_type: 'Attack',
      gem_level: '20',
    };

    const result = normalizeSkill(raw, 1000);
    expect(result.game).toBe('poe1');
    expect(result.name).toBe('Boneshatter');
    expect(result.type).toBe('Attack');
    expect(result.gemLevel).toBe(20);
    expect(result.updatedAt).toBe(1000);
  });

  it('normalizes skill with quality stats', () => {
    const raw: ExternalSkillDTO = {
      name: 'Fireball',
      quality_stat_text: '1% increased Damage\n2% increased Area',
    };

    const result = normalizeSkill(raw, 1000);
    expect(result.qualityStats).toEqual(['1% increased Damage', '2% increased Area']);
  });

  it('deduplicates skills by name', () => {
    const skills: ExternalSkillDTO[] = [
      { name: 'Boneshatter' },
      { name: 'Boneshatter' },
      { name: 'Fireball' },
    ];

    const result = normalizeSkills(skills, 1000);
    expect(result).toHaveLength(2);
  });
});

describe('mod.normalizer', () => {
  it('normalizes a modifier', () => {
    const raw: ExternalModifierDTO = {
      name: '+50 to maximum Life',
      domain: 'item',
      generationType: 'prefix',
    };

    const result = normalizeMod(raw);
    expect(result.name).toBe('+50 to maximum Life');
    expect(result.domain).toBe('item');
    expect(result.generationType).toBe('prefix');
  });

  it('normalizes with defaults for missing fields', () => {
    const raw: ExternalModifierDTO = { name: 'Test Mod' };
    const result = normalizeMod(raw);

    expect(result.domain).toBe('item');
    expect(result.generationType).toBe('prefix');
    expect(result.values).toEqual([]);
    expect(result.tags).toEqual([]);
    expect(result.tiers).toEqual([]);
  });

  it('deduplicates mods by name', () => {
    const mods: ExternalModifierDTO[] = [
      { name: 'Life Mod' },
      { name: 'life mod' },
      { name: 'Resistance Mod' },
    ];

    const result = normalizeMods(mods);
    expect(result).toHaveLength(2);
  });
});

describe('economy.normalizer', () => {
  it('normalizes a ninja entry', () => {
    const raw: ExternalEconomyEntry = {
      currencyTypeName: 'Divine Orb',
      chaosEquivalent: 200,
      divineEquivalent: 1,
      listingCount: 5000,
    };

    const result = normalizeEconomyEntry(raw, 'Standard', 1000);
    expect(result.league).toBe('Standard');
    expect(result.currency).toBe('Divine Orb');
    expect(result.chaosEquivalent).toBe(200);
    expect(result.divineEquivalent).toBe(1);
    expect(result.listingCount).toBe(5000);
  });

  it('normalizes an item-level entry', () => {
    const raw: ExternalEconomyEntry = {
      name: 'Mageblood',
      chaosValue: 45000,
      divineValue: 225,
      listingCount: 120,
    };

    const result = normalizeEconomyEntry(raw, 'League', 1000);
    expect(result.currency).toBe('Mageblood');
    expect(result.chaosEquivalent).toBe(45000);
  });

  it('normalizes multiple entries', () => {
    const entries: ExternalEconomyEntry[] = [
      { currencyTypeName: 'Chaos Orb', chaosEquivalent: 1 },
      { name: '', chaosValue: 100 },
    ];

    const result = normalizeEconomyEntries(entries, 'Standard', 1000);
    expect(result).toHaveLength(1);
    expect(result[0]!.currency).toBe('Chaos Orb');
  });
});

describe('league.normalizer', () => {
  it('normalizes a league', () => {
    const raw: ExternalLeagueDTO = {
      leagueId: 'Standard',
      leagueName: 'Standard League',
      isCurrent: true,
    };

    const result = normalizeLeague(raw);
    expect(result.game).toBe('poe1');
    expect(result.leagueId).toBe('Standard');
    expect(result.leagueName).toBe('Standard League');
    expect(result.isCurrent).toBe(true);
    expect(result.isHardcore).toBe(false);
    expect(result.isSsf).toBe(false);
  });

  it('normalizes multiple leagues', () => {
    const leagues: ExternalLeagueDTO[] = [
      { leagueId: 'Standard', leagueName: 'Standard' },
      { leagueId: 'HC', leagueName: 'Hardcore', isHardcore: true },
      { leagueId: '', leagueName: '' },
    ];

    const result = normalizeLeagues(leagues);
    expect(result).toHaveLength(2);
  });
});
