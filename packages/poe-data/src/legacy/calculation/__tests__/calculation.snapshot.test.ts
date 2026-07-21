import { describe, it, expect } from 'vitest';
import { createCharacterSnapshot } from '../snapshot.model.js';
import { calculateDamage } from '../damage/damage.calculator.js';
import { calculateBaseDamage } from '../damage/base-damage.js';
import { calculateAddedDamage } from '../damage/added-damage.js';
import { applyConversion } from '../damage/conversion.js';
import { applyScaling } from '../damage/scaling.js';
import { applyCritical } from '../damage/critical.js';
import { applyPenetration } from '../damage/penetration.js';
import { applyMitigation } from '../damage/mitigation.js';
import { calculateDefense } from '../defense/defense.calculator.js';
import { calculateArmourMitigation } from '../defense/armour.js';
import { calculateEffectiveResistances, calculateSpellSuppression } from '../defense/resistances.js';
import { calculateBlockChance } from '../defense/block.js';
import { calculateRecovery } from '../defense/recovery.js';
import { calculateEvasionChance } from '../defense/evasion.js';
import { defaultCalculationContext } from '../../stats/context/calculation-context.js';
import { bossEnemy } from '../../stats/context/enemy-context.js';
import type { SkillSetup } from '../../skills/models/skill.model.js';
import type { ResolvedCharacterStats } from '../../stats/models/character-stats.model.js';

function emptyStats(overrides: Partial<ResolvedCharacterStats> = {}): ResolvedCharacterStats {
  return {
    defense: {
      life: 0, energyShield: 0, mana: 0, armour: 0, evasion: 0, ward: 0,
      fireResistance: 0, coldResistance: 0, lightningResistance: 0, chaosResistance: 0,
      maxFireResistance: 0, maxColdResistance: 0, maxLightningResistance: 0,
      attackBlock: 0, spellBlock: 0, spellSuppression: 0, lifeRegen: 0,
      armourIncreased: 0, evasionIncreased: 0, energyShieldIncreased: 0, lifeIncreased: 0,
    },
    offense: {
      attackSpeed: 0, castSpeed: 0, movementSpeed: 0,
      criticalChance: 0, criticalMultiplier: 0,
      firePenetration: 0, coldPenetration: 0, lightningPenetration: 0, elementalPenetration: 0,
      damageOverTimeMultiplier: 0,
      flatDamage: {}, increasedDamage: {}, moreDamage: {},
    },
    mechanics: { keystones: [], ailments: [], conversion: [], overrides: {} },
    attributes: { strength: 0, dexterity: 0, intelligence: 0 },
    rawModifiers: [],
    traced: {
      life: { value: 0, sources: [] }, energyShield: { value: 0, sources: [] },
      mana: { value: 0, sources: [] }, armour: { value: 0, sources: [] },
      evasion: { value: 0, sources: [] }, fireResistance: { value: 0, sources: [] },
      coldResistance: { value: 0, sources: [] }, lightningResistance: { value: 0, sources: [] },
      chaosResistance: { value: 0, sources: [] }, attackBlock: { value: 0, sources: [] },
      spellBlock: { value: 0, sources: [] }, lifeRegen: { value: 0, sources: [] },
      spellSuppression: { value: 0, sources: [] },
    },
    ...overrides,
  };
}

function makeSkill(overrides: Partial<SkillSetup> = {}): SkillSetup {
  return {
    activeSkill: {
      name: 'Fireball', level: 20, quality: 0, variant: 'regular',
      isVaal: false, isAwakened: false, isCorrupted: false,
      tags: ['fire', 'spell', 'projectile'],
      baseDamage: [{ type: 'fire', min: 1095, max: 1643 }],
      effectiveness: 3.7, attackTime: null, castTime: 0.75,
      conversion: [], mechanics: [{ type: 'selfCast', multiplier: 1.0 }],
    },
    supports: [],
    enabled: true,
    sockets: 4,
    ...overrides,
  };
}

function snapshotFromComponentTests(skillOverrides: Partial<SkillSetup['activeSkill']> = {}) {
  const skill = makeSkill();
  if (skill.activeSkill) skill.activeSkill = { ...skill.activeSkill!, ...skillOverrides };
  const ctx = defaultCalculationContext();
  return createCharacterSnapshot(emptyStats(), [skill], ctx);
}

