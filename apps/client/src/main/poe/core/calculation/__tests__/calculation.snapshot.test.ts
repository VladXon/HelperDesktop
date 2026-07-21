import { describe, it, expect } from 'vitest';
import { createCharacterSnapshot } from '../snapshot.model.js';
import { calculateDamage } from '../damage/damage.calculator.js';
import { calculateDefense } from '../defense/defense.calculator.js';
import { calculateEffectiveResistances } from '../defense/resistances.js';
import { calculateBlockChance } from '../defense/block.js';
import { calculateRecovery } from '../defense/recovery.js';
import { defaultCalculationContext } from '../../stats/context/calculation-context.js';
import type { SkillSetup } from '../../skills/models/skill.model.js';
import type { ResolvedCharacterStats } from '../../stats/models/character-stats.model.js';

function emptyStats(): ResolvedCharacterStats {
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
      life: { value: 0, sources: [] },
      energyShield: { value: 0, sources: [] },
      mana: { value: 0, sources: [] },
      armour: { value: 0, sources: [] },
      evasion: { value: 0, sources: [] },
      fireResistance: { value: 0, sources: [] },
      coldResistance: { value: 0, sources: [] },
      lightningResistance: { value: 0, sources: [] },
      chaosResistance: { value: 0, sources: [] },
      attackBlock: { value: 0, sources: [] },
      spellBlock: { value: 0, sources: [] },
      lifeRegen: { value: 0, sources: [] },
      spellSuppression: { value: 0, sources: [] },
    },
  };
}

describe('character snapshot', () => {
  it('creates snapshot from stats, skills, and context', () => {
    const ctx = defaultCalculationContext();
    const snapshot = createCharacterSnapshot(emptyStats(), [], ctx);
    expect(snapshot.stats).toBeDefined();
    expect(snapshot.context).toBe(ctx);
    expect(snapshot.resolvedSkills).toEqual([]);
    expect(snapshot.activeModifiers).toEqual([]);
  });

  it('resolves enabled skills into ResolvedSkillSnapshots', () => {
    const skills: SkillSetup[] = [{
      activeSkill: {
        name: 'Fireball', level: 20, quality: 0, variant: 'regular',
        isVaal: false, isAwakened: false, isCorrupted: false,
        tags: ['fire', 'spell', 'projectile'],
        baseDamage: [{ type: 'fire', min: 1095, max: 1643 }],
        effectiveness: 3.7, attackTime: null, castTime: 0.75,
        conversion: [],
        mechanics: [{ type: 'selfCast', multiplier: 1.0 }],
      },
      supports: [],
      enabled: true,
      sockets: 4,
    }];
    const ctx = defaultCalculationContext();
    const snapshot = createCharacterSnapshot(emptyStats(), skills, ctx);
    expect(snapshot.resolvedSkills.length).toBe(1);
    expect(snapshot.resolvedSkills[0]!.name).toBe('Fireball');
    expect(snapshot.resolvedSkills[0]!.baseDamage.length).toBe(1);
  });
});

describe('damage calculator (stub)', () => {
  it('returns empty report for no skills', () => {
    const ctx = defaultCalculationContext();
    const snapshot = createCharacterSnapshot(emptyStats(), [], ctx);
    const report = calculateDamage(snapshot);
    expect(report.totalDps).toBe(0);
    expect(report.isDotBuild).toBe(false);
  });

  it('pipeline runs without error', () => {
    const skills: SkillSetup[] = [{
      activeSkill: {
        name: 'Fireball', level: 20, quality: 0, variant: 'regular',
        isVaal: false, isAwakened: false, isCorrupted: false,
        tags: ['fire', 'spell'],
        baseDamage: [{ type: 'fire', min: 1095, max: 1643 }],
        effectiveness: 3.7, attackTime: null, castTime: 0.75,
        conversion: [], mechanics: [{ type: 'selfCast', multiplier: 1.0 }],
      },
      supports: [],
      enabled: true, sockets: 4,
    }];
    const ctx = defaultCalculationContext();
    const snapshot = createCharacterSnapshot(emptyStats(), skills, ctx);
    const report = calculateDamage(snapshot);
    expect(report).toBeDefined();
    expect(typeof report.totalDps).toBe('number');
  });
});

describe('defense calculator (stub)', () => {
  it('returns defense report from snapshot', () => {
    const ctx = defaultCalculationContext();
    const snapshot = createCharacterSnapshot(emptyStats(), [], ctx);
    const report = calculateDefense(snapshot);
    expect(report.life).toBe(0);
    expect(report.energyShield).toBe(0);
    expect(report.combinedPool).toBe(0);
    expect(typeof report.physReduction).toBe('number');
  });

  it('calculates effective resistances', () => {
    const stats = emptyStats();
    stats.defense.fireResistance = 120;
    stats.defense.maxFireResistance = 5;
    const res = calculateEffectiveResistances(stats);
    expect(res.fire).toBe(120);
    expect(res.maxFire).toBe(80);
  });

  it('caps block at 75%', () => {
    const stats = emptyStats();
    stats.defense.attackBlock = 80;
    const block = calculateBlockChance(stats);
    expect(block.attackBlock).toBe(75);
    expect(block.spellBlock).toBe(0);
  });

  it('handles CI keystone combined pool', () => {
    const stats = emptyStats();
    stats.mechanics.overrides['life'] = 1;
    stats.defense.energyShield = 5000;
    const ctx = defaultCalculationContext();
    const snapshot = createCharacterSnapshot(stats, [], ctx);
    const report = calculateDefense(snapshot);
    expect(report.life).toBe(1);
    expect(report.combinedPool).toBe(5001);
  });
});
