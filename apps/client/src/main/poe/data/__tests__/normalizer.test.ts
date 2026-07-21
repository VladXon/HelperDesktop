import { describe, it, expect } from 'vitest';
import { normalizeItem, normalizeItems } from '../normalizers/item.normalizer.js';
import { normalizeSkill, normalizeSkills } from '../normalizers/skill.normalizer.js';
import { normalizeMod, normalizeMods } from '../normalizers/mod.normalizer.js';
import { normalizeEconomyEntry, normalizeEconomyEntries } from '../normalizers/economy.normalizer.js';
import type { PoeItemRecord, PoeSkillRecord, PoeModifierRecord, EconomySnapshot } from '@helper/shared';

const NOW = 1000000;

describe('item normalizer', () => {
  it('normalizes a basic item with name and baseType', () => {
    const result = normalizeItem({ name: 'Kaom\'s Heart', baseType: 'Glorious Plate' }, NOW);
    expect(result.name).toBe('Kaom\'s Heart');
    expect(result.baseType).toBe('Glorious Plate');
    expect(result.game).toBe('poe1');
    expect(result.updatedAt).toBe(NOW);
  });

  it('uses baseType as name when name is missing', () => {
    const result = normalizeItem({ baseType: 'Glorious Plate' }, NOW);
    expect(result.name).toBe('Glorious Plate');
  });

  it('uses base_item field from wiki DTO', () => {
    const result = normalizeItem({ name: 'Mageblood', base_item: 'Heavy Belt' }, NOW);
    expect(result.baseType).toBe('Heavy Belt');
  });

  it('preserves provided fields', () => {
    const result = normalizeItem({
      name: 'Mageblood',
      baseType: 'Heavy Belt',
      item_class: 'Belt',
      required_level: '44',
      flavour_text: 'Take what you need...',
      explicitStats: { life: 80 },
      dropSources: ['The Feared'],
      icon: '/icon.png',
      source: 'wiki',
      sourceUrl: 'https://poewiki.net/wiki/Mageblood',
    }, NOW);
    expect(result.itemType).toBe('Belt');
    expect(result.requiredLevel).toBe(44);
    expect(result.flavourText).toBe('Take what you need...');
    expect(result.explicitStats).toEqual({ life: 80 });
    expect(result.dropSources).toEqual(['The Feared']);
    expect(result.source).toBe('wiki');
  });

  it('deduplicates items by name', () => {
    const results = normalizeItems([
      { name: 'Mageblood' }, { name: 'mageblood' }, { name: 'Headhunter' },
    ], NOW);
    expect(results.length).toBe(2);
  });

  it('filters out items without names', () => {
    const results = normalizeItems([{ name: '' }, { name: 'Valid' }], NOW);
    expect(results.length).toBe(1);
  });

  it('returns empty for empty array', () => {
    expect(normalizeItems([], NOW)).toEqual([]);
  });

  it('maps item type from name', () => {
    expect(normalizeItem({ name: 'Diamond Ring' }, NOW).itemType).toBe('Ring');
    expect(normalizeItem({ name: 'Onyx Amulet' }, NOW).itemType).toBe('Amulet');
    expect(normalizeItem({ name: 'Leather Belt' }, NOW).itemType).toBe('Belt');
    expect(normalizeItem({ name: 'Two-Toned Boots' }, NOW).itemType).toBe('Boots');
    expect(normalizeItem({ name: 'Despot Axe' }, NOW).itemType).toBe('Weapon');
    expect(normalizeItem({ name: 'Granite Flask' }, NOW).itemType).toBe('Flask');
    expect(normalizeItem({ name: 'Crimson Jewel' }, NOW).itemType).toBe('Jewel');
    expect(normalizeItem({ name: 'Strand Map' }, NOW).itemType).toBe('Map');
    expect(normalizeItem({ name: 'Glorious Plate' }, NOW).itemType).toBe('Body Armour');
  });

  it('returns empty itemType for unrecognized name', () => {
    expect(normalizeItem({ name: 'Mysterious Object' }, NOW).itemType).toBe('');
  });

  it('defaults fields when missing', () => {
    const result = normalizeItem({ name: 'Test' }, NOW);
    expect(result.category).toBe('unique');
    expect(result.explicitStats).toEqual({});
    expect(result.dropSources).toEqual([]);
    expect(result.icon).toBe('');
    expect(result.source).toBe('unknown');
    expect(result.sourceUrl).toBe('');
    expect(result.version).toBe('');
    expect(result.flavourText).toBe('');
  });

  it('preserves explicit 0 for requiredLevel', () => {
    const result = normalizeItem({ name: 'Test', requiredLevel: 0 }, NOW);
    expect(result.requiredLevel).toBe(0);
  });
});

