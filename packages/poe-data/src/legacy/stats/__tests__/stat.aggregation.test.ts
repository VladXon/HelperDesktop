import { describe, it, expect } from 'vitest';
import { collectItemStats } from '../collectors/item.collector.js';
import { collectSkillStats } from '../collectors/skill.collector.js';
import { collectTreeStats } from '../collectors/tree.collector.js';
import { resolveModifiers } from '../resolvers/modifier.resolver.js';
import { resolveConditionalModifiers } from '../resolvers/conditional.resolver.js';
import { applyKeystoneEffects } from '../resolvers/keystone.resolver.js';
import { aggregateCharacterStats } from '../aggregator/stat.aggregator.js';
import { bossEnemy, defaultConditions, defaultCalculationContext } from '../context/index.js';
import type { EquippedItem } from '@helper/shared';
import type { SkillSetup } from '../../skills/models/skill.model.js';
import type { PassiveTree } from '../../tree/models/passive-tree.model.js';
import type { StatValue } from '../models/stat.model.js';

function sv(name: string, value: number, source: StatValue['source'], type: StatValue['type'], overrides: Partial<Pick<StatValue, 'scope' | 'modifierName'>> = {}): StatValue {
  return { name, value, source, type, scope: 'global', modifierName: `${source}:${name}`, ...overrides };
}

function makeItem(overrides: Partial<EquippedItem['computedStats']> = {}, slot: EquippedItem['slot'] = 'helm'): EquippedItem {
  return {
    slot,
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

const emptyTree: PassiveTree = {
  version: '3.25', nodes: [], keystones: [], masteries: [], ascendancy: [], clusterJewels: [],
};

describe('item collector (traced)', () => {
  it('collects flat life from item with modifier name', () => {
    const items = [makeItem({ life: 99 })];
    const stats = collectItemStats(items);
    expect(stats).toContainEqual({
      name: 'life', value: 99, source: 'item', type: 'flat',
      scope: 'global', modifierName: 'Test Helm: life',
    });
  });

  it('marks weapon damage as localItem scope', () => {
    const items = [makeItem({ flatDamage: [{ type: 'physical', min: 10, max: 20 }] }, 'mainHand')];
    const stats = collectItemStats(items);
    expect(stats[0]!.scope).toBe('localItem');
  });
});

describe('modifier resolver', () => {
  it('sums flat values of the same stat', () => {
    const raw: StatValue[] = [
      sv('life', 99, 'item', 'flat'),
      sv('life', 50, 'item', 'flat'),
    ];
    const result = resolveModifiers(raw);
    expect(result.flat['life']).toBe(149);
  });

  it('sums increased percentages', () => {
    const raw: StatValue[] = [
      sv('life', 30, 'item', 'increased'),
      sv('life', 20, 'tree', 'increased'),
    ];
    const result = resolveModifiers(raw);
    expect(result.increased['life']).toBe(50);
  });

  it('multiplies more multipliers together', () => {
    const raw: StatValue[] = [
      sv('moreDamage', 40, 'skill', 'more'),
      sv('moreDamage', 30, 'skill', 'more'),
    ];
    const result = resolveModifiers(raw);
    expect(result.more['moreDamage']).toBeCloseTo(1.4 * 1.3);
  });

  it('extracts conversion chain entries', () => {
    const raw: StatValue[] = [
      sv('physical_to_fire', 50, 'skill', 'conversion'),
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
      [{ stat: sv('life', 100, 'item', 'flat'), condition: 'always' }],
      { hasCharges: false, isLowLife: false, isFullLife: false, isLeeching: false, isBoss: false },
    );
    expect(result.length).toBe(1);
  });

  it('filters out inactive conditions', () => {
    const result = resolveConditionalModifiers(
      [{ stat: sv('damage', 30, 'item', 'increased'), condition: 'requiresLowLife' }],
      { hasCharges: false, isLowLife: false, isFullLife: false, isLeeching: false, isBoss: false },
    );
    expect(result).toEqual([]);
  });

  it('returns active when condition matches', () => {
    const result = resolveConditionalModifiers(
      [{ stat: sv('damage', 30, 'item', 'increased'), condition: 'requiresLowLife' }],
      { hasCharges: false, isLowLife: true, isFullLife: false, isLeeching: false, isBoss: false },
    );
    expect(result.length).toBe(1);
  });
});

describe('context', () => {
  it('creates default calculation context', () => {
    const ctx = defaultCalculationContext();
    expect(ctx.characterLevel).toBe(90);
    expect(ctx.enemy.isBoss).toBe(false);
    expect(ctx.conditions.isLowLife).toBe(false);
  });

  it('creates boss enemy context', () => {
    const enemy = bossEnemy();
    expect(enemy.isBoss).toBe(true);
    expect(enemy.fireResistance).toBe(30);
  });

  it('uber boss has higher resistance and level', () => {
    const enemy = bossEnemy(true);
    expect(enemy.isUber).toBe(true);
    expect(enemy.level).toBe(85);
  });
});

describe('stat aggregator (traced)', () => {
  it('aggregates life from items and tree with source trace', () => {
    const result = aggregateCharacterStats({
      items: [makeItem({ life: 99 }), makeItem({ life: 120 })],
      skills: [],
      tree: {
        ...emptyTree,
        nodes: [{
          id: 1, name: '+10 life', type: 'small',
          stats: [{ id: 'm1', source: 'tree', category: 'explicit', text: '+10 life', stats: [{ stat: 'life', value: 10, type: 'flat' }], tags: [], values: [10] }],
          allocated: true,
        }],
      },
    });
    expect(result.defense.life).toBe(229);
    expect(result.traced.life.value).toBe(229);
    expect(result.traced.life.sources.length).toBe(3);
  });

  it('sources are tracked with identifiable names', () => {
    const result = aggregateCharacterStats({
      items: [makeItem({ life: 99 })],
      skills: [],
      tree: emptyTree,
    });
    const lifeSources = result.traced.life.sources;
    expect(lifeSources.length).toBe(1);
    expect(lifeSources[0]!.source).toBe('Test Helm: life');
  });

  it('handles empty build gracefully', () => {
    const result = aggregateCharacterStats({ items: [], skills: [], tree: emptyTree });
    expect(result.defense.life).toBe(0);
    expect(result.traced.life.value).toBe(0);
    expect(result.traced.life.sources).toEqual([]);
  });

  it('tracks keystones', () => {
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

  it('aggregates resistances from items and trees', () => {
    const result = aggregateCharacterStats({
      items: [
        makeItem({ resistances: { fire: 45, cold: 40, lightning: 38, chaos: 0 } }),
        makeItem({ resistances: { fire: 15, cold: 20, lightning: 0, chaos: 25 } }),
      ],
      skills: [],
      tree: emptyTree,
    });
    expect(result.defense.fireResistance).toBe(60);
    expect(result.traced.fireResistance.sources.length).toBe(2);
  });

  it('local item scope is preserved in trace', () => {
    const result = aggregateCharacterStats({
      items: [
        makeItem({ flatDamage: [{ type: 'physical', min: 10, max: 20 }] }, 'mainHand'),
      ],
      skills: [],
      tree: emptyTree,
    });
    expect(result.offense.flatDamage['physicalDamage']).toBeDefined();
  });

  it('aggregates attributes from items', () => {
    const result = aggregateCharacterStats({
      items: [makeItem({ attributes: { str: 30, dex: 0, int: 25 } })],
      skills: [],
      tree: emptyTree,
    });
    expect(result.attributes.strength).toBe(30);
    expect(result.attributes.intelligence).toBe(25);
  });
});
