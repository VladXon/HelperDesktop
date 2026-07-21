import { describe, it, expect } from 'vitest';
import { normalizeItem, normalizeItems } from '../normalizers/item.normalizer.js';
import type { PoeItemRecord } from '@helper/shared';

describe('item normalizer', () => {
  it('normalizes a basic item with name and baseType', () => {
    const result = normalizeItem({ name: 'Kaom\'s Heart', baseType: 'Glorious Plate' });
    expect(result.name).toBe('Kaom\'s Heart');
    expect(result.baseType).toBe('Glorious Plate');
    expect(result.game).toBe('poe1');
    expect(result.category).toBe('unique');
  });

  it('uses baseType as name when name is missing', () => {
    const result = normalizeItem({ baseType: 'Glorious Plate' });
    expect(result.name).toBe('Glorious Plate');
    expect(result.baseType).toBe('Glorious Plate');
  });

  it('returns empty string itemType when not provided', () => {
    const result = normalizeItem({ name: 'Test Item' });
    expect(result.itemType).toBe('');
    expect(result.level).toBe(0);
  });

  it('preserves provided fields', () => {
    const result = normalizeItem({
      name: 'Mageblood',
      baseType: 'Heavy Belt',
      itemType: 'Belt',
      requiredLevel: 44,
      flavourText: 'Take what you need...',
      explicitStats: { life: 80 },
      dropSources: ['The Feared'],
      icon: '/icon.png',
      source: 'wiki',
      sourceUrl: 'https://poewiki.net/wiki/Mageblood',
    });
    expect(result.itemType).toBe('Belt');
    expect(result.requiredLevel).toBe(44);
    expect(result.flavourText).toBe('Take what you need...');
    expect(result.explicitStats).toEqual({ life: 80 });
    expect(result.dropSources).toEqual(['The Feared']);
    expect(result.sourceUrl).toBe('https://poewiki.net/wiki/Mageblood');
  });

  it('deduplicates items by name case-insensitively', () => {
    const results = normalizeItems([
      { name: 'Mageblood' },
      { name: 'mageblood' },
      { name: 'Mageblood' },
      { name: 'Headhunter' },
    ]);
    expect(results.length).toBe(2);
    const names = results.map((r) => r.name.toLowerCase());
    expect(names).toContain('mageblood');
    expect(names).toContain('headhunter');
  });

  it('filters out items without names', () => {
    const results = normalizeItems([
      { name: '' },
      { name: 'Valid' },
      { baseType: '' },
    ]);
    expect(results.length).toBe(1);
  });

  it('maps item type from name when not provided', () => {
    const ring = normalizeItem({ name: 'Diamond Ring' });
    expect(ring.itemType).toBe('Ring');

    const amulet = normalizeItem({ name: 'Onyx Amulet' });
    expect(amulet.itemType).toBe('Amulet');

    const belt = normalizeItem({ name: 'Leather Belt' });
    expect(belt.itemType).toBe('Belt');

    const weapon = normalizeItem({ name: 'Despot Axe' });
    expect(weapon.itemType).toBe('Weapon');

    const boot = normalizeItem({ name: 'Two-Toned Boots' });
    expect(boot.itemType).toBe('Boots');
  });
});

describe('skill normalizer', () => {
  it('normalizes a skill record', async () => {
    const { normalizeSkill } = await import('../normalizers/skill.normalizer.js');
    const result = normalizeSkill({ name: 'Fireball', type: 'active' });
    expect(result.name).toBe('Fireball');
    expect(result.type).toBe('active');
    expect(result.gemLevel).toBe(20);
    expect(result.game).toBe('poe1');
  });

  it('splits quality stats from text', async () => {
    const { normalizeSkill } = await import('../normalizers/skill.normalizer.js');
    const result = normalizeSkill({
      name: 'Boneshatter',
      quality_stat_text: '0.5% increased Attack Speed\n1% increased Damage',
    });
    expect(result.qualityStats).toHaveLength(2);
    expect(result.qualityStats[0]).toContain('Attack Speed');
  });

  it('deduplicates skills', async () => {
    const { normalizeSkills } = await import('../normalizers/skill.normalizer.js');
    const results = normalizeSkills([
      { name: 'Fireball' },
      { name: 'FIREBALL' },
      { name: 'Ice Nova' },
    ]);
    expect(results).toHaveLength(2);
  });
});

describe('mod normalizer', () => {
  it('normalizes a mod record', async () => {
    const { normalizeMod } = await import('../normalizers/mod.normalizer.js');
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

  it('deduplicates mods', async () => {
    const { normalizeMods } = await import('../normalizers/mod.normalizer.js');
    const results = normalizeMods([
      { name: '+50 to maximum life' },
      { name: '+50 to maximum life' },
      { name: '+30 to maximum mana' },
    ]);
    expect(results).toHaveLength(2);
  });
});
