import { describe, it, expect } from 'vitest';
import { STAT_REGISTRY, S } from '../index.js';

describe('StatRegistry — S accessor', () => {
  it('S["defense.life"] returns the correct StatKey', () => {
    const key = S['defense.life'];
    expect(key).toBeDefined();
    expect(key.id).toBe('defense.life');
    expect(key.displayName).toBe('Maximum Life');
    expect(key.category).toBe('defense');
  });

  it('S returns the same object as direct STAT_REGISTRY access', () => {
    expect(S['defense.life']).toBe(STAT_REGISTRY['defense.life']);
    expect(S['resistance.fire']).toBe(STAT_REGISTRY['resistance.fire']);
  });

  it('S throws on completely unknown stat key', () => {
    expect(() => S['nonexistent.stat_that_does_not_exist']).toThrow(
      /Unknown stat key/,
    );
  });

  it('S suggests closest match on typo', () => {
    expect(() => S['defense.lif']).toThrow(/defense\.life/);
    expect(() => S['offense.fireDmage']).toThrow(/offense\.fireDamage/);
  });

  it('damage-type stats carry damageType metadata', () => {
    expect(S['offense.fireDamage'].damageType).toBe('fire');
    expect(S['offense.coldDamage'].damageType).toBe('cold');
    expect(S['offense.lightningDamage'].damageType).toBe('lightning');
    expect(S['offense.physicalDamage'].damageType).toBe('physical');
    expect(S['offense.chaosDamage'].damageType).toBe('chaos');
  });

  it('non-damage stats have no damageType', () => {
    expect(S['defense.life'].damageType).toBeUndefined();
    expect(S['attribute.strength'].damageType).toBeUndefined();
  });

  it('resistance stats have defaultCap of 75', () => {
    expect(S['resistance.fire'].defaultCap).toBe(75);
    expect(S['resistance.cold'].defaultCap).toBe(75);
    expect(S['resistance.lightning'].defaultCap).toBe(75);
    expect(S['resistance.chaos'].defaultCap).toBe(75);
  });

  it('max resistance stats have defaultBase of 75', () => {
    expect(S['resistance.maxFire'].defaultBase).toBe(75);
    expect(S['resistance.maxCold'].defaultBase).toBe(75);
    expect(S['resistance.maxLightning'].defaultBase).toBe(75);
  });

  it('block and suppression stats have defaultCap', () => {
    expect(S['defense.attackBlock'].defaultCap).toBe(75);
    expect(S['defense.spellBlock'].defaultCap).toBe(75);
    expect(S['defense.spellSuppression'].defaultCap).toBe(100);
  });

  it('percent stats are marked with isPercent', () => {
    expect(S['resistance.fire'].isPercent).toBe(true);
    expect(S['defense.attackBlock'].isPercent).toBe(true);
    expect(S['offense.attackSpeed'].isPercent).toBe(true);
    expect(S['offense.criticalChance'].isPercent).toBe(true);
  });

  it('flat stats do NOT have isPercent', () => {
    expect(S['defense.life'].isPercent).toBeUndefined();
    expect(S['offense.physicalDamage'].isPercent).toBeUndefined();
    expect(S['attribute.strength'].isPercent).toBeUndefined();
  });

  it('conversion stats are percent', () => {
    expect(S['conversion.physicalAsExtraFire'].isPercent).toBe(true);
    expect(S['conversion.physicalToFire'].isPercent).toBe(true);
  });

  it('flag stats have flag aggregation kind', () => {
    expect(S['mechanic.keystone_ci'].aggregation.kind).toBe('flag');
    expect(S['mechanic.keystone_mom'].aggregation.kind).toBe('flag');
  });

  it('maximum aggregation applied to max resist stats', () => {
    expect(S['resistance.maxFire'].aggregation.kind).toBe('maximum');
    expect(S['resistance.maxCold'].aggregation.kind).toBe('maximum');
  });

  it('product aggregation applied to action speed and enemy damage taken', () => {
    expect(S['offense.actionSpeed'].aggregation.kind).toBe('product');
    expect(S['enemy.damageTaken'].aggregation.kind).toBe('product');
  });

  it('all 10 stat categories have at least one entry', () => {
    const categories = new Set(
      Object.values(STAT_REGISTRY).map((s) => s.category),
    );
    expect(categories.size).toBe(10);
  });
});
