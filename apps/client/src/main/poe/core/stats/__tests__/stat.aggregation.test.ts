import { describe, it, expect } from 'vitest';
import { collectItemStats } from '../collectors/item.collector.js';
import { collectSkillStats } from '../collectors/skill.collector.js';
import { collectTreeStats } from '../collectors/tree.collector.js';
import { resolveModifiers } from '../resolvers/modifier.resolver.js';
import { resolveConditionalModifiers } from '../resolvers/conditional.resolver.js';
import { applyKeystoneEffects } from '../resolvers/keystone.resolver.js';
import { aggregateCharacterStats } from '../aggregator/stat.aggregator.js';
import type { EquippedItem } from '@helper/shared';
import type { SkillSetup } from '../../skills/models/skill.model.js';
import type { PassiveTree } from '../../tree/models/passive-tree.model.js';
import type { StatValue } from '../models/stat.model.js';

function makeItem(overrides: Partial<EquippedItem['computedStats']> = {}): EquippedItem {
  return {
    slot: 'helm',
    identity: { name: 'Test Helm', baseType: 'Great Crown', rarity: 'rare' },
    rawMods: [],
    computedStats: {
      armour: 0, evasion: 0, energyShield: 0, ward: 0,
      life: 0, mana: 0,
      resistances: { fire: 0, cold: 0, lightning: 0, chaos: 0 },
      maxResistances: { fire: 0, cold: 0, lightning: 0 },
      attributes: { str: 0, dex: 0, int: 0 },
      flatDamage: [],
      increasedDamage: {},
      castSpeed: 0, attackSpeed: 0,
      criticalChance: 0, criticalMultiplier: 0,
      spellSuppression: 0,
      blockChance: { attack: 0, spell: 0 },
      lifeRegen: 0, onBlockGain: 0, movementSpeed: 0,
      implicits: [], explicits: [], crafts: [],
      ...overrides,
    },
    sockets: [],
  };
}

describe('item collector', () => {
  it('collects flat life from item', () => {
    const items = [makeItem({ life: 99 })];
    const stats = collectItemStats(items);
    expect(stats).toContainEqual({ name: 'life', value: 99, source: 'item', type: 'flat' });
  });

  it('collects resistances from item', () => {
    const items = [makeItem({ resistances: { fire: 30, cold: 20, lightning: 0, chaos: 10 } })];
    const stats = collectItemStats(items);
    expect(stats).toContainEqual({ name: 'fireResistance', value: 30, source: 'item', type: 'flat' });
    expect(stats).toContainEqual({ name: 'coldResistance', value: 20, source: 'item', type: 'flat' });
    expect(stats).toContainEqual({ name: 'chaosResistance', value: 10, source: 'item', type: 'flat' });
    expect(stats.find((s) => s.name === 'lightningResistance')).toBeUndefined();
  });

  it('collects attributes from item', () => {
    const items = [makeItem({ attributes: { str: 30, dex: 0, int: 25 } })];
    const stats = collectItemStats(items);
    expect(stats).toContainEqual({ name: 'strength', value: 30, source: 'item', type: 'flat' });
    expect(stats).toContainEqual({ name: 'intelligence', value: 25, source: 'item', type: 'flat' });
  });

  it('collects flat damage from item', () => {
    const items = [makeItem({ flatDamage: [{ type: 'physical', min: 10, max: 20 }] })];
    const stats = collectItemStats(items);
    expect(stats).toContainEqual({ name: 'physicalDamage', value: 10, source: 'item', type: 'flat' });
    expect(stats).toContainEqual({ name: 'physicalDamage', value: 20, source: 'item', type: 'flat' });
  });

  it('collects increased damage from item', () => {
    const items = [makeItem({ increasedDamage: { fireDamage: 30, spellDamage: 50 } })];
    const stats = collectItemStats(items);
    expect(stats).toContainEqual({ name: 'fireDamageDamage', value: 30, source: 'item', type: 'increased' });
    expect(stats).toContainEqual({ name: 'spellDamageDamage', value: 50, source: 'item', type: 'increased' });
  });

  it('collects armour and evasion from item', () => {
    const items = [makeItem({ armour: 1500, evasion: 500 })];
    const stats = collectItemStats(items);
    expect(stats).toContainEqual({ name: 'armour', value: 1500, source: 'item', type: 'flat' });
    expect(stats).toContainEqual({ name: 'evasion', value: 500, source: 'item', type: 'flat' });
  });

  it('collects from multiple items', () => {
    const items = [makeItem({ life: 99 }), makeItem({ life: 50 })];
    const stats = collectItemStats(items);
    const lifeStats = stats.filter((s) => s.name === 'life');
    expect(lifeStats.length).toBe(2);
  });

  it('skips zero-value stats', () => {
    const items = [makeItem({ life: 0 })];
    const stats = collectItemStats(items);
    expect(stats.filter((s) => s.name === 'life')).toEqual([]);
  });
});

