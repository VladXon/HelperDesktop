import { describe, it, expect } from 'vitest';
import {
  createModifier,
  resolveModifiers,
  aggregateModifiers,
  defaultConditionState,
  state,
  charge,
  chargeScale,
  constantScale,
  S,
  evaluateEffectiveness,
} from '../index.js';
import type { ConditionState } from '../conditions/condition-expr.js';

function makeState(overrides: Partial<ConditionState> = {}): ConditionState {
  return { ...defaultConditionState(), ...overrides };
}

// ─── MODIFIER CREATION ─────────────────────────────────────

describe('createModifier', () => {
  it('creates a modifier with auto-generated id', () => {
    const mod = createModifier({
      source: 'item',
      type: 'flat',
      stat: S['defense.life'],
      value: 50,
      meta: { name: 'Belt of Life' },
    });

    expect(mod.source).toBe('item');
    expect(mod.type).toBe('flat');
    expect(mod.stat).toBe(S['defense.life']);
    expect(mod.value).toBe(50);
    expect(mod.meta.name).toBe('Belt of Life');
    expect(mod.id).toContain('item');
    expect(mod.id).toContain('flat');
    expect(mod.id).toContain('defense.life');
  });

  it('creates a modifier with explicit id', () => {
    const mod = createModifier({
      source: 'passiveTree',
      type: 'increased',
      stat: S['defense.life'],
      value: 10,
      meta: { name: 'Heart of the Warrior' },
      id: 'heart-of-the-warrior',
    });

    expect(mod.id).toBe('heart-of-the-warrior');
  });

  it('creates a modifier with condition', () => {
    const mod = createModifier({
      source: 'ascendancy',
      type: 'more',
      stat: S['offense.fireDamage'],
      value: 30,
      condition: state('Leeching'),
      meta: { name: 'Leech Burn' },
    });

    expect(mod.condition).toBeDefined();
    expect(mod.condition?.kind).toBe('state');
  });

  it('creates a modifier with scale', () => {
    const mod = createModifier({
      source: 'item',
      type: 'increased',
      stat: S['offense.fireDamage'],
      value: 5,
      scale: chargeScale('frenzy', 1),
      meta: { name: 'Frenzy Fire' },
    });

    expect(mod.scale).toBeDefined();
    expect(mod.scale?.kind).toBe('charge');
  });
});

// ─── RESOLVE MODIFIERS ────────────────────────────────────

describe('resolveModifiers', () => {
  it('resolves all active modifiers', () => {
    const mods = [
      createModifier({
        source: 'passiveTree',
        type: 'flat',
        stat: S['defense.life'],
        value: 50,
        meta: { name: 'Life Node' },
      }),
      createModifier({
        source: 'item',
        type: 'flat',
        stat: S['defense.life'],
        value: 70,
        meta: { name: 'Belt' },
      }),
    ];

    const resolved = resolveModifiers(mods, makeState());
    expect(resolved.length).toBe(2);
    expect(resolved[0].effectiveValue).toBe(50);
    expect(resolved[1].effectiveValue).toBe(70);
  });

  it('filters out modifiers with unmet conditions', () => {
    const mods = [
      createModifier({
        source: 'item',
        type: 'flat',
        stat: S['defense.life'],
        value: 50,
        meta: { name: 'Always' },
      }),
      createModifier({
        source: 'item',
        type: 'flat',
        stat: S['defense.life'],
        value: 30,
        condition: state('Moving'),
        meta: { name: 'Conditional' },
      }),
    ];

    const sIdle = makeState();
    expect(resolveModifiers(mods, sIdle).length).toBe(1);

    const sMoving = makeState({
      playerStates: new Map([['Moving', true]]),
    });
    expect(resolveModifiers(mods, sMoving).length).toBe(2);
  });

  it('applies scale to effective value', () => {
    const mods = [
      createModifier({
        source: 'item',
        type: 'flat',
        stat: S['defense.life'],
        value: 10,
        scale: chargeScale('frenzy', 1),
        meta: { name: 'Scaled' },
      }),
    ];

    const sFrenzy = makeState({
      charges: new Map([['frenzy', 4]]),
    });
    const resolved = resolveModifiers(mods, sFrenzy);
    expect(resolved.length).toBe(1);
    expect(resolved[0].effectiveValue).toBe(40);
  });

  it('skips modifiers with zero effective value', () => {
    const mods = [
      createModifier({
        source: 'item',
        type: 'flat',
        stat: S['defense.life'],
        value: 10,
        scale: constantScale(0),
        meta: { name: 'Zero' },
      }),
    ];

    const resolved = resolveModifiers(mods, makeState());
    expect(resolved.length).toBe(0);
  });

  it('returns empty for no modifiers', () => {
    expect(resolveModifiers([], makeState())).toEqual([]);
  });
});