// ============ DAMAGE PIPELINE ============

describe('base damage', () => {
  it('generates components from skill base damage with effectiveness', () => {
    const snapshot = snapshotFromComponentTests();
    const skill = snapshot.resolvedSkills[0]!;
    const result = calculateBaseDamage(skill);
    const avgFire = (1095 + 1643) / 2 * 3.7;
    expect(result.components.length).toBe(1);
    expect(result.components[0]!.type).toBe('fire');
    expect(result.components[0]!.value).toBeCloseTo(avgFire, 0);
    expect(result.components[0]!.source).toBe('skill');
    expect(result.total).toBeCloseTo(avgFire, 0);
  });

  it('handles multi-type base damage', () => {
    const snapshot = snapshotFromComponentTests({
      baseDamage: [
        { type: 'physical', min: 100, max: 200 },
        { type: 'fire', min: 50, max: 100 },
      ],
      effectiveness: 1.0,
    });
    const result = calculateBaseDamage(snapshot.resolvedSkills[0]!);
    expect(result.components.length).toBe(2);
    const physComp = result.components.find((c) => c.type === 'physical')!;
    const fireComp = result.components.find((c) => c.type === 'fire')!;
    expect(physComp.value).toBeCloseTo(150, 0);
    expect(fireComp.value).toBeCloseTo(75, 0);
  });
});

describe('conversion', () => {
  it('converts physical to fire (100%)', () => {
    const snapshot = snapshotFromComponentTests({
      baseDamage: [{ type: 'physical', min: 100, max: 100 }],
      effectiveness: 1.0,
      conversion: [{ from: 'physical', to: 'fire', percent: 100, kind: 'conversion' }],
    });
    const skill = snapshot.resolvedSkills[0]!;
    const base = calculateBaseDamage(skill);
    const result = applyConversion(base, skill);
    expect(result.components.length).toBe(1);
    expect(result.components[0]!.type).toBe('fire');
    expect(result.components[0]!.value).toBeCloseTo(100, 0);
  });

  it('converts physical to fire (50%) — split remains', () => {
    const snapshot = snapshotFromComponentTests({
      baseDamage: [{ type: 'physical', min: 100, max: 100 }],
      effectiveness: 1.0,
      conversion: [{ from: 'physical', to: 'fire', percent: 50, kind: 'conversion' }],
    });
    const skill = snapshot.resolvedSkills[0]!;
    const base = calculateBaseDamage(skill);
    const result = applyConversion(base, skill);
    expect(result.components.length).toBe(2);
    const phys = result.components.find((c) => c.type === 'physical')!;
    const fire = result.components.find((c) => c.type === 'fire')!;
    expect(phys.value).toBeCloseTo(50, 0);
    expect(fire.value).toBeCloseTo(50, 0);
  });

  it('handles gained as extra fire from physical', () => {
    const snapshot = snapshotFromComponentTests({
      baseDamage: [{ type: 'physical', min: 100, max: 100 }],
      effectiveness: 1.0,
      conversion: [{ from: 'physical', to: 'fire', percent: 30, kind: 'gainedAsExtra' }],
    });
    const skill = snapshot.resolvedSkills[0]!;
    const base = calculateBaseDamage(skill);
    const result = applyConversion(base, skill);
    const phys = result.components.find((c) => c.type === 'physical')!;
    const fire = result.components.find((c) => c.type === 'fire')!;
    expect(phys.value).toBeCloseTo(100, 0);
    expect(fire.value).toBeCloseTo(30, 0);
  });
});