describe('modifier resolver', () => {
  it('sums flat values of the same stat', () => {
    const raw: StatValue[] = [
      { name: 'life', value: 99, source: 'item', type: 'flat' },
      { name: 'life', value: 50, source: 'item', type: 'flat' },
    ];
    const result = resolveModifiers(raw);
    expect(result.flat['life']).toBe(149);
  });

  it('sums increased percentages', () => {
    const raw: StatValue[] = [
      { name: 'life', value: 30, source: 'item', type: 'increased' },
      { name: 'life', value: 20, source: 'tree', type: 'increased' },
    ];
    const result = resolveModifiers(raw);
    expect(result.increased['life']).toBe(50);
  });

  it('multiplies more multipliers together', () => {
    const raw: StatValue[] = [
      { name: 'moreDamage', value: 40, source: 'skill', type: 'more' },
      { name: 'moreDamage', value: 30, source: 'skill', type: 'more' },
    ];
    const result = resolveModifiers(raw);
    expect(result.more['moreDamage']).toBeCloseTo(1.4 * 1.3);
  });

  it('extracts conversion chain entries', () => {
    const raw: StatValue[] = [
      { name: 'physical_to_fire', value: 50, source: 'skill', type: 'conversion' },
    ];
    const result = resolveModifiers(raw);
    expect(result.conversions.length).toBe(1);
    expect(result.conversions[0]!.from).toBe('physical');
    expect(result.conversions[0]!.to).toBe('fire');
  });
});

describe('conditional resolver', () => {
  it('always returns active for "always" condition', () => {
    const result = resolveConditionalModifiers(
      [{ stat: { name: 'life', value: 100, source: 'item', type: 'flat' }, condition: 'always' }],
      { hasCharges: false, isLowLife: false, isFullLife: false, isLeeching: false, isBoss: false },
    );
    expect(result.length).toBe(1);
  });

  it('filters out inactive conditions', () => {
    const result = resolveConditionalModifiers(
      [{ stat: { name: 'damage', value: 30, source: 'item', type: 'increased' }, condition: 'requiresLowLife' }],
      { hasCharges: false, isLowLife: false, isFullLife: false, isLeeching: false, isBoss: false },
    );
    expect(result).toEqual([]);
  });

  it('returns active when condition matches', () => {
    const result = resolveConditionalModifiers(
      [{ stat: { name: 'damage', value: 30, source: 'item', type: 'increased' }, condition: 'requiresLowLife' }],
      { hasCharges: false, isLowLife: true, isFullLife: false, isLeeching: false, isBoss: false },
    );
    expect(result.length).toBe(1);
  });
});

describe('keystone resolver', () => {
  it('applies CI life override', () => {
    const raw: StatValue[] = [
      { name: 'Chaos Inoculation', value: 1, source: 'keystone', type: 'flat' },
      { name: 'life', value: 5000, source: 'item', type: 'flat' },
    ];
    const result = applyKeystoneEffects(raw);
    expect(result.overrides['life']).toBe(1);
    expect(result.flags).toContain('chaos_immunity');
  });

  it('returns empty overrides for non-keystone mods', () => {
    const raw: StatValue[] = [
      { name: 'life', value: 5000, source: 'item', type: 'flat' },
    ];
    const result = applyKeystoneEffects(raw);
    expect(result.overrides).toEqual({});
    expect(result.flags).toEqual([]);
  });
});

