import { describe, it, expect } from 'vitest';
import { createModifier, createModifiers } from '../mod.factory.js';

describe('modifier factory', () => {
  it('creates a Modifier with all fields from explicit life mod', () => {
    const mod = createModifier({
      text: '+99 to maximum life',
      implicit: false,
      explicit: true,
      crafted: false,
      source: 'item',
    });

    expect(mod.source).toBe('item');
    expect(mod.category).toBe('explicit');
    expect(mod.text).toBe('+99 to maximum life');
    expect(mod.stats.length).toBe(1);
    expect(mod.stats[0]!.stat).toBe('life');
    expect(mod.stats[0]!.value).toBe(99);
    expect(mod.stats[0]!.type).toBe('flat');
    expect(mod.tags).toContain('life');
    expect(mod.values).toEqual([99]);
    expect(mod.tier).toBeUndefined();
  });

  it('creates a Modifier from crafted mod', () => {
    const mod = createModifier({
      text: '+15% to cold resistance',
      implicit: false,
      explicit: false,
      crafted: true,
      source: 'item',
    });

    expect(mod.category).toBe('crafted');
    expect(mod.stats[0]!.stat).toBe('coldResistance');
    expect(mod.stats[0]!.value).toBe(15);
  });

  it('creates a Modifier from implicit mod', () => {
    const mod = createModifier({
      text: '+12% to all elemental resistances',
      implicit: true,
      explicit: false,
      crafted: false,
      source: 'item',
    });

    expect(mod.category).toBe('implicit');
    expect(mod.stats.length).toBe(3);
  });

  it('identifies veiled modifiers', () => {
    const mod = createModifier({
      text: 'Veiled suffix',
      implicit: false,
      explicit: true,
      crafted: false,
      source: 'item',
    });

    expect(mod.category).toBe('veiled');
  });

  it('creates multiple modifiers from array', () => {
    const mods = createModifiers([
      { text: '+99 to maximum life', implicit: false, explicit: true, crafted: false, source: 'item' },
      { text: '+30% to fire resistance', implicit: false, explicit: true, crafted: false, source: 'item' },
    ]);

    expect(mods.length).toBe(2);
    expect(mods[0]!.id).not.toBe(mods[1]!.id);
  });

  it('generates unique IDs across calls', () => {
    const a = createModifier({ text: 'mod_a', implicit: false, explicit: true, crafted: false, source: 'item' });
    const b = createModifier({ text: 'mod_b', implicit: false, explicit: true, crafted: false, source: 'item' });

    expect(a.id).not.toBe(b.id);
  });

  it('collects flat values for "Adds X to Y damage" mods', () => {
    const mod = createModifier({
      text: 'Adds 15 to 30 physical damage',
      implicit: false,
      explicit: true,
      crafted: false,
      source: 'item',
    });

    expect(mod.values).toEqual([15, 30]);
  });

  it('supports source = tree', () => {
    const mod = createModifier({
      text: '+10 to strength',
      implicit: false,
      explicit: true,
      crafted: false,
      source: 'tree',
    });

    expect(mod.source).toBe('tree');
  });

  it('supports source = gem', () => {
    const mod = createModifier({
      text: 'Supported Skills deal 40% more damage',
      implicit: false,
      explicit: true,
      crafted: false,
      source: 'gem',
    });

    expect(mod.source).toBe('gem');
  });
});