describe('penetration', () => {
  it('penetration increases effective damage against 0-res enemy', () => {
    const stats = emptyStats({
      offense: {
        ...emptyStats().offense,
        firePenetration: 20,
      },
    });
    const snapshot = snapshotFromComponentTests();
    const skill = snapshot.resolvedSkills[0]!;
    const base = calculateBaseDamage(skill);

    const penResult = applyPenetration(base, stats);
    const fireDmg = base.components[0]!.value;
    expect(penResult.components[0]!.value).toBeCloseTo(fireDmg * 1.2, 0);
  });

  it('penetration against boss with 30% base resist (pre-mitigation)', () => {
    const stats = emptyStats({
      offense: {
        ...emptyStats().offense,
        firePenetration: 30,
      },
    });
    const snapshot = snapshotFromComponentTests();
    const skill = snapshot.resolvedSkills[0]!;
    const base = calculateBaseDamage(skill);
    const penResult = applyPenetration(base, stats);

    const enemy = bossEnemy();
    const mitigated = applyMitigation(penResult, {
      ...defaultCalculationContext(),
      enemy,
    });
    const fireDmg = base.components[0]!.value;
    expect(penResult.components[0]!.value).toBeCloseTo(fireDmg * 1.3, 0);
    expect(mitigated.components[0]!.value).toBeCloseTo(fireDmg, 0);
  });
});

describe('critical', () => {
  it('no crit leaves damage unchanged', () => {
    const stats = emptyStats();
    const snapshot = snapshotFromComponentTests();
    const skill = snapshot.resolvedSkills[0]!;
    const base = calculateBaseDamage(skill);
    const result = applyCritical(base, stats);
    const fireDmg = base.components[0]!.value;
    expect(result.components[0]!.value).toBeCloseTo(fireDmg, 0);
  });

  it('100% crit chance with base 150% multi = 1.5x damage', () => {
    const stats = emptyStats({
      offense: { ...emptyStats().offense, criticalChance: 100, criticalMultiplier: 0 },
    });
    const snapshot = snapshotFromComponentTests();
    const skill = snapshot.resolvedSkills[0]!;
    const base = calculateBaseDamage(skill);
    const result = applyCritical(base, stats);
    const fireDmg = base.components[0]!.value;
    expect(result.components[0]!.value).toBeCloseTo(fireDmg * 1.5, 0);
  });

  it('50% crit chance with +100% multi = 1.25x average damage', () => {
    const stats = emptyStats({
      offense: { ...emptyStats().offense, criticalChance: 50, criticalMultiplier: 100 },
    });
    const snapshot = snapshotFromComponentTests();
    const skill = snapshot.resolvedSkills[0]!;
    const base = calculateBaseDamage(skill);
    const result = applyCritical(base, stats);
    const fireDmg = base.components[0]!.value;
    expect(result.components[0]!.value).toBeCloseTo(fireDmg * 1.75, 0);
  });
});

describe('scaling: more vs increased', () => {
  it('100% increased doubles damage additively', () => {
    const stats = emptyStats({
      offense: {
        ...emptyStats().offense,
        increasedDamage: { fireDamage: 100 },
      },
    });
    const snapshot = snapshotFromComponentTests();
    const skill = snapshot.resolvedSkills[0]!;
    const base = calculateBaseDamage(skill);
    const result = applyScaling(base, stats);
    expect(result.components[0]!.value).toBeCloseTo(base.components[0]!.value * 2, 0);
  });

  it('30% more multiplies by 1.3', () => {
    const stats = emptyStats({
      offense: {
        ...emptyStats().offense,
        moreDamage: { fireDamage: 1.3 },
      },
    });
    const snapshot = snapshotFromComponentTests();
    const skill = snapshot.resolvedSkills[0]!;
    const base = calculateBaseDamage(skill);
    const result = applyScaling(base, stats);
    expect(result.components[0]!.value).toBeCloseTo(base.components[0]!.value * 1.3, 0);
  });

  it('100% increased + 30% more = 2.6x (additive increased, multiplicative more)', () => {
    const stats = emptyStats({
      offense: {
        ...emptyStats().offense,
        increasedDamage: { fireDamage: 100 },
        moreDamage: { fireDamage: 1.3 },
      },
    });
    const snapshot = snapshotFromComponentTests();
    const skill = snapshot.resolvedSkills[0]!;
    const base = calculateBaseDamage(skill);
    const result = applyScaling(base, stats);
    expect(result.components[0]!.value).toBeCloseTo(base.components[0]!.value * 2 * 1.3, 0);
  });
});

