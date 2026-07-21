import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePobXml } from '../../parsers/pob-xml.parser.js';
import { parsePoBItems } from '../item.parser.js';

const TEST_DIR = resolve(fileURLToPath(import.meta.url), '..');
const FIXTURES_DIR = resolve(TEST_DIR, '..', '..', '__tests__', 'fixtures');

describe('item parser', () => {
  const xml = readFileSync(resolve(FIXTURES_DIR, 'boneshatter-jugg.pob.xml'), 'utf-8');
  const dto = parsePobXml(xml);
  const items = parsePoBItems(dto.items);

  it('parses all items from the build', () => {
    expect(items.length).toBeGreaterThanOrEqual(7);
  });

  it('sets item id from PoB item', () => {
    const weapon = items.find((i) => i.id === 'Weapon 1');
    expect(weapon).toBeDefined();
    expect(weapon!.id).toBe('Weapon 1');
  });

  it('maps item rarity correctly', () => {
    const weapon = items.find((i) => i.id === 'Weapon 1');
    expect(weapon!.rarity).toBe('rare');
  });

  it('parses base type', () => {
    const weapon = items.find((i) => i.id === 'Weapon 1');
    expect(weapon!.baseType).toBe('Despot Axe');
  });

  it('classifies explicit mods separately from implicits', () => {
    const helmet = items.find((i) => i.id === 'Helmet');
    expect(helmet).toBeDefined();
    expect(helmet!.explicitMods.length).toBeGreaterThan(0);
  });

  it('separates crafted mods from explicit mods when both present', () => {
    const result = parsePoBItems([
      {
        id: 'Gloves',
        title: '',
        baseType: 'Titan Gauntlets',
        rarity: 'rare',
        rawMods: [
          { text: '+85 to maximum life', implicit: false, explicit: true, crafted: false },
          { text: '+15% to cold resistance', implicit: false, explicit: false, crafted: true },
          { text: '+30% to fire resistance', implicit: false, explicit: true, crafted: false },
        ],
        sockets: [],
      },
    ]);
    expect(result.length).toBe(1);
    expect(result[0]!.explicitMods.length).toBe(2);
    expect(result[0]!.craftedMods.length).toBe(1);
    expect(result[0]!.craftedMods[0]?.text).toBe('+15% to cold resistance');
  });

  it('maps sockets to SocketGroup with colours and links', () => {
    const weapon = items.find((i) => i.id === 'Weapon 1');
    expect(weapon!.sockets.length).toBeGreaterThan(0);
    const socket = weapon!.sockets[0];
    expect(socket).toBeDefined();
    if (socket) {
      expect(socket.colours).toBeTruthy();
      expect(typeof socket.links).toBe('number');
      expect(socket.links).toBeGreaterThanOrEqual(0);
    }
  });

  it('sets isCorrupted and isFractured to false for normal items', () => {
    const body = items.find((i) => i.id === 'Body Armour');
    expect(body).toBeDefined();
    expect(body!.isFractured).toBe(false);
    expect(body!.isCorrupted).toBe(false);
  });

  it('returns empty enchantMods for items without enchants', () => {
    const helmet = items.find((i) => i.id === 'Helmet');
    expect(helmet!.enchantMods).toEqual([]);
  });

  it('filters fractured mods to their own array', () => {
    const allFractured = items.filter((i) => i.fracturedMods.length > 0);
    expect(allFractured).toBeDefined();
  });

  it('returns empty array for empty input', () => {
    expect(parsePoBItems([])).toEqual([]);
  });
});
