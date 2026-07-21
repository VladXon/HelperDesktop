import { describe, it, expect } from 'vitest';
import { normalizeCharacterSummary, normalizeCharacterDetails } from '../character-normalizer.js';
import { DEADEYE_RANGER, EMPTY_CHARACTER, MINIMAL_CHARACTER, CORRUPTED_ITEM } from './fixtures.js';

describe('normalizeCharacterSummary', () => {
  const row = {
    id: 1,
    name: 'VladSpeedRunner',
    level: 94,
    class: 'Ranger',
    ascendancy: 'Deadeye',
    league: 'Settlers',
    fetchedAt: '2026-07-22T10:00:00.000Z',
  };

  it('maps all fields from raw row to summary', () => {
    const result = normalizeCharacterSummary(row);
    expect(result.id).toBe(1);
    expect(result.name).toBe('VladSpeedRunner');
    expect(result.level).toBe(94);
    expect(result.class).toBe('Ranger');
    expect(result.ascendancy).toBe('Deadeye');
    expect(result.league).toBe('Settlers');
    expect(result.lastSync).toBe('2026-07-22T10:00:00.000Z');
  });

  it('handles null ascendancy', () => {
    const result = normalizeCharacterSummary({ ...row, ascendancy: null });
    expect(result.ascendancy).toBeNull();
  });
});

