import { describe, it, expect } from 'vitest';
import {
  and,
  or,
  not,
  state,
  charge,
  skillTag,
  actor,
  threshold,
  slot,
  socketedIn,
  recently,
  timer,
  duringAction,
  stacks,
  always,
  never,
  evaluateCondition,
  evaluateScale,
  evaluateEffectiveness,
  stringifyCondition,
  stringifyScale,
  defaultConditionState,
  constantScale,
  chargeScale,
  statScale,
  stackScale,
} from '../index.js';
import { S } from '../registry/stat-accessor.js';
import type { ConditionState } from '../conditions/condition-expr.js';

function makeState(overrides: Partial<ConditionState> = {}): ConditionState {
  return { ...defaultConditionState(), ...overrides };
}

// ─── BOOLEAN LOGIC ──────────────────────────────────────────

describe('AND/OR/NOT logic', () => {
  it('always is always true', () => {
    expect(evaluateCondition(always, defaultConditionState())).toBe(true);
  });

  it('never is always false', () => {
    expect(evaluateCondition(never, defaultConditionState())).toBe(false);
  });

  it('AND with all true → true', () => {
    const expr = and(state('Moving'), state('Leeching'));
    const s = makeState({
      playerStates: new Map([['Moving', true], ['Leeching', true]]),
    });
    expect(evaluateCondition(expr, s)).toBe(true);
  });

  it('AND with one false → false', () => {
    const expr = and(state('Moving'), state('Leeching'));
    const s = makeState({
      playerStates: new Map([['Moving', true], ['Leeching', false]]),
    });
    expect(evaluateCondition(expr, s)).toBe(false);
  });

  it('OR with one true → true', () => {
    const expr = or(state('Moving'), state('Leeching'));
    const s = makeState({
      playerStates: new Map([['Moving', false], ['Leeching', true]]),
    });
    expect(evaluateCondition(expr, s)).toBe(true);
  });

  it('OR with all false → false', () => {
    const expr = or(state('Moving'), state('Leeching'));
    const s = makeState({
      playerStates: new Map([['Moving', false], ['Leeching', false]]),
    });
    expect(evaluateCondition(expr, s)).toBe(false);
  });

  it('NOT inverts', () => {
    expect(evaluateCondition(not(always), defaultConditionState())).toBe(false);
    expect(evaluateCondition(not(never), defaultConditionState())).toBe(true);
  });

  it('NOT NOT cancels out', () => {
    const expr = not(not(state('Moving')));
    expect(expr.kind).toBe('state');
  });

  it('empty AND → always', () => {
    expect(and().kind).toBe('always');
  });

  it('empty OR → never', () => {
    expect(or().kind).toBe('never');
  });

  it('nested: AND(OR(A,B), C)', () => {
    const expr = and(or(state('A'), state('B')), state('C'));
    const sTrue = makeState({
      playerStates: new Map([['A', false], ['B', true], ['C', true]]),
    });
    expect(evaluateCondition(expr, sTrue)).toBe(true);

    const sFalse = makeState({
      playerStates: new Map([['A', false], ['B', true], ['C', false]]),
    });
    expect(evaluateCondition(expr, sFalse)).toBe(false);
  });
});

// ─── LEAF CONDITIONS ────────────────────────────────────────

describe('state condition', () => {
  it('true when state variable is set', () => {
    const s = makeState({ playerStates: new Map([['Moving', true]]) });
    expect(evaluateCondition(state('Moving'), s)).toBe(true);
  });

  it('false when state variable is absent', () => {
    const s = makeState({ playerStates: new Map() });
    expect(evaluateCondition(state('Moving'), s)).toBe(false);
  });
});