// ─── AGGREGATION — SUM STATS ─────────────────────────────

describe('aggregateModifiers — sum stats', () => {
  it('flat modifiers are summed', () => {
    const mods = [
      createModifier({
        source: 'base',
        type: 'flat',
        stat: S['defense.life'],
        value: 100,
        meta: { name: 'Base Life' },
      }),
      createModifier({
        source: 'item',
        type: 'flat',
        stat: S['defense.life'],
        value: 50,
        meta: { name: 'Gear' },
      }),
    ];

    const resolved = resolveModifiers(mods, makeState());
    const result = aggregateModifiers(resolved);
    expect(result['defense.life']).toBe(150);
  });

  it('increased modifiers stack additively', () => {
    const mods = [
      createModifier({
        source: 'base',
        type: 'flat',
        stat: S['defense.life'],
        value: 100,
        meta: { name: 'Base' },
      }),
      createModifier({
        source: 'passiveTree',
        type: 'increased',
        stat: S['defense.life'],
        value: 10,
        meta: { name: '10% inc' },
      }),
      createModifier({
        source: 'item',
        type: 'increased',
        stat: S['defense.life'],
        value: 20,
        meta: { name: '20% inc' },
      }),
    ];

    const resolved = resolveModifiers(mods, makeState());
    const result = aggregateModifiers(resolved);
    expect(result['defense.life']).toBe(100 * (1 + 30 / 100));
  });

  it('more modifiers multiply', () => {
    const mods = [
      createModifier({
        source: 'base',
        type: 'flat',
        stat: S['defense.life'],
        value: 100,
        meta: { name: 'Base' },
      }),
      createModifier({
        source: 'item',
        type: 'more',
        stat: S['defense.life'],
        value: 30,
        meta: { name: '30% more' },
      }),
      createModifier({
        source: 'item',
        type: 'more',
        stat: S['defense.life'],
        value: 20,
        meta: { name: '20% more' },
      }),
    ];

    const resolved = resolveModifiers(mods, makeState());
    const result = aggregateModifiers(resolved);
    expect(result['defense.life']).toBe(100 * 1.3 * 1.2);
  });

  it('full pipeline: flat + inc + more + less', () => {
    const mods = [
      createModifier({
        source: 'base',
        type: 'flat',
        stat: S['defense.life'],
        value: 1000,
        meta: { name: 'Base' },
      }),
      createModifier({
        source: 'item',
        type: 'flat',
        stat: S['defense.life'],
        value: 500,
        meta: { name: 'Gear' },
      }),
      createModifier({
        source: 'passiveTree',
        type: 'increased',
        stat: S['defense.life'],
        value: 50,
        meta: { name: '50% inc' },
      }),
      createModifier({
        source: 'skillGem',
        type: 'more',
        stat: S['defense.life'],
        value: 20,
        meta: { name: '20% more' },
      }),
      createModifier({
        source: 'item',
        type: 'less',
        stat: S['defense.life'],
        value: 10,
        meta: { name: '10% less' },
      }),
    ];

    const resolved = resolveModifiers(mods, makeState());
    const result = aggregateModifiers(resolved);

    const expected = (1000 + 500) * (1 + 50 / 100) * 1.2 * 0.9;
    expect(result['defense.life']).toBe(expected);
  });

  it('override replaces full calculation', () => {
    const mods = [
      createModifier({
        source: 'base',
        type: 'flat',
        stat: S['defense.life'],
        value: 1000,
        meta: { name: 'Base' },
      }),
      createModifier({
        source: 'item',
        type: 'increased',
        stat: S['defense.life'],
        value: 100,
        meta: { name: '100% inc' },
      }),
      createModifier({
        source: 'item',
        type: 'override',
        stat: S['defense.life'],
        value: 1,
        meta: { name: 'Kaoms Heart' },
      }),
    ];

    const resolved = resolveModifiers(mods, makeState());
    const result = aggregateModifiers(resolved);
    expect(result['defense.life']).toBe(1);
  });

  it('respects stat defaultCap', () => {
    const mods = [
      createModifier({
        source: 'base',
        type: 'flat',
        stat: S['defense.attackBlock'],
        value: 80,
        meta: { name: 'High block' },
      }),
    ];

    const resolved = resolveModifiers(mods, makeState());
    const result = aggregateModifiers(resolved);
    expect(result['defense.attackBlock']).toBe(75);
  });

  it('returns 0 for unknown stat', () => {
    const mods = [
      createModifier({
        source: 'base',
        type: 'flat',
        stat: S['defense.life'],
        value: 100,
        meta: { name: 'Life' },
      }),
    ];

    const resolved = resolveModifiers(mods, makeState());
    const result = aggregateModifiers(resolved);
    expect(result['nonexistent.stat']).toBeUndefined();
  });
});