describe('stat aggregator', () => {
  const emptyTree: PassiveTree = {
    version: '3.25',
    nodes: [],
    keystones: [],
    masteries: [],
    ascendancy: [],
    clusterJewels: [],
  };

  it('aggregates life from items and tree', () => {
    const result = aggregateCharacterStats({
      items: [makeItem({ life: 99 }), makeItem({ life: 120 })],
      skills: [],
      tree: {
        ...emptyTree,
        nodes: [
          {
            id: 1, name: '+10 life', type: 'small',
            stats: [{ id: 'm1', source: 'tree', category: 'explicit', text: '+10 life', stats: [{ stat: 'life', value: 10, type: 'flat' }], tags: [], values: [10] }],
            allocated: true,
          },
        ],
      },
    });
    expect(result.defense.life).toBe(229);
    expect(result.rawModifiers.length).toBeGreaterThan(0);
  });

  it('aggregates resistances from items', () => {
    const result = aggregateCharacterStats({
      items: [makeItem({ resistances: { fire: 45, cold: 40, lightning: 38, chaos: 0 } })],
      skills: [],
      tree: emptyTree,
    });
    expect(result.defense.fireResistance).toBe(45);
    expect(result.defense.coldResistance).toBe(40);
    expect(result.defense.lightningResistance).toBe(38);
    expect(result.defense.chaosResistance).toBe(0);
  });

  it('handles empty build gracefully', () => {
    const result = aggregateCharacterStats({ items: [], skills: [], tree: emptyTree });
    expect(result.defense.life).toBe(0);
    expect(result.offense.attackSpeed).toBe(0);
    expect(result.attributes.strength).toBe(0);
    expect(result.mechanics.keystones).toEqual([]);
  });

  it('tracks keystones in mechanics', () => {
    const result = aggregateCharacterStats({
      items: [],
      skills: [],
      tree: {
        ...emptyTree,
        keystones: [{ name: 'Chaos Inoculation', effects: ['life_set_to_one', 'immune_chaos'], tags: ['defense'] }],
      },
    });
    expect(result.mechanics.keystones).toContain('Chaos Inoculation');
    expect(result.mechanics.overrides['life']).toBe(1);
    expect(result.defense.life).toBe(1);
  });

  it('aggregates attributes from items', () => {
    const result = aggregateCharacterStats({
      items: [makeItem({ attributes: { str: 30, dex: 0, int: 25 } })],
      skills: [],
      tree: emptyTree,
    });
    expect(result.attributes.strength).toBe(30);
    expect(result.attributes.dexterity).toBe(0);
    expect(result.attributes.intelligence).toBe(25);
  });

  it('aggregates flat damage from items', () => {
    const result = aggregateCharacterStats({
      items: [makeItem({ flatDamage: [{ type: 'physical', min: 10, max: 20 }] })],
      skills: [],
      tree: emptyTree,
    });
    const physDmg = result.offense.flatDamage['physicalDamage'];
    expect(physDmg).toBeDefined();
  });

  it('collects increased damage from items', () => {
    const result = aggregateCharacterStats({
      items: [makeItem({ increasedDamage: { elementalDamageWithAttacks: 30 } })],
      skills: [],
      tree: emptyTree,
    });
    expect(result.offense.increasedDamage['elementalDamageWithAttacksDamage']).toBe(30);
  });

  it('collects spell suppression from items', () => {
    const result = aggregateCharacterStats({
      items: [makeItem({ spellSuppression: 18 })],
      skills: [],
      tree: emptyTree,
    });
    expect(result.defense.spellSuppression).toBe(18);
  });

  it('aggregates increased speed from items', () => {
    const result = aggregateCharacterStats({
      items: [makeItem({ attackSpeed: 20, castSpeed: 15 })],
      skills: [],
      tree: emptyTree,
    });
    expect(result.offense.attackSpeed).toBe(20);
    expect(result.offense.castSpeed).toBe(15);
  });
});