describe('charge condition', () => {
  it('min threshold works', () => {
    const s = makeState({ charges: new Map([['frenzy', 3]]) });
    expect(evaluateCondition(charge('frenzy', 3), s)).toBe(true);
    expect(evaluateCondition(charge('frenzy', 4), s)).toBe(false);
  });

  it('max threshold works', () => {
    const s = makeState({ charges: new Map([['frenzy', 5]]) });
    expect(evaluateCondition(charge('frenzy', 0, 5), s)).toBe(true);
    expect(evaluateCondition(charge('frenzy', 0, 4), s)).toBe(false);
  });

  it('charge not present → 0', () => {
    const s = makeState();
    expect(evaluateCondition(charge('frenzy', 1), s)).toBe(false);
    expect(evaluateCondition(charge('frenzy', 0), s)).toBe(true);
  });
});

describe('skillTag condition', () => {
  it('matches existing tag', () => {
    const s = makeState({ skillTags: ['attack', 'projectile'] });
    expect(evaluateCondition(skillTag('attack'), s)).toBe(true);
    expect(evaluateCondition(skillTag('spell'), s)).toBe(false);
  });

  it('negated: NOT attack', () => {
    const s = makeState({ skillTags: ['spell'] });
    expect(evaluateCondition(skillTag('attack', true), s)).toBe(true);
    expect(evaluateCondition(skillTag('spell', true), s)).toBe(false);
  });
});

describe('actor condition', () => {
  it('checks enemy state', () => {
    const s = makeState({ enemyStates: new Map([['Burning', true]]) });
    expect(evaluateCondition(actor('enemy', 'Burning'), s)).toBe(true);
  });

  it('negated: enemy NOT burning', () => {
    const s = makeState({ enemyStates: new Map() });
    expect(evaluateCondition(actor('enemy', 'Burning', true), s)).toBe(true);
  });
});

describe('statThreshold condition', () => {
  it('greaterThan', () => {
    const s = makeState({ statValues: new Map([[S['defense.life'].id, 5000]]) });
    expect(evaluateCondition(threshold(S['defense.life'], 'greaterThan', 4000), s)).toBe(true);
    expect(evaluateCondition(threshold(S['defense.life'], 'greaterThan', 5000), s)).toBe(false);
  });

  it('greaterOrEqual', () => {
    const s = makeState({ statValues: new Map([[S['defense.life'].id, 5000]]) });
    expect(evaluateCondition(threshold(S['defense.life'], 'greaterOrEqual', 5000), s)).toBe(true);
  });

  it('lessThan', () => {
    const s = makeState({ statValues: new Map([[S['defense.life'].id, 3000]]) });
    expect(evaluateCondition(threshold(S['defense.life'], 'lessThan', 5000), s)).toBe(true);
  });

  it('equals', () => {
    const s = makeState({ statValues: new Map([[S['defense.life'].id, 5000]]) });
    expect(evaluateCondition(threshold(S['defense.life'], 'equals', 5000), s)).toBe(true);
    expect(evaluateCondition(threshold(S['defense.life'], 'equals', 5001), s)).toBe(false);
  });

  it('missing stat → 0', () => {
    const s = makeState();
    expect(evaluateCondition(threshold(S['defense.life'], 'greaterThan', -1), s)).toBe(true);
    expect(evaluateCondition(threshold(S['defense.life'], 'greaterThan', 0), s)).toBe(false);
  });
});

describe('slot condition', () => {
  it('checks current equipment slot', () => {
    const s = makeState({ currentSlot: 'Helmet' });
    expect(evaluateCondition(slot('Helmet'), s)).toBe(true);
    expect(evaluateCondition(slot('Weapon 1'), s)).toBe(false);
  });
});

describe('socketedIn condition', () => {
  it('checks where gem is socketed', () => {
    const s = makeState({ currentSocketedIn: 'Weapon 1' });
    expect(evaluateCondition(socketedIn('Weapon 1'), s)).toBe(true);
    expect(evaluateCondition(socketedIn('Helmet'), s)).toBe(false);
  });
});