describe('skill normalizer', () => {
  it('normalizes a skill record', () => {
    const result = normalizeSkill({ name: 'Fireball', type: 'active' }, NOW);
    expect(result.name).toBe('Fireball');
    expect(result.type).toBe('active');
    expect(result.gemLevel).toBe(20);
    expect(result.game).toBe('poe1');
    expect(result.updatedAt).toBe(NOW);
  });

  it('uses skill_type from wiki DTO', () => {
    const result = normalizeSkill({ name: 'Fireball', skill_type: 'spell' }, NOW);
    expect(result.type).toBe('spell');
  });

  it('splits quality stats from text', () => {
    const result = normalizeSkill({ name: 'Boneshatter', quality_stat_text: '0.5% increased Attack Speed\n1% increased Damage' }, NOW);
    expect(result.qualityStats).toEqual(['0.5% increased Attack Speed', '1% increased Damage']);
  });

  it('defaults type to active when absent', () => {
    const result = normalizeSkill({ name: 'Unknown' }, NOW);
    expect(result.type).toBe('active');
  });

  it('defaults missing fields', () => {
    const result = normalizeSkill({ name: 'Test' }, NOW);
    expect(result.gemLevel).toBe(20);
    expect(result.manaMultiplier).toBe(100);
    expect(result.qualityStats).toEqual([]);
    expect(result.tags).toEqual([]);
    expect(result.source).toBe('unknown');
    expect(result.sourceUrl).toBe('');
  });

  it('deduplicates skills', () => {
    const results = normalizeSkills([{ name: 'Fireball' }, { name: 'FIREBALL' }, { name: 'Ice Nova' }], NOW);
    expect(results.length).toBe(2);
  });

  it('returns empty for empty array', () => {
    expect(normalizeSkills([], NOW)).toEqual([]);
  });
});

describe('mod normalizer', () => {
  it('normalizes a mod record', () => {
    const result = normalizeMod({
      name: '+50 to maximum life',
      domain: 'item',
      generationType: 'prefix',
      values: [50],
      tags: ['life'],
      tiers: [1],
    });
    expect(result.name).toBe('+50 to maximum life');
    expect(result.domain).toBe('item');
    expect(result.values).toEqual([50]);
  });

  it('defaults missing fields', () => {
    const result = normalizeMod({ name: 'Test' });
    expect(result.domain).toBe('item');
    expect(result.generationType).toBe('prefix');
    expect(result.values).toEqual([]);
    expect(result.tags).toEqual([]);
    expect(result.tiers).toEqual([]);
  });

  it('deduplicates mods', () => {
    const results = normalizeMods([
      { name: '+50 to maximum life' },
      { name: '+50 to maximum life' },
      { name: '+30 to maximum mana' },
    ]);
    expect(results.length).toBe(2);
  });

  it('returns empty for empty array', () => {
    expect(normalizeMods([])).toEqual([]);
  });
});

describe('economy normalizer', () => {
  it('normalizes a currency entry', () => {
    const result = normalizeEconomyEntry(
      { currencyTypeName: 'Divine Orb', chaosEquivalent: 230, divineEquivalent: 1, listingCount: 500 },
      'Standard',
      NOW,
    );
    expect(result.currency).toBe('Divine Orb');
    expect(result.chaosEquivalent).toBe(230);
    expect(result.divineEquivalent).toBe(1);
    expect(result.snapshotTime).toBe(NOW);
    expect(result.history).toHaveLength(1);
  });

  it('normalizes an item entry with name fallback', () => {
    const result = normalizeEconomyEntry(
      { name: 'Mageblood', chaosValue: 45000, divineValue: 195, listingCount: 120 },
      'Necropolis',
      NOW,
    );
    expect(result.currency).toBe('Mageblood');
    expect(result.chaosEquivalent).toBe(45000);
  });

  it('filters empty entries', () => {
    const results = normalizeEconomyEntries([
      { currencyTypeName: '' },
      { name: 'Valid' },
    ], 'Standard', NOW);
    expect(results).toHaveLength(1);
  });

  it('returns empty for empty array', () => {
    expect(normalizeEconomyEntries([], 'Standard', NOW)).toEqual([]);
  });
});