describe('multiple damage sources', () => {
  it('combines skill physical base + added fire flat', () => {
    const stats = emptyStats({
      offense: {
        ...emptyStats().offense,
        flatDamage: { fireDamage: { min: 50, max: 50 } },
      },
    });
    const snapshot = snapshotFromComponentTests({
      baseDamage: [{ type: 'physical', min: 100, max: 100 }],
      effectiveness: 1.0,
    });
    const skill = snapshot.resolvedSkills[0]!;
    const base = calculateBaseDamage(skill);
    const result = calculateAddedDamage(stats, base, skill.effectiveness);
    expect(result.components.length).toBe(2);

    const physComp = result.components.find((c) => c.type === 'physical')!;
    const fireComp = result.components.find((c) => c.type === 'fire')!;
    expect(physComp.value).toBeCloseTo(100, 0);
    expect(fireComp.value).toBeCloseTo(50, 0);
    expect(physComp.source).toBe('skill');
    expect(fireComp.source).toContain('flat:');
  });
});

// ============ FULL PIPELINE ============

describe('damage calculator (full pipeline)', () => {
  it('returns empty report for no skills', () => {
    const ctx = defaultCalculationContext();
    const snapshot = createCharacterSnapshot(emptyStats(), [], ctx);
    const report = calculateDamage(snapshot);
    expect(report.totalDps).toBe(0);
    expect(report.isDotBuild).toBe(false);
  });

  it('calculates DPS from cast time', () => {
    const snapshot = snapshotFromComponentTests({
      baseDamage: [{ type: 'fire', min: 100, max: 100 }],
      effectiveness: 1.0,
      castTime: 0.5,
    });
    const report = calculateDamage(snapshot);
    expect(report.castRate).toBe(2);
    expect(report.totalDps).toBeCloseTo(100 * 2, 0);
  });

  it('full fireball pipeline produces non-zero DPS', () => {
    const snapshot = snapshotFromComponentTests();
    const report = calculateDamage(snapshot);
    expect(report.totalDps).toBeGreaterThan(0);
    expect(report.averageHit).toBeGreaterThan(0);
    expect(report.breakdown.components.length).toBe(1);
  });

  it('computes boss and uber DPS', () => {
    const snapshot = snapshotFromComponentTests({
      baseDamage: [{ type: 'fire', min: 1000, max: 1000 }],
      effectiveness: 1.0,
      castTime: 1.0,
    });
    const report = calculateDamage(snapshot);
    expect(report.bossDps).toBeLessThan(report.totalDps);
    expect(report.uberDps).toBeLessThan(report.bossDps);
  });
});

// ============ DEFENSE ENGINE ============

describe('armour mitigation', () => {
  it('damage reduction against small hit', () => {
    const stats = emptyStats({
      defense: { ...emptyStats().defense, armour: 10000 },
    });
    const reduction = calculateArmourMitigation(stats, 500);
    expect(reduction).toBeGreaterThan(50);
  });

  it('damage reduction against large hit is lower', () => {
    const stats = emptyStats({
      defense: { ...emptyStats().defense, armour: 10000 },
    });
    const smallHit = calculateArmourMitigation(stats, 500);
    const largeHit = calculateArmourMitigation(stats, 15000);
    expect(largeHit).toBeLessThan(smallHit);
  });

  it('zero armour gives zero reduction', () => {
    const stats = emptyStats();
    const reduction = calculateArmourMitigation(stats, 1000);
    expect(reduction).toBe(0);
  });

  it('armour increased modifier is applied', () => {
    const stats = emptyStats({
      defense: { ...emptyStats().defense, armour: 10000, armourIncreased: 100 },
    });
    const reduction = calculateArmourMitigation(stats, 1000);
    expect(reduction).toBeGreaterThan(
      calculateArmourMitigation(emptyStats({ defense: { ...emptyStats().defense, armour: 10000 } }), 1000),
    );
  });
});

describe('resistance cap', () => {
  it('clamps resists to 75% default max', () => {
    const stats = emptyStats({
      defense: { ...emptyStats().defense, fireResistance: 120 },
    });
    const res = calculateEffectiveResistances(stats);
    expect(res.fire).toBe(120);
    expect(res.maxFire).toBe(75);
  });

  it('+max fire resist raises cap', () => {
    const stats = emptyStats({
      defense: { ...emptyStats().defense, fireResistance: 120, maxFireResistance: 5 },
    });
    const res = calculateEffectiveResistances(stats);
    expect(res.maxFire).toBe(80);
  });
});

