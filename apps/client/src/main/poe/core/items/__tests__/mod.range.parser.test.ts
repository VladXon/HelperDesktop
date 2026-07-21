import { describe, it, expect } from 'vitest';
import { parseModRange } from '../mod.range.parser.js';

describe('mod range parser', () => {
  it('parses "+120 to maximum Life" as flat life', () => {
    const result = parseModRange('+120 to maximum life');
    expect(result.length).toBe(1);
    expect(result[0]!.stat).toBe('life');
    expect(result[0]!.value).toBe(120);
    expect(result[0]!.type).toBe('flat');
  });

  it('parses "25% increased Fire Damage" as increased fire', () => {
    const result = parseModRange('25% increased Fire Damage');
    expect(result.length).toBe(1);
    expect(result[0]!.stat).toBe('fireDamage');
    expect(result[0]!.value).toBe(25);
    expect(result[0]!.type).toBe('increased');
  });

  it('parses "Gain 20% of Physical Damage as Extra Fire" as conversion', () => {
    const result = parseModRange('Gain 20% of Physical Damage as Extra Fire');
    expect(result.length).toBe(1);
    expect(result[0]!.stat).toBe('physicalAsExtraFire');
    expect(result[0]!.value).toBe(20);
    expect(result[0]!.type).toBe('conversion');
  });

  it('parses "Enemies have -10% Fire Resistance" as enemy debuff', () => {
    const result = parseModRange('Enemies have -10% to Fire Resistance');
    expect(result.length).toBe(1);
    expect(result[0]!.stat).toBe('enemyFireResistance');
    expect(result[0]!.value).toBe(-10);
    expect(result[0]!.type).toBe('flat');
  });

  it('parses "+30% to fire resistance"', () => {
    const result = parseModRange('+30% to fire resistance');
    expect(result.length).toBe(1);
    expect(result[0]!.stat).toBe('fireResistance');
    expect(result[0]!.value).toBe(30);
    expect(result[0]!.type).toBe('flat');
  });

  it('parses "+45% to cold resistance"', () => {
    const result = parseModRange('+45% to cold resistance');
    expect(result[0]!.stat).toBe('coldResistance');
    expect(result[0]!.value).toBe(45);
  });

  it('parses "+25% to chaos resistance"', () => {
    const result = parseModRange('+25% to chaos resistance');
    expect(result[0]!.stat).toBe('chaosResistance');
    expect(result[0]!.value).toBe(25);
  });

  it('parses "+1500 to armour" flat', () => {
    const result = parseModRange('+1500 to armour');
    expect(result[0]!.stat).toBe('armour');
    expect(result[0]!.value).toBe(1500);
    expect(result[0]!.type).toBe('flat');
  });

  it('parses "30% increased armour"', () => {
    const result = parseModRange('30% increased armour');
    expect(result[0]!.stat).toBe('armour');
    expect(result[0]!.value).toBe(30);
    expect(result[0]!.type).toBe('increased');
  });

  it('parses "+30 to strength" flat attribute', () => {
    const result = parseModRange('+30 to strength');
    expect(result[0]!.stat).toBe('strength');
    expect(result[0]!.value).toBe(30);
  });

  it('parses "+20% increased attack speed"', () => {
    const result = parseModRange('+20% increased attack speed');
    expect(result[0]!.stat).toBe('attackSpeed');
    expect(result[0]!.value).toBe(20);
    expect(result[0]!.type).toBe('increased');
  });

  it('parses "+25% to movement speed"', () => {
    const result = parseModRange('+25% to movement speed');
    expect(result[0]!.stat).toBe('movementSpeed');
    expect(result[0]!.value).toBe(25);
    expect(result[0]!.type).toBe('increased');
  });

  it('parses "Adds 120 to 200 physical damage" as two flat entries', () => {
    const result = parseModRange('Adds 120 to 200 physical damage');
    expect(result.length).toBe(2);
    expect(result[0]!.stat).toBe('physicalDamage');
    expect(result[0]!.value).toBe(120);
    expect(result[1]!.stat).toBe('physicalDamage');
    expect(result[1]!.value).toBe(200);
  });

  it('parses "+18% chance to suppress spell damage"', () => {
    const result = parseModRange('+18% chance to suppress spell damage');
    expect(result[0]!.stat).toBe('spellSuppression');
    expect(result[0]!.value).toBe(18);
  });

  it('parses "+35% to fire damage over time multiplier"', () => {
    const result = parseModRange('+35% to fire damage over time multiplier');
    expect(result[0]!.stat).toBe('fireDamageOverTimeMultiplier');
    expect(result[0]!.value).toBe(35);
  });

  it('parses all-elemental resistances into 3 stats', () => {
    const result = parseModRange('+16% to all elemental resistances');
    expect(result.length).toBe(3);
    expect(result[0]!.stat).toBe('fireResistance');
    expect(result[1]!.stat).toBe('coldResistance');
    expect(result[2]!.stat).toBe('lightningResistance');
    expect(result[0]!.value).toBe(16);
    expect(result[1]!.value).toBe(16);
    expect(result[2]!.value).toBe(16);
  });

  it('parses "+5 to maximum fire resistance"', () => {
    const result = parseModRange('+5 to maximum fire resistance');
    expect(result[0]!.stat).toBe('maxFireResistance');
    expect(result[0]!.value).toBe(5);
  });

  it('returns unknown for unrecognized text', () => {
    const result = parseModRange('Nearby enemies have 15% increased damage taken');
    expect(result[0]!.stat).toBe('unknown');
    expect(result[0]!.value).toBe(0);
  });
});
