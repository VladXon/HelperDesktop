import { describe, it, expect } from 'vitest';
import { evaluateScaling } from '../rules/index.js';
import type { OffenseReport, DefenseReport, SkillSummary } from '../models/index.js';

function makeOffense(overrides: Partial<OffenseReport> = {}): OffenseReport {
  return {
    mainSkill: { name: 'Test', hitRate: 1, averageHit: 100, penetration: 0 } as SkillSummary,
    totalDps: 1000000,
    bossDps: 600000,
    uberDps: 350000,
    damageBreakdown: { physical: 1000000, fire: 0, cold: 0, lightning: 0, chaos: 0 },
    penetration: 10,
    resistanceReduction: 0,
    critChance: 0.05,
    critMultiplier: 0.3,
    attackSpeed: 1.0,
    isDotBuild: false,
    dotDps: 0,
    witherStacks: 0,
    shockEffect: 0,
    ...overrides,
  };
}

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
    armour: 10000,
    physicalReduction: 50,
    evasion: 0,
    evadeChance: 0,
    block: { attack: 0, spell: 0 },
    spellSuppression: 50,
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
    ehp: { physicalMaxHit: 10000, elementalMaxHit: 20000, chaosMaxHit: 5000 },
    ailmentImmunity: {},
    guardSkill: null,
    ...overrides,
  };
}

describe('scaling rules', () => {
  it('detects crit scaling as primary for crit builds', () => {
    const offense = makeOffense({ critChance: 0.6, critMultiplier: 2.5 });
    const defense = makeDefense();
    const { report } = evaluateScaling(offense, defense);
    expect(report.primaryScalar).toBe('critical');
  });

  it('detects flat damage as primary for non-crit builds', () => {
    const offense = makeOffense({ critChance: 0.05, critMultiplier: 0.3 });
    const defense = makeDefense();
    const { report } = evaluateScaling(offense, defense);
    expect(report.primaryScalar).toBe('flat_damage');
  });

  it('reports diminishing returns for overcapped stats', () => {
    const offense = makeOffense({ critChance: 0.95, penetration: 60 });
    const defense = makeDefense({ physicalReduction: 90, evadeChance: 90 });
    const { report } = evaluateScaling(offense, defense);
    expect(report.diminishingReturns.length).toBeGreaterThan(0);
  });

  it('returns empty problems list', () => {
    const offense = makeOffense();
    const defense = makeDefense();
    const { problems } = evaluateScaling(offense, defense);
    expect(Array.isArray(problems)).toBe(true);
  });
});