describe('recently condition', () => {
  it('event within window → true', () => {
    const s = makeState({
      recentEvents: new Map([['killed', 5000]]),
      now: 7000,
    });
    expect(evaluateCondition(recently('killed', 4000), s)).toBe(true);
  });

  it('event outside window → false', () => {
    const s = makeState({
      recentEvents: new Map([['killed', 5000]]),
      now: 10000,
    });
    expect(evaluateCondition(recently('killed', 4000), s)).toBe(false);
  });

  it('event never happened → false', () => {
    const s = makeState({ now: 7000 });
    expect(evaluateCondition(recently('killed'), s)).toBe(false);
  });
});

describe('timer condition', () => {
  it('checks timer phase', () => {
    const sTrue = makeState({
      timerPhases: new Map([['timer:4000', 'active']]),
    });
    expect(evaluateCondition(timer(4000, 'active'), sTrue)).toBe(true);

    const sFalse = makeState({
      timerPhases: new Map([['timer:4000', 'inactive']]),
    });
    expect(evaluateCondition(timer(4000, 'active'), sFalse)).toBe(false);
  });
});

describe('duringAction condition', () => {
  it('checks action state', () => {
    const s = makeState({
      playerStates: new Map([['action:casting', true]]),
    });
    expect(evaluateCondition(duringAction('casting'), s)).toBe(true);
    expect(evaluateCondition(duringAction('moving'), s)).toBe(false);
  });
});

describe('stack condition', () => {
  it('checks stack count', () => {
    const s = makeState({ stacks: new Map([['poison', 15]]) });
    expect(evaluateCondition(stacks('poison', 10), s)).toBe(true);
    expect(evaluateCondition(stacks('poison', 20), s)).toBe(false);
  });
});

// ─── REAL PoE CONDITIONS ────────────────────────────────────

describe('PoE real-world conditions', () => {
  it('"(enemy burning AND skill fire) OR (frenzy charges >= 3)"', () => {
    const expr = or(
      and(actor('enemy', 'Burning'), skillTag('fire')),
      charge('frenzy', 3),
    );

    const sFire = makeState({
      enemyStates: new Map([['Burning', true]]),
      skillTags: ['fire', 'spell'],
    });
    expect(evaluateCondition(expr, sFire)).toBe(true);

    const sCharges = makeState({
      charges: new Map([['frenzy', 4]]),
      skillTags: ['physical'],
    });
    expect(evaluateCondition(expr, sCharges)).toBe(true);

    const sNone = makeState({
      charges: new Map([['frenzy', 1]]),
      skillTags: ['physical'],
    });
    expect(evaluateCondition(expr, sNone)).toBe(false);
  });

  it('"cannot be stunned while casting"', () => {
    const expr = not(duringAction('casting'));
    const sCasting = makeState({
      playerStates: new Map([['action:casting', true]]),
    });
    expect(evaluateCondition(expr, sCasting)).toBe(false);

    const sIdle = makeState();
    expect(evaluateCondition(expr, sIdle)).toBe(true);
  });

  it('"while leeching AND NOT low life"', () => {
    const expr = and(state('Leeching'), not(state('LowLife')));

    const sLeech = makeState({
      playerStates: new Map([['Leeching', true], ['LowLife', false]]),
    });
    expect(evaluateCondition(expr, sLeech)).toBe(true);

    const sLow = makeState({
      playerStates: new Map([['Leeching', true], ['LowLife', true]]),
    });
    expect(evaluateCondition(expr, sLow)).toBe(false);
  });

  it('"at least 5k life OR at least 3k ES"', () => {
    const expr = or(
      threshold(S['defense.life'], 'greaterOrEqual', 5000),
      threshold(S['defense.energyShield'], 'greaterOrEqual', 3000),
    );

    const sLife = makeState({
      statValues: new Map([['defense.life', 5500], ['defense.energyShield', 500]]),
    });
    expect(evaluateCondition(expr, sLife)).toBe(true);

    const sES = makeState({
      statValues: new Map([['defense.life', 2000], ['defense.energyShield', 4000]]),
    });
    expect(evaluateCondition(expr, sES)).toBe(true);

    const sNone = makeState();
    expect(evaluateCondition(expr, sNone)).toBe(false);
  });
});

