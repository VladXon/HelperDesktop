import { describe, it, expect } from 'vitest';
import {
  calculateBuild,
  ComputedStats,
  createModifier,
  createModDB,
  createSnapshot,
  defaultConditionState,
  state,
  S,
} from '../index.js';
import type { ConditionState } from '../conditions/condition-expr.js';

function makeState(overrides: Partial<ConditionState> = {}): ConditionState {
  return { ...defaultConditionState(), ...overrides };
}

// ─── COMPUTED STATS ───────────────────────────────────────

describe('ComputedStats', () => {
  it('get returns stored value', () => {
    const cs = new ComputedStats({ 'defense.life': 1500 });
    expect(cs.get(S['defense.life'])).toBe(1500);
  });

  it('get returns defaultBase for missing stat', () => {
    const cs = new ComputedStats({});
    expect(cs.get(S['defense.life'])).toBe(0);
    expect(cs.get(S['resistance.maxFire'])).toBe(75);
  });

  it('has checks existence', () => {
    const cs = new ComputedStats({ 'defense.life': 1500 });
    expect(cs.has(S['defense.life'])).toBe(true);
    expect(cs.has(S['defense.energyShield'])).toBe(false);
  });

  it('all returns frozen record', () => {
    const cs = new ComputedStats({ 'defense.life': 1500 });
    const all = cs.all();
    expect(all['defense.life']).toBe(1500);
    expect(() => {
      (all as Record<string, number>)['new'] = 1;
    }).toThrow();
  });

  it('size returns count of computed stats', () => {
    const cs = new ComputedStats({ 'defense.life': 1500, 'defense.energyShield': 500 });
    expect(cs.size).toBe(2);
  });
});

// ─── BASE CALCULATION ─────────────────────────────────────

describe('calculateBuild', () => {
  it('base life = 1000, no mods → result = 1000', () => {
    const result = calculateBuild({
      baseStats: { 'defense.life': 1000 },
      modSnapshot: createSnapshot([]),
      conditionState: makeState(),
    });

    expect(result.stats.get(S['defense.life'])).toBe(1000);
  });

  it('base life = 1000 + flat 500 → 1500', () => {
    const flatMod = createModifier({
      source: 'item',
      type: 'flat',
      stat: S['defense.life'],
      value: 500,
      meta: { name: 'Gear life' },
    });

    const result = calculateBuild({
      baseStats: { 'defense.life': 1000 },
      modSnapshot: createSnapshot([flatMod]),
      conditionState: makeState(),
    });

    expect(result.stats.get(S['defense.life'])).toBe(1500);
  });

  it('base 1000 + flat 50 + 100% increased → 2100', () => {
    const flatMod = createModifier({
      source: 'item',
      type: 'flat',
      stat: S['defense.life'],
      value: 50,
      meta: { name: 'Gear' },
    });
    const incMod = createModifier({
      source: 'passiveTree',
      type: 'increased',
      stat: S['defense.life'],
      value: 100,
      meta: { name: '100% inc' },
    });

    const result = calculateBuild({
      baseStats: { 'defense.life': 1000 },
      modSnapshot: createSnapshot([flatMod, incMod]),
      conditionState: makeState(),
    });

    const expected = (1000 + 50) * (1 + 100 / 100);
    expect(result.stats.get(S['defense.life'])).toBe(expected);
  });

  it('base 1000 + 20% more → 1200', () => {
    const moreMod = createModifier({
      source: 'supportGem',
      type: 'more',
      stat: S['defense.life'],
      value: 20,
      meta: { name: '20% more' },
    });

    const result = calculateBuild({
      baseStats: { 'defense.life': 1000 },
      modSnapshot: createSnapshot([moreMod]),
      conditionState: makeState(),
    });

    expect(result.stats.get(S['defense.life'])).toBe(1000 * 1.2);
  });

  it('multiple stats computed together', () => {
    const lifeFlat = createModifier({
      source: 'item',
      type: 'flat',
      stat: S['defense.life'],
      value: 500,
      meta: { name: 'Life' },
    });
    const esFlat = createModifier({
      source: 'item',
      type: 'flat',
      stat: S['defense.energyShield'],
      value: 300,
      meta: { name: 'ES' },
    });

    const result = calculateBuild({
      baseStats: { 'defense.life': 800, 'defense.energyShield': 200 },
      modSnapshot: createSnapshot([lifeFlat, esFlat]),
      conditionState: makeState(),
    });

    expect(result.stats.get(S['defense.life'])).toBe(1300);
    expect(result.stats.get(S['defense.energyShield'])).toBe(500);
  });
});

// ─── CONDITIONAL MODIFIERS ────────────────────────────────