describe('normalizeCharacterDetails', () => {
  const baseRow = {
    id: 1,
    name: 'VladSpeedRunner',
    level: 94,
    class: 'Ranger',
    ascendancy: 'Deadeye',
    league: 'Settlers',
    rawJson: DEADEYE_RANGER,
  };

  it('maps base character fields', () => {
    const result = normalizeCharacterDetails(baseRow);
    expect(result.id).toBe(1);
    expect(result.name).toBe('VladSpeedRunner');
    expect(result.level).toBe(94);
    expect(result.class).toBe('Ranger');
    expect(result.ascendancy).toBe('Deadeye');
    expect(result.league).toBe('Settlers');
  });

  it('includes rawData', () => {
    const result = normalizeCharacterDetails(baseRow);
    expect(result.rawData).toBeDefined();
    expect(result.rawData.character).toBeDefined();
  });

  it('normalizes equipment items', () => {
    const result = normalizeCharacterDetails(baseRow);
    expect(result.equipment).toBeInstanceOf(Array);
    expect(result.equipment.length).toBeGreaterThan(0);

    const weapon = result.equipment.find(e => e.slot === 'Weapon')!;
    expect(weapon).toBeDefined();
    expect(weapon.baseType).toBe('Spine Bow');
    expect(weapon.rarity).toBe('rare');
    expect(weapon.sockets).toHaveLength(6);
    expect(weapon.socketedGems).toHaveLength(6);
    expect(weapon.explicitMods).toBeInstanceOf(Array);
    expect(weapon.explicitMods.length).toBeGreaterThan(0);
  });

  it('maps socket colors correctly', () => {
    const result = normalizeCharacterDetails(baseRow);
    const weapon = result.equipment.find(e => e.slot === 'Weapon')!;
    const colors = weapon.sockets.map(s => s.color);
    expect(colors).toEqual(['G', 'G', 'G', 'R', 'R', 'R']);
  });

  it('parses gem levels and quality from properties', () => {
    const result = normalizeCharacterDetails(baseRow);
    const weapon = result.equipment.find(e => e.slot === 'Weapon')!;
    const tornadoShot = weapon.socketedGems.find(g => g.name === 'Tornado Shot')!;
    expect(tornadoShot.level).toBe(21);
    expect(tornadoShot.quality).toBe(23);
    expect(tornadoShot.support).toBe(false);
  });

  it('marks support gems correctly', () => {
    const result = normalizeCharacterDetails(baseRow);
    const weapon = result.equipment.find(e => e.slot === 'Weapon')!;
    const gmp = weapon.socketedGems.find(g => g.name === 'Greater Multiple Projectiles Support')!;
    expect(gmp.support).toBe(true);

    const trinity = weapon.socketedGems.find(g => g.name === 'Trinity Support')!;
    expect(trinity.support).toBe(true);
    expect(trinity.quality).toBe(0);
  });

  it('handles quality of 0%', () => {
    const result = normalizeCharacterDetails(baseRow);
    const weapon = result.equipment.find(e => e.slot === 'Weapon')!;
    const trinity = weapon.socketedGems.find(g => g.name === 'Trinity Support')!;
    expect(trinity.quality).toBe(0);
    expect(trinity.level).toBe(20);
  });

  it('groups skills by item slot', () => {
    const result = normalizeCharacterDetails(baseRow);
    expect(result.skills).toBeInstanceOf(Array);

    const weaponSkills = result.skills.find(s => s.itemSlot === 'Weapon')!;
    expect(weaponSkills).toBeDefined();
    expect(weaponSkills.gems).toHaveLength(6);

    const bodySkills = result.skills.find(s => s.itemSlot === 'BodyArmour')!;
    expect(bodySkills).toBeDefined();
    expect(bodySkills.gems).toHaveLength(1);
  });

  it('parses property values from items', () => {
    const result = normalizeCharacterDetails(baseRow);
    const body = result.equipment.find(e => e.slot === 'BodyArmour')!;
    expect(body.propertyValues['Evasion Rating']).toBe(1892);
  });

  it('handles empty character with no items', () => {
    const result = normalizeCharacterDetails({
      ...baseRow,
      name: 'FreshStart',
      level: 2,
      class: 'Marauder',
      ascendancy: null,
      league: 'Standard',
      rawJson: EMPTY_CHARACTER,
    });
    expect(result.equipment).toEqual([]);
    expect(result.skills).toEqual([]);
  });

  it('handles character with a single plain item', () => {
    const result = normalizeCharacterDetails({
      ...baseRow,
      name: 'MinimalTest',
      level: 50,
      class: 'Witch',
      ascendancy: null,
      league: 'Hardcore',
      rawJson: MINIMAL_CHARACTER,
    });
    expect(result.equipment).toHaveLength(1);
    expect(result.equipment[0]!.slot).toBe('Weapon');
    expect(result.equipment[0]!.baseType).toBe('Primitive Staff');
    expect(result.equipment[0]!.rarity).toBe('normal');
    expect(result.skills).toEqual([]);
  });

  it('handles corrupted unique item', () => {
    const result = normalizeCharacterDetails({
      ...baseRow,
      name: 'CorruptedTest',
      level: 75,
      class: 'Duelist',
      ascendancy: 'Gladiator',
      league: 'Settlers',
      rawJson: CORRUPTED_ITEM,
    });
    expect(result.equipment).toHaveLength(1);
    expect(result.equipment[0]!.baseType).toBe('Simple Robe');
    expect(result.equipment[0]!.rarity).toBe('unique');
    expect(result.equipment[0]!.sockets).toHaveLength(6);
    expect(result.skills).toEqual([]);
  });

  it('handles missing items array gracefully', () => {
    const rawJson = { character: { name: 'NoItems', league: 'Standard', classId: 1, ascendancyClass: 0, class: 'Marauder', level: 10, experience: 100 } } as unknown as typeof DEADEYE_RANGER;
    const result = normalizeCharacterDetails({ ...baseRow, rawJson });
    expect(result.equipment).toEqual([]);
    expect(result.skills).toEqual([]);
  });

  it('handles items with missing socketedItems', () => {
    const rawJson = {
      character: { name: 'NoGems', league: 'Standard', classId: 1, ascendancyClass: 0, class: 'Marauder', level: 10, experience: 100 },
      items: [{ id: '1', name: '', typeLine: 'Rustic Sash', inventoryId: 'Belt', frameType: 0 }],
    } as unknown as typeof DEADEYE_RANGER;
    const result = normalizeCharacterDetails({ ...baseRow, rawJson });
    expect(result.equipment).toHaveLength(1);
    expect(result.equipment[0]!.socketedGems).toEqual([]);
  });

  it('handles items with missing properties array', () => {
    const rawJson = {
      character: { name: 'NoProps', league: 'Standard', classId: 1, ascendancyClass: 0, class: 'Marauder', level: 10, experience: 100 },
      items: [{ id: '1', name: 'Gold Ring', typeLine: 'Gold Ring', inventoryId: 'Ring', frameType: 0 }],
    } as unknown as typeof DEADEYE_RANGER;
    const result = normalizeCharacterDetails({ ...baseRow, rawJson });
    expect(result.equipment[0]!.propertyValues).toEqual({});
  });

  it('handles full Deadeye build with all item slots', () => {
    const result = normalizeCharacterDetails(baseRow);
    const slots = result.equipment.map(e => e.slot);
    expect(slots).toContain('Weapon');
    expect(slots).toContain('BodyArmour');
    expect(slots).toContain('Ring');
    expect(slots).toContain('Ring2');
    expect(slots).toContain('Amulet');
    expect(slots).toContain('Gloves');
    expect(slots).toContain('Boots');
    expect(slots).toContain('Helm');
    expect(slots).toContain('Flask');
  });

  it('maps implicit mods on items', () => {
    const result = normalizeCharacterDetails(baseRow);
    const amulet = result.equipment.find(e => e.slot === 'Amulet')!;
    expect(amulet.implicitMods).toEqual(['+18 to all Attributes']);
  });

  it('maps crafted mods as empty when not present', () => {
    const result = normalizeCharacterDetails(baseRow);
    const weapon = result.equipment.find(e => e.slot === 'Weapon')!;
    expect(weapon.craftedMods).toEqual([]);
  });
});