describe('spell suppression', () => {
  it('100% suppression halves spell damage', () => {
    const stats = emptyStats({
      defense: { ...emptyStats().defense, spellSuppression: 100 },
    });
    const supp = calculateSpellSuppression(stats);
    expect(supp.chance).toBe(100);
    expect(supp.reduction).toBe(50);
  });

  it('0% suppression provides no reduction', () => {
    const stats = emptyStats({
      defense: { ...emptyStats().defense, spellSuppression: 0 },
    });
    const supp = calculateSpellSuppression(stats);
    expect(supp.chance).toBe(0);
    expect(supp.reduction).toBe(0);
  });

  it('overcapped suppression clamps at 100%', () => {
    const stats = emptyStats({
      defense: { ...emptyStats().defense, spellSuppression: 150 },
    });
    const supp = calculateSpellSuppression(stats);
    expect(supp.chance).toBe(100);
  });
});

describe('block cap', () => {
  it('caps attack block at 75%', () => {
    const stats = emptyStats({
      defense: { ...emptyStats().defense, attackBlock: 80 },
    });
    const block = calculateBlockChance(stats);
    expect(block.attackBlock).toBe(75);
    expect(block.spellBlock).toBe(0);
  });

  it('both blocks capped independently', () => {
    const stats = emptyStats({
      defense: { ...emptyStats().defense, attackBlock: 90, spellBlock: 80 },
    });
    const block = calculateBlockChance(stats);
    expect(block.attackBlock).toBe(75);
    expect(block.spellBlock).toBe(75);
  });
});

describe('defense calculator (full)', () => {
  it('returns defense report from snapshot', () => {
    const ctx = defaultCalculationContext();
    const snapshot = createCharacterSnapshot(emptyStats(), [], ctx);
    const report = calculateDefense(snapshot);
    expect(report.life).toBe(0);
    expect(report.combinedPool).toBe(0);
    expect(typeof report.physReduction).toBe('number');
    expect(report.spellSuppression.chance).toBe(0);
    expect(report.spellSuppression.reduction).toBe(0);
  });

  it('calculates effective resistances', () => {
    const stats = emptyStats({
      defense: { ...emptyStats().defense, fireResistance: 120, maxFireResistance: 5 },
    });
    const res = calculateEffectiveResistances(stats);
    expect(res.fire).toBe(120);
    expect(res.maxFire).toBe(80);
  });

  it('caps block at 75%', () => {
    const stats = emptyStats({
      defense: { ...emptyStats().defense, attackBlock: 80 },
    });
    const block = calculateBlockChance(stats);
    expect(block.attackBlock).toBe(75);
  });

  it('handles CI keystone combined pool', () => {
    const stats = emptyStats({
      defense: { ...emptyStats().defense, energyShield: 5000 },
      mechanics: { ...emptyStats().mechanics, overrides: { life: 1 } },
    });
    const ctx = defaultCalculationContext();
    const snapshot = createCharacterSnapshot(stats, [], ctx);
    const report = calculateDefense(snapshot);
    expect(report.life).toBe(1);
    expect(report.combinedPool).toBe(5001);
  });

  it('provides effectiveLife > combinedPool with armour', () => {
    const stats = emptyStats({
      defense: { ...emptyStats().defense, life: 4000, armour: 10000 },
    });
    const ctx = defaultCalculationContext();
    const snapshot = createCharacterSnapshot(stats, [], ctx);
    const report = calculateDefense(snapshot);
    expect(report.effectiveLife).toBeGreaterThan(report.combinedPool);
  });

  it('evasion > 0 produces non-zero evade chance', () => {
    const stats = emptyStats({
      defense: { ...emptyStats().defense, evasion: 5000 },
    });
    const ctx = defaultCalculationContext();
    const snapshot = createCharacterSnapshot(stats, [], ctx);
    const report = calculateDefense(snapshot);
    expect(report.evadeChance).toBeGreaterThan(0);
  });

  it('armour mitigation is smaller against larger hits', () => {
    const stats = emptyStats({
      defense: { ...emptyStats().defense, armour: 20000 },
    });
    const ctx = defaultCalculationContext();
    const snapshot = createCharacterSnapshot(stats, [], ctx);
    const report = calculateDefense(snapshot);
    expect(report.physReductionLarge).toBeLessThan(report.physReduction);
  });
});