describe('calculateBuild — conditional modifiers', () => {
  it('conditional applied when condition is met', () => {
    const fireBase = createModifier({
      source: 'base',
      type: 'flat',
      stat: S['offense.fireDamage'],
      value: 100,
      meta: { name: 'Fire base' },
    });
    const fireBonus = createModifier({
      source: 'item',
      type: 'increased',
      stat: S['offense.fireDamage'],
      value: 50,
      condition: state('Burning'),
      meta: { name: 'Burning bonus' },
    });

    const resultBurning = calculateBuild({
      baseStats: { 'offense.fireDamage': 100 },
      modSnapshot: createSnapshot([fireBonus]),
      conditionState: makeState({
        playerStates: new Map([['Burning', true]]),
      }),
    });

    expect(resultBurning.stats.get(S['offense.fireDamage'])).toBe(
      100 * (1 + 50 / 100),
    );
  });

  it('conditional skipped when condition is unmet', () => {
    const fireBonus = createModifier({
      source: 'item',
      type: 'increased',
      stat: S['offense.fireDamage'],
      value: 50,
      condition: state('Burning'),
      meta: { name: 'Burning bonus' },
    });

    const resultIdle = calculateBuild({
      baseStats: { 'offense.fireDamage': 100 },
      modSnapshot: createSnapshot([fireBonus]),
      conditionState: makeState(),
    });

    expect(resultIdle.stats.get(S['offense.fireDamage'])).toBe(100);
  });

  it('Pain Attunement: 30% more spell damage on low life', () => {
    const spellBase = createModifier({
      source: 'base',
      type: 'flat',
      stat: S['offense.spellDamage'],
      value: 200,
      meta: { name: 'Spell base' },
    });
    const painAttunement = createModifier({
      source: 'keystone',
      type: 'more',
      stat: S['offense.spellDamage'],
      value: 30,
      condition: state('LowLife'),
      meta: { name: 'Pain Attunement' },
    });

    const lowLife = calculateBuild({
      baseStats: { 'offense.spellDamage': 200 },
      modSnapshot: createSnapshot([painAttunement]),
      conditionState: makeState({
        playerStates: new Map([['LowLife', true]]),
      }),
    });
    const normal = calculateBuild({
      baseStats: { 'offense.spellDamage': 200 },
      modSnapshot: createSnapshot([painAttunement]),
      conditionState: makeState(),
    });

    expect(lowLife.stats.get(S['offense.spellDamage'])).toBe(200 * 1.3);
    expect(normal.stats.get(S['offense.spellDamage'])).toBe(200);
  });
});

// ─── LAYERS ───────────────────────────────────────────────

describe('calculateBuild — layers', () => {
  it('base layer is always present', () => {
    const result = calculateBuild({
      baseStats: { 'defense.life': 1000 },
      modSnapshot: createSnapshot([]),
      conditionState: makeState(),
    });

    expect(result.layers).toHaveLength(1);
    expect(result.layers[0].source).toBe('base');
    expect(result.layers[0].modifiers).toHaveLength(1);
  });

  it('modifiers grouped by source', () => {
    const itemMod = createModifier({
      source: 'item',
      type: 'flat',
      stat: S['defense.life'],
      value: 50,
      meta: { name: 'Item' },
    });
    const passiveMod = createModifier({
      source: 'passiveTree',
      type: 'increased',
      stat: S['defense.life'],
      value: 10,
      meta: { name: 'Passive' },
    });

    const result = calculateBuild({
      baseStats: { 'defense.life': 1000 },
      modSnapshot: createSnapshot([itemMod, passiveMod]),
      conditionState: makeState(),
    });

    expect(result.layers).toHaveLength(3);

    const baseLayer = result.layers.find((l) => l.source === 'base')!;
    expect(baseLayer.modifiers).toHaveLength(1);
    expect(baseLayer.modifiers[0].source).toBe('base');

    const itemLayer = result.layers.find((l) => l.source === 'item')!;
    expect(itemLayer.modifiers).toHaveLength(1);
    expect(itemLayer.modifiers[0].meta.name).toBe('Item');

    const passiveLayer = result.layers.find((l) => l.source === 'passiveTree')!;
    expect(passiveLayer.modifiers[0].meta.name).toBe('Passive');
  });

  it('empty base stats → no base layer', () => {
    const mod = createModifier({
      source: 'item',
      type: 'flat',
      stat: S['defense.life'],
      value: 50,
      meta: { name: 'Item' },
    });

    const result = calculateBuild({
      baseStats: {},
      modSnapshot: createSnapshot([mod]),
      conditionState: makeState(),
    });

    expect(result.layers.find((l) => l.source === 'base')).toBeUndefined();
  });
});

// ─── SNAPSHOT IMMUTABILITY ────────────────────────────────