// ─── AGGREGATION — PRODUCT STATS ─────────────────────────

describe('aggregateModifiers — product stats', () => {
  it('product stat starts from defaultBase (1)', () => {
    const mods = [
      createModifier({
        source: 'base',
        type: 'increased',
        stat: S['offense.actionSpeed'],
        value: 10,
        meta: { name: '10% inc action speed' },
      }),
    ];

    const resolved = resolveModifiers(mods, makeState());
    const result = aggregateModifiers(resolved);
    expect(result['offense.actionSpeed']).toBe(1 * (1 + 10 / 100));
  });

  it('product stat with flat + inc + more', () => {
    const mods = [
      createModifier({
        source: 'base',
        type: 'increased',
        stat: S['offense.actionSpeed'],
        value: 10,
        meta: { name: '10% inc' },
      }),
      createModifier({
        source: 'item',
        type: 'more',
        stat: S['offense.actionSpeed'],
        value: 20,
        meta: { name: '20% more' },
      }),
    ];

    const resolved = resolveModifiers(mods, makeState());
    const result = aggregateModifiers(resolved);
    expect(result['offense.actionSpeed']).toBe(1 * 1.1 * 1.2);
  });
});

// ─── AGGREGATION — FLAG STATS ────────────────────────────

describe('aggregateModifiers — flag stats', () => {
  it('flag stat is 1 if any modifier with value > 0', () => {
    const mods = [
      createModifier({
        source: 'keystone',
        type: 'override',
        stat: S['mechanic.keystone_ci'],
        value: 1,
        meta: { name: 'Chaos Inoculation' },
      }),
    ];

    const resolved = resolveModifiers(mods, makeState());
    const result = aggregateModifiers(resolved);
    expect(result['mechanic.keystone_ci']).toBe(1);
  });

  it('flag stat is 0 if no modifiers', () => {
    const resolved = resolveModifiers([], makeState());
    const result = aggregateModifiers(resolved);
    expect(result['mechanic.keystone_ci']).toBeUndefined();
  });

  it('flag stat with 0 effective value → undefined (not modified)', () => {
    const mods = [
      createModifier({
        source: 'keystone',
        type: 'override',
        stat: S['mechanic.keystone_ci'],
        value: 0,
        meta: { name: 'Disabled' },
      }),
    ];

    const resolved = resolveModifiers(mods, makeState());
    const result = aggregateModifiers(resolved);
    expect(result['mechanic.keystone_ci']).toBeUndefined();
  });
});

// ─── AGGREGATION — MAXIMUM STATS ─────────────────────────

describe('aggregateModifiers — maximum stats', () => {
  it('max resist respects base value', () => {
    const mods = [
      createModifier({
        source: 'passiveTree',
        type: 'flat',
        stat: S['resistance.maxFire'],
        value: 1,
        meta: { name: '+1% max fire res' },
      }),
    ];

    const resolved = resolveModifiers(mods, makeState());
    const result = aggregateModifiers(resolved);

    expect(result['resistance.maxFire']).toBeGreaterThanOrEqual(75);
  });
});

// ─── MULTI-STAT AGGREGATION ──────────────────────────────

describe('aggregateModifiers — multiple stats', () => {
  it('aggregates multiple stats in one pass', () => {
    const mods = [
      createModifier({
        source: 'base',
        type: 'flat',
        stat: S['defense.life'],
        value: 1000,
        meta: { name: 'Life' },
      }),
      createModifier({
        source: 'base',
        type: 'flat',
        stat: S['defense.energyShield'],
        value: 500,
        meta: { name: 'ES' },
      }),
      createModifier({
        source: 'passiveTree',
        type: 'increased',
        stat: S['defense.life'],
        value: 20,
        meta: { name: 'Life%' },
      }),
    ];

    const resolved = resolveModifiers(mods, makeState());
    const result = aggregateModifiers(resolved);

    expect(result['defense.life']).toBe(1000 * (1 + 20 / 100));
    expect(result['defense.energyShield']).toBe(500);
  });
});

