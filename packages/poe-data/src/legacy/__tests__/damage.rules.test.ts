import { describe, it, expect } from 'vitest';
import { evaluateDamageReport } from '../rules/damage.rules.js';
import type { OffenseReport, SkillSummary } from '../models/index.js';

function makeOffense(overrides: Partial<OffenseReport> = {}): OffenseReport {
  return {
    mainSkill: { name: 'Boneshatter', hitRate: 1.25, averageHit: 1000, penetration: 0 } as SkillSummary,
    totalDps: 1000000,
    bossDps: 600000,
    uberDps: 350000,
    damageBreakdown: { physical: 800000, fire: 100000, cold: 50000, lightning: 30000, chaos: 20000 },
    penetration: 10,
    resistanceReduction: 0,
    critChance: 0.05,
    critMultiplier: 0.3,
    attackSpeed: 1.1,
    isDotBuild: false,
    dotDps: 0,
    witherStacks: 0,
    shockEffect: 0,
    ...overrides,
  };
}

describe('damage rules', () => {
  it('flags DPS below 100k as critical', () => {
    const offense = makeOffense({ totalDps: 50000 });
    const { problems } = evaluateDamageReport(offense);
    const dpsProblem = problems.find((p) => p.category === 'damage');
    expect(dpsProblem?.severity).toBe('critical');
  });

  it('flags DPS between 100k-500k as high', () => {
    const offense = makeOffense({ totalDps: 300000 });
    const { problems } = evaluateDamageReport(offense);
    const dpsProblem = problems.find((p) => p.message.includes('DPS') && p.message.includes('below'));
    expect(dpsProblem?.severity).toBe('high');
  });

  it('warns about low penetration', () => {
    const offense = makeOffense({ totalDps: 2000000, penetration: 2 });
    const { warnings } = evaluateDamageReport(offense);
    expect(warnings.some((w) => w.message.includes('penetration'))).toBe(true);
  });

  it('does not warn about penetration for DoT builds', () => {
    const offense = makeOffense({ totalDps: 500000, isDotBuild: true, penetration: 0 });
    const { warnings } = evaluateDamageReport(offense);
    expect(warnings.some((w) => w.message.includes('penetration'))).toBe(false);
  });
});