// ─── SCALE EXPRESSIONS ──────────────────────────────────────

describe('scale expressions', () => {
  it('constantScale returns fixed value', () => {
    const s = makeState();
    expect(evaluateScale(constantScale(1), s)).toBe(1);
    expect(evaluateScale(constantScale(3), s)).toBe(3);
  });

  it('chargeScale: ×3 frenzy charges = 3', () => {
    const s = makeState({ charges: new Map([['frenzy', 3]]) });
    expect(evaluateScale(chargeScale('frenzy', 1), s)).toBe(3);
  });

  it('chargeScale: perCharge=2, limit=2, charges=5 → 4', () => {
    const s = makeState({ charges: new Map([['frenzy', 5]]) });
    expect(evaluateScale(chargeScale('frenzy', 2, 2), s)).toBe(4);
  });

  it('statScale: 500 STR, per=10, perValue=5 → 250', () => {
    const s = makeState({
      statValues: new Map([['attribute.strength', 500]]),
    });
    expect(evaluateScale(statScale(S['attribute.strength'], 10, 5), s)).toBe(250);
  });

  it('statScale: with limit', () => {
    const s = makeState({
      statValues: new Map([['attribute.strength', 500]]),
    });
    const result = evaluateScale(
      statScale(S['attribute.strength'], 10, 5, 20),
      s,
    );
    expect(result).toBe(100);
  });

  it('stackScale: 15 poison = 15', () => {
    const s = makeState({ stacks: new Map([['poison', 15]]) });
    expect(evaluateScale(stackScale('poison', 1), s)).toBe(15);
  });

  it('stackScale: with limit', () => {
    const s = makeState({ stacks: new Map([['poison', 50]]) });
    expect(evaluateScale(stackScale('poison', 1, 20), s)).toBe(20);
  });
});

// ─── EFFECTIVENESS ───────────────────────────────────────────

describe('ModifierEffectiveness', () => {
  it('always active, no scale → {active: true, scale: 1}', () => {
    const result = evaluateEffectiveness({}, makeState());
    expect(result).toEqual({ active: true, scale: 1 });
  });

  it('gate blocks inactive → {active: false, scale: 0}', () => {
    const result = evaluateEffectiveness(
      { gate: state('Moving') },
      makeState(),
    );
    expect(result).toEqual({ active: false, scale: 0 });
  });

  it('gate passes, with scale', () => {
    const s = makeState({
      playerStates: new Map([['Moving', true]]),
      charges: new Map([['frenzy', 4]]),
    });
    const result = evaluateEffectiveness(
      { gate: state('Moving'), scale: chargeScale('frenzy', 1) },
      s,
    );
    expect(result).toEqual({ active: true, scale: 4 });
  });
});

// ─── STRINGIFIER ─────────────────────────────────────────────

describe('stringifyCondition', () => {
  it('formats AND', () => {
    const expr = and(state('Moving'), state('Leeching'));
    expect(stringifyCondition(expr)).toBe(
      '(AND player.Moving player.Leeching)',
    );
  });

  it('formats OR', () => {
    const expr = or(state('A'), state('B'));
    expect(stringifyCondition(expr)).toBe('(OR player.A player.B)');
  });

  it('formats NOT', () => {
    expect(stringifyCondition(not(state('Moving')))).toBe(
      '(NOT player.Moving)',
    );
  });

  it('formats stat threshold', () => {
    expect(
      stringifyCondition(threshold(S['defense.life'], 'greaterThan', 5000)),
    ).toBe('defense.life > 5000');
  });

  it('formats always/never', () => {
    expect(stringifyCondition(always)).toBe('(always)');
    expect(stringifyCondition(never)).toBe('(never)');
  });
});

describe('stringifyScale', () => {
  it('constant', () => {
    expect(stringifyScale(constantScale(2))).toBe('×2');
  });

  it('charge', () => {
    expect(stringifyScale(chargeScale('frenzy', 1))).toBe('×1/charge.frenzy');
  });
});