// ─── CONDITIONAL MODIFIERS + AGGREGATION ─────────────────

describe('aggregation with conditional modifiers', () => {
  it('only active conditionals contribute', () => {
    const mods = [
      createModifier({
        source: 'base',
        type: 'flat',
        stat: S['defense.life'],
        value: 1000,
        meta: { name: 'Base' },
      }),
      createModifier({
        source: 'item',
        type: 'increased',
        stat: S['defense.life'],
        value: 30,
        condition: state('Leeching'),
        meta: { name: 'Leech bonus' },
      }),
    ];

    const sIdle = makeState();
    const sLeech = makeState({
      playerStates: new Map([['Leeching', true]]),
    });

    const idleResult = aggregateModifiers(resolveModifiers(mods, sIdle));
    const leechResult = aggregateModifiers(resolveModifiers(mods, sLeech));

    expect(idleResult['defense.life']).toBe(1000);
    expect(leechResult['defense.life']).toBe(1000 * (1 + 30 / 100));
  });

  it('scaled modifiers interact with conditions', () => {
    const mods = [
      createModifier({
        source: 'base',
        type: 'flat',
        stat: S['defense.life'],
        value: 100,
        meta: { name: 'Base' },
      }),
      createModifier({
        source: 'item',
        type: 'flat',
        stat: S['defense.life'],
        value: 10,
        scale: chargeScale('frenzy', 1),
        condition: state('Moving'),
        meta: { name: 'Frenzy while moving' },
      }),
    ];

    const sMoving = makeState({
      playerStates: new Map([['Moving', true]]),
      charges: new Map([['frenzy', 5]]),
    });
    const sIdle = makeState({
      charges: new Map([['frenzy', 5]]),
    });

    const movingResult = aggregateModifiers(resolveModifiers(mods, sMoving));
    const idleResult = aggregateModifiers(resolveModifiers(mods, sIdle));

    expect(movingResult['defense.life']).toBe(100 + 10 * 5);
    expect(idleResult['defense.life']).toBe(100);
  });
});

// ─── REAL PoE MODIFIER SCENARIOS ─────────────────────────

describe('real-world PoE scenarios', () => {
  it('Righteous Fire: base + inc fire + inc burning', () => {
    const mods = [
      createModifier({
        source: 'base',
        type: 'flat',
        stat: S['defense.life'],
        value: 4000,
        meta: { name: 'Life from gear' },
      }),
      createModifier({
        source: 'passiveTree',
        type: 'increased',
        stat: S['defense.life'],
        value: 100,
        meta: { name: 'Passive tree' },
      }),
      createModifier({
        source: 'passiveTree',
        type: 'increased',
        stat: S['offense.fireDamage'],
        value: 200,
        meta: { name: 'Fire damage nodes' },
      }),
      createModifier({
        source: 'passiveTree',
        type: 'increased',
        stat: S['offense.fireDotMultiplier'],
        value: 150,
        meta: { name: 'Burning nodes' },
      }),
    ];

    const resolved = resolveModifiers(mods, makeState());
    const result = aggregateModifiers(resolved);

    expect(result['defense.life']).toBe(4000 * (1 + 100 / 100));
    expect(result['offense.fireDamage']).toBe(0 * (1 + 200 / 100));
    expect(result['offense.fireDotMultiplier']).toBe(0 * (1 + 150 / 100));
  });

  it('Pain Attunement: 30% more spell damage on low life', () => {
    const mods = [
      createModifier({
        source: 'base',
        type: 'flat',
        stat: S['offense.spellDamage'],
        value: 100,
        meta: { name: 'Spell base' },
      }),
      createModifier({
        source: 'keystone',
        type: 'increased',
        stat: S['offense.spellDamage'],
        value: 50,
        meta: { name: 'Spell nodes' },
      }),
      createModifier({
        source: 'keystone',
        type: 'more',
        stat: S['offense.spellDamage'],
        value: 30,
        condition: state('LowLife'),
        meta: { name: 'Pain Attunement' },
      }),
    ];

    const sNormal = makeState();
    const sLowLife = makeState({
      playerStates: new Map([['LowLife', true]]),
    });

    const normal = aggregateModifiers(resolveModifiers(mods, sNormal));
    const lowLife = aggregateModifiers(resolveModifiers(mods, sLowLife));

    expect(normal['offense.spellDamage']).toBe(100 * 1.5);
    expect(lowLife['offense.spellDamage']).toBe(100 * 1.5 * 1.3);
  });
});
