import { describe, it, expect } from 'vitest';
import { STAT_REGISTRY } from '../index.js';

const EXISTING_MOD_STAT_NAMES_TO_REGISTRY: Record<string, string> = {
  life: 'defense.life',
  energyShield: 'defense.energyShield',
  mana: 'defense.mana',
  armour: 'defense.armour',
  evasion: 'defense.evasion',
  ward: 'defense.ward',
  fireResistance: 'resistance.fire',
  coldResistance: 'resistance.cold',
  lightningResistance: 'resistance.lightning',
  chaosResistance: 'resistance.chaos',
  maxFireResistance: 'resistance.maxFire',
  maxColdResistance: 'resistance.maxCold',
  maxLightningResistance: 'resistance.maxLightning',
  strength: 'attribute.strength',
  dexterity: 'attribute.dexterity',
  intelligence: 'attribute.intelligence',
  physicalDamage: 'offense.physicalDamage',
  fireDamage: 'offense.fireDamage',
  coldDamage: 'offense.coldDamage',
  lightningDamage: 'offense.lightningDamage',
  chaosDamage: 'offense.chaosDamage',
  elementalDamage: 'offense.elementalDamage',
  elementalDamageWithAttacks: 'offense.elementalDamageWithAttacks',
  spellDamage: 'offense.spellDamage',
  attackSpeed: 'offense.attackSpeed',
  castSpeed: 'offense.castSpeed',
  movementSpeed: 'offense.movementSpeed',
  criticalChance: 'offense.criticalChance',
  criticalMultiplier: 'offense.criticalMultiplier',
  attackBlock: 'defense.attackBlock',
  spellBlock: 'defense.spellBlock',
  spellSuppression: 'defense.spellSuppression',
  lifeRegen: 'defense.lifeRegen',
  lifeOnBlock: 'resource.lifeOnBlock',
  fireDamageOverTimeMultiplier: 'offense.fireDotMultiplier',
  physicalAsExtraFire: 'conversion.physicalAsExtraFire',
  physicalAsExtraCold: 'conversion.physicalAsExtraCold',
  physicalAsExtraLightning: 'conversion.physicalAsExtraLightning',
  physicalAsExtraChaos: 'conversion.physicalAsExtraChaos',
  enemyFireResistance: 'enemy.fireResistance',
  enemyColdResistance: 'enemy.coldResistance',
  enemyLightningResistance: 'enemy.lightningResistance',
};

describe('StatRegistry — backward compatibility', () => {
  it('every existing mod pattern stat name maps to a registry key', () => {
    const missing: string[] = [];
    for (const [oldName, registryId] of Object.entries(
      EXISTING_MOD_STAT_NAMES_TO_REGISTRY,
    )) {
      if (!STAT_REGISTRY[registryId]) {
        missing.push(`${oldName} → ${registryId} (registry key not found)`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('has at least 40 mapped old stat names', () => {
    const count = Object.keys(EXISTING_MOD_STAT_NAMES_TO_REGISTRY).length;
    expect(count).toBeGreaterThanOrEqual(40);
  });

  it('all mapped registry keys exist in STAT_REGISTRY', () => {
    const ids = Object.values(EXISTING_MOD_STAT_NAMES_TO_REGISTRY);
    const uniqueIds = new Set(ids);

    for (const id of uniqueIds) {
      expect(STAT_REGISTRY[id]).toBeDefined();
    }
  });
});
