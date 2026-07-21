import { describe, it, expect } from 'vitest';
import type { Modifier, ModifierStat, ModSource, ModCategory, StatType } from '../modifier.model.js';

describe('modifier model', () => {
  it('creates a valid Modifier with all required fields', () => {
    const mod: Modifier = {
      id: 'mod_1',
      source: 'item',
      category: 'explicit',
      text: '+99 to maximum life',
      stats: [{ stat: 'life', value: 99, type: 'flat' }],
      tags: ['life'],
      values: [99],
    };

    expect(mod.id).toBe('mod_1');
    expect(mod.source).toBe('item');
    expect(mod.category).toBe('explicit');
    expect(mod.text).toBe('+99 to maximum life');
    expect(mod.stats.length).toBe(1);
    expect(mod.tags).toContain('life');
    expect(mod.values).toEqual([99]);
  });

  it('supports optional tier field', () => {
    const mod: Modifier = {
      id: 'mod_2',
      source: 'item',
      category: 'explicit',
      text: '+99 to maximum life',
      stats: [{ stat: 'life', value: 99, type: 'flat' }],
      tags: ['life'],
      tier: 1,
      values: [99],
    };

    expect(mod.tier).toBe(1);
  });

  it('validates ModSource union', () => {
    const sources: ModSource[] = ['item', 'tree', 'gem', 'cluster', 'jewel'];
    expect(sources.length).toBe(5);
  });

  it('validates ModCategory union', () => {
    const categories: ModCategory[] = [
      'explicit', 'implicit', 'crafted', 'enchant',
      'fractured', 'influence', 'synthesized', 'veiled', 'corrupted',
    ];
    expect(categories.length).toBe(9);
  });

  it('validates StatType union', () => {
    const types: StatType[] = ['flat', 'increased', 'more', 'less', 'conversion', 'chance'];
    expect(types.length).toBe(6);
  });

  it('supports multiple stats from one modifier text', () => {
    const stats: ModifierStat[] = [
      { stat: 'fireResistance', value: 16, type: 'flat' },
      { stat: 'coldResistance', value: 16, type: 'flat' },
      { stat: 'lightningResistance', value: 16, type: 'flat' },
    ];
    expect(stats.length).toBe(3);
  });
});
