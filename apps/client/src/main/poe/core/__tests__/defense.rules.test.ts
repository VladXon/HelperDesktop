import { describe, it, expect } from 'vitest';
import { evaluateDefenseReport } from '../rules/damage.rules.js';
import type { DefenseReport } from '../models/index.js';

function makeDefense(overrides: Partial<DefenseReport> = {}): DefenseReport {
  return {
    life: 5000,
    energyShield: 0,
    combinedPool: 5000,
    resistances: {
      fire: { uncapped: 75, capped: 75, overcap: 0 },
      cold: { uncapped: 75, capped: 75, overcap: 0 },
      lightning: { uncapped: 75, capped: 75, overcap: 0 },
      chaos: { uncapped: 0, capped: 0, overcap: 0 },
    },
    maxResistances: { fire: 75, cold: 75, lightning: 75 },
    armour: 20000,
    physicalReduction: 75,
    evasion: 0,
    evadeChance: 0,
    block: { attack: 0, spell: 0 },
    spellSuppression: 0,
    recovery: {
      lifeRegen: 0,
      lifeRegenPercent: 0,
      leech: { totalLeech: 0, leechRate: 0, duration: 0 },
      lifeOnHit: 0,
      lifeOnBlock: 0,
      energyShieldRecharge: 0,
      esRechargeDelay: 2,
      recoupPercent: 0,
    },
    ehp: { physicalMaxHit: 20000, elementalMaxHit: 30000, chaosMaxHit: 15000 },
    ailmentImmunity: {},
    guardSkill: null,
    ...overrides,
  };
}

describe('defense rules', () => {
  it('flags uncapped fire resistance as critical', () => {
    const defense = makeDefense({
      resistances: {
        fire: { uncapped: 50, capped: 50, overcap: 0 },
        cold: { uncapped: 75, capped: 75, overcap: 0 },
        lightning: { uncapped: 75, capped: 75, overcap: 0 },
        chaos: { uncapped: 0, capped: 0, overcap: 0 },
      },
    });
    const { problems } = evaluateDefenseReport(defense);
    const fireProblem = problems.find((p) => p.message.includes('Fire'));
    expect(fireProblem?.severity).toBe('critical');
  });

  it('flags low life as critical', () => {
    const defense = makeDefense({ life: 2000, combinedPool: 2000 });
    const { problems } = evaluateDefenseReport(defense);
    const lifeProblem = problems.find((p) => p.message.includes('Life'));
    expect(lifeProblem?.severity).toBe('critical');
  });

  it('flags low life under 4500 as high', () => {
    const defense = makeDefense({ life: 4000, combinedPool: 4000 });
    const { problems } = evaluateDefenseReport(defense);
    const lifeProblems = problems.filter((p) => p.message.includes('Life'));
    expect(lifeProblems.some((p) => p.severity === 'high')).toBe(true);
  });

  it('warns about low chaos resistance', () => {
    const defense = makeDefense({
      resistances: {
        fire: { uncapped: 75, capped: 75, overcap: 0 },
        cold: { uncapped: 75, capped: 75, overcap: 0 },
        lightning: { uncapped: 75, capped: 75, overcap: 0 },
        chaos: { uncapped: -20, capped: -20, overcap: 0 },
      },
    });
    const { warnings } = evaluateDefenseReport(defense);
    expect(warnings.some((w) => w.message.includes('chaos resistance'))).toBe(true);
  });

  it('warns about low spell suppression', () => {
    const defense = makeDefense({ spellSuppression: 20 });
    const { warnings } = evaluateDefenseReport(defense);
    expect(warnings.some((w) => w.message.includes('spell suppression'))).toBe(true);
  });

  it('no problems for well-capped build', () => {
    const defense = makeDefense({
      life: 6000,
      combinedPool: 6000,
      armour: 30000,
      spellSuppression: 100,
      resistances: {
        fire: { uncapped: 120, capped: 75, overcap: 45 },
        cold: { uncapped: 120, capped: 75, overcap: 45 },
        lightning: { uncapped: 120, capped: 75, overcap: 45 },
        chaos: { uncapped: 50, capped: 50, overcap: 0 },
      },
      ehp: { physicalMaxHit: 50000, elementalMaxHit: 50000, chaosMaxHit: 30000 },
    });
    const { problems } = evaluateDefenseReport(defense);
    const criticalProblems = problems.filter((p) => p.severity === 'critical' || p.severity === 'high');
    expect(criticalProblems.length).toBe(0);
  });
});