describe('calculateBuild — snapshot immutability', () => {
  it('snapshot is not mutated by calculation', () => {
    const mod = createModifier({
      source: 'item',
      type: 'flat',
      stat: S['defense.life'],
      value: 50,
      meta: { name: 'Item' },
    });
    const snap = createSnapshot([mod]);

    calculateBuild({
      baseStats: { 'defense.life': 1000 },
      modSnapshot: snap,
      conditionState: makeState(),
    });

    expect(snap.size).toBe(1);
    expect(snap.modifiers).toHaveLength(1);
  });
});

// ─── FULL PIPELINE ────────────────────────────────────────

describe('calculateBuild — full pipeline', () => {
  it('build from multiple sources with mixed types', () => {
    const itemLife = createModifier({
      source: 'item',
      type: 'flat',
      stat: S['defense.life'],
      value: 300,
      meta: { name: 'Body armour' },
    });
    const itemLife2 = createModifier({
      source: 'item',
      type: 'flat',
      stat: S['defense.life'],
      value: 80,
      meta: { name: 'Ring' },
    });
    const passiveInc = createModifier({
      source: 'passiveTree',
      type: 'increased',
      stat: S['defense.life'],
      value: 60,
      meta: { name: 'Life nodes' },
    });
    const ascendancyMore = createModifier({
      source: 'ascendancy',
      type: 'more',
      stat: S['defense.life'],
      value: 15,
      meta: { name: 'Ascendancy more' },
    });

    const result = calculateBuild({
      baseStats: { 'defense.life': 800 },
      modSnapshot: createSnapshot([itemLife, itemLife2, passiveInc, ascendancyMore]),
      conditionState: makeState(),
    });

    const expected = (800 + 300 + 80) * (1 + 60 / 100) * 1.15;
    expect(result.stats.get(S['defense.life'])).toBe(expected);

    expect(result.layers).toHaveLength(4); // base + item + passiveTree + ascendancy
  });

  it('flag stat (CI) computed correctly', () => {
    const ciMod = createModifier({
      source: 'keystone',
      type: 'override',
      stat: S['mechanic.keystone_ci'],
      value: 1,
      meta: { name: 'Chaos Inoculation' },
    });

    const result = calculateBuild({
      baseStats: {},
      modSnapshot: createSnapshot([ciMod]),
      conditionState: makeState(),
    });

    expect(result.stats.get(S['mechanic.keystone_ci'])).toBe(1);
  });

  it('max resist calculation', () => {
    const maxFireMod = createModifier({
      source: 'passiveTree',
      type: 'flat',
      stat: S['resistance.maxFire'],
      value: 2,
      meta: { name: '+2% max fire res' },
    });

    const result = calculateBuild({
      baseStats: {},
      modSnapshot: createSnapshot([maxFireMod]),
      conditionState: makeState(),
    });

    expect(result.stats.get(S['resistance.maxFire'])).toBe(77);
  });
});

// ─── INTEGRATION WITH ModDB ───────────────────────────────

describe('calculateBuild — ModDB integration', () => {
  it('snapshot from ModDB works', () => {
    const db = createModDB();
    db.add(
      createModifier({
        source: 'item',
        type: 'flat',
        stat: S['defense.life'],
        value: 400,
        meta: { name: 'Belt' },
      }),
    );
    db.add(
      createModifier({
        source: 'passiveTree',
        type: 'increased',
        stat: S['defense.life'],
        value: 25,
        meta: { name: 'Life nodes' },
      }),
    );

    const snap = db.snapshot();
    const result = calculateBuild({
      baseStats: { 'defense.life': 600 },
      modSnapshot: snap,
      conditionState: makeState(),
    });

    const expected = (600 + 400) * (1 + 25 / 100);
    expect(result.stats.get(S['defense.life'])).toBe(expected);
  });
});

// ─── EDGE CASES ───────────────────────────────────────────

describe('calculateBuild — edge cases', () => {
  it('empty build returns zeros via defaultBase', () => {
    const result = calculateBuild({
      baseStats: {},
      modSnapshot: createSnapshot([]),
      conditionState: makeState(),
    });

    expect(result.stats.get(S['defense.life'])).toBe(0);
    expect(result.stats.all()).toEqual({});
  });

  it('base stat value of 0 is skipped', () => {
    const result = calculateBuild({
      baseStats: { 'defense.life': 0 },
      modSnapshot: createSnapshot([]),
      conditionState: makeState(),
    });

    expect(result.stats.get(S['defense.life'])).toBe(0);
    expect(result.stats.all()).toEqual({});
  });

  it('unknown base stat is silently ignored', () => {
    const result = calculateBuild({
      baseStats: { 'nonexistent.stat': 999 },
      modSnapshot: createSnapshot([]),
      conditionState: makeState(),
    });

    expect(result.stats.all()).toEqual({});
  });
});
