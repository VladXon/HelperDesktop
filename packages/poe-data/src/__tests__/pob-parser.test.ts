import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parsePobXml,
  parsePobPastebin,
  parsePobbIn,
  isPobPastebinUrl,
  extractPastebinId,
} from '../pob/pob-xml.parser.js';
import { importFromPobUrl, importFromPobXml } from '../pob/pob.adapter.js';
import { MockHttpClient } from '../http/http-client.js';

const TEST_DIR = resolve(fileURLToPath(import.meta.url), '..');
const FIXTURES_DIR = resolve(TEST_DIR, 'fixtures');

describe('parsePobXml', () => {
  it('parses boneshatter juggernaut PoB XML', () => {
    const xml = readFileSync(resolve(FIXTURES_DIR, 'boneshatter-jugg.pob.xml'), 'utf-8');
    const dto = parsePobXml(xml);

    expect(dto.build.className).toBe('Juggernaut');
    expect(dto.build.ascendClassName).toBe('Berserker');
    expect(dto.build.level).toBe(90);
    expect(dto.skills.length).toBeGreaterThanOrEqual(1);
    expect(dto.items.length).toBeGreaterThanOrEqual(7);
  });

  it('parses firetrap elementalist PoB XML', () => {
    const xml = readFileSync(resolve(FIXTURES_DIR, 'firetrap-elementalist.pob.xml'), 'utf-8');
    const dto = parsePobXml(xml);

    expect(dto.build.className).toBe('Elementalist');
    expect(dto.build.level).toBe(92);
    expect(dto.skills.length).toBe(2);
    expect(dto.items.length).toBeGreaterThanOrEqual(7);
  });

  it('extracts item information correctly', () => {
    const xml = readFileSync(resolve(FIXTURES_DIR, 'boneshatter-jugg.pob.xml'), 'utf-8');
    const dto = parsePobXml(xml);

    for (const item of dto.items) {
      expect(item.id).toBeTruthy();
      expect(item.rarity).toBeTruthy();
      expect(typeof item.baseType).toBe('string');
    }
  });

  it('extracts tree metadata', () => {
    const xml = readFileSync(resolve(FIXTURES_DIR, 'boneshatter-jugg.pob.xml'), 'utf-8');
    const dto = parsePobXml(xml);

    expect(dto.tree.treeVersion).toBeTruthy();
    expect(dto.tree).toBeDefined();
  });

  it('returns defaults for empty xml', () => {
    const dto = parsePobXml('<PathOfBuilding></PathOfBuilding>');

    expect(dto.build.className).toBe('Unknown');
    expect(dto.build.level).toBe(1);
    expect(dto.skills).toEqual([]);
    expect(dto.items).toEqual([]);
    expect(dto.tree.nodes).toEqual([]);
  });

  it('parses config section', () => {
    const xml = readFileSync(resolve(FIXTURES_DIR, 'boneshatter-jugg.pob.xml'), 'utf-8');
    const dto = parsePobXml(xml);

    expect(dto.config).toBeDefined();
    expect(typeof dto.config.isBoss).toBe('boolean');
    expect(typeof dto.config.enemyResistances).toBe('number');
  });
});

describe('parsePobPastebin', () => {
  it('parses base64-encoded pastebin content', async () => {
    const xml = readFileSync(resolve(FIXTURES_DIR, 'boneshatter-jugg.pob.xml'), 'utf-8');
    const buf = Buffer.from(xml, 'utf-8');
    const { deflateRawSync } = await import('node:zlib');
    const zlib = deflateRawSync(buf).toString('base64');

    const dto = parsePobPastebin(zlib);
    expect(dto.build.className).toBe('Juggernaut');
    expect(dto.build.level).toBe(90);
  });
});

describe('parsePobbIn', () => {
  it('parses base64url+zlib encoded pobb.in data', async () => {
    const xml = readFileSync(resolve(FIXTURES_DIR, 'boneshatter-jugg.pob.xml'), 'utf-8');
    const buf = Buffer.from(xml, 'utf-8');
    const { deflateSync } = await import('node:zlib');
    const compressed = deflateSync(buf);
    const base64url = compressed
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const dto = parsePobbIn(base64url);
    expect(dto.build.className).toBe('Juggernaut');
    expect(dto.build.level).toBe(90);
  });

  it('parses firetrap elementalist pobb.in data', async () => {
    const xml = readFileSync(resolve(FIXTURES_DIR, 'firetrap-elementalist.pob.xml'), 'utf-8');
    const buf = Buffer.from(xml, 'utf-8');
    const { deflateSync } = await import('node:zlib');
    const compressed = deflateSync(buf);
    const base64url = compressed
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const dto = parsePobbIn(base64url);
    expect(dto.build.className).toBe('Elementalist');
    expect(dto.build.level).toBe(92);
  });
});

describe('isPobPastebinUrl', () => {
  it('matches standard pastebin URLs', () => {
    expect(isPobPastebinUrl('https://pastebin.com/abc123')).toBe(true);
  });

  it('matches raw pastebin URLs', () => {
    expect(isPobPastebinUrl('https://pastebin.com/raw/abc123')).toBe(true);
  });

  it('rejects non-pastebin URLs', () => {
    expect(isPobPastebinUrl('https://example.com/abc123')).toBe(false);
  });
});

describe('extractPastebinId', () => {
  it('extracts id from standard URL', () => {
    expect(extractPastebinId('https://pastebin.com/abc123')).toBe('abc123');
  });

  it('extracts id from raw URL', () => {
    expect(extractPastebinId('https://pastebin.com/raw/abc123')).toBe('abc123');
  });

  it('returns null for invalid URL', () => {
    expect(extractPastebinId('https://example.com/')).toBeNull();
  });
});

describe('importFromPobXml', () => {
  it('parses raw XML successfully', async () => {
    const xml = readFileSync(resolve(FIXTURES_DIR, 'boneshatter-jugg.pob.xml'), 'utf-8');
    const result = await importFromPobXml(xml);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.build.className).toBe('Juggernaut');
      expect(result.meta.source).toBe('raw-xml');
    }
  });

  it('returns ok for any XML-like input (parser is lenient)', async () => {
    const result = await importFromPobXml('<PathOfBuilding><random></random></PathOfBuilding>');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.build.className).toBe('Unknown');
      expect(result.data.items).toEqual([]);
    }
  });
});

describe('importFromPobUrl', () => {
  it('returns error for invalid pastebin URL', async () => {
    const client = new MockHttpClient();
    const result = await importFromPobUrl('https://not-pastebin.com/abc123', client);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Not a valid PoB URL');
    }
  });

  it('imports base64 from pastebin via mock HTTP client', async () => {
    const xml = readFileSync(resolve(FIXTURES_DIR, 'boneshatter-jugg.pob.xml'), 'utf-8');
    const buf = Buffer.from(xml, 'utf-8');
    const zlib = (await import('node:zlib')).deflateRawSync(buf).toString('base64');

    const client = new MockHttpClient();
    client.onGet('https://pastebin.com/raw/abc123', zlib);

    const result = await importFromPobUrl('https://pastebin.com/abc123', client);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.build.className).toBe('Juggernaut');
      expect(result.data.build.level).toBe(90);
      expect(result.data.items.length).toBeGreaterThanOrEqual(7);
    }
  });

  it('imports base64url+zlib from pobb.in via mock HTTP client', async () => {
    const xml = readFileSync(resolve(FIXTURES_DIR, 'boneshatter-jugg.pob.xml'), 'utf-8');
    const buf = Buffer.from(xml, 'utf-8');
    const { deflateSync } = await import('node:zlib');
    const compressed = deflateSync(buf);
    const base64url = compressed
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const client = new MockHttpClient();
    client.onGet('https://pobb.in/abc123/raw', base64url);

    const result = await importFromPobUrl('https://pobb.in/abc123', client);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.build.className).toBe('Juggernaut');
      expect(result.data.build.level).toBe(90);
      expect(result.data.items.length).toBeGreaterThanOrEqual(7);
    }
  });

  it('returns error on HTTP failure', async () => {
    const client = new MockHttpClient();
    client.onGet('https://pastebin.com/raw/abc', new Error('Network failure'));

    const result = await importFromPobUrl('https://pastebin.com/abc', client);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Failed to import PoB build');
    }
  });

  it('returns error on empty response', async () => {
    const client = new MockHttpClient();
    client.onGet('https://pastebin.com/raw/abc', '');

    const result = await importFromPobUrl('https://pastebin.com/abc', client);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Empty response from pastebin');
    }
  });

  it('parses real PoB XML with text-line item format (pobb.in)', () => {
    const realXml = `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build className="Templar" level="72" ascendClassName="Guardian" targetVersion="3_0" bandit="None"/>
  <Items>
    <Item id="107">
Rarity: RARE
Torment Peak
Bone Helmet
Armour: 295
Item Level: 87
Quality: 30
Sockets: W-W-W-W
LevelReq: 73
Implicits: 2
+2 to Level of Socketed Duration Gems
Minions deal 20% increased Damage
+115 to maximum Life
+44% to Fire Resistance
+33% to Chaos Resistance
25% increased Area Damage
			<ModRange range="0.5" id="1"/>
			<ModRange range="0.5" id="2"/>
    </Item>
    <Item id="95">
Rarity: RARE
New Item
Paladin Gloves
Armour: 521
Energy Shield: 104
Searing Exarch Item
Eater of Worlds Item
Crafted: true
LevelReq: 84
Implicits: 2
{exarch}15% chance to Unnerve Enemies for 4 seconds on Hit
{eater}0.3% of Lightning Damage Leeched as Life
84% increased Armour and Energy Shield
+115 to maximum Life
+44% to Fire Resistance
{tags:damage,minion}{crafted}{range:1}Minions deal (10-20)% increased Damage
			<ModRange range="0.5" id="1"/>
    </Item>
    <ItemSet id="1" title="Loadout 1">
      <Slot itemId="107" name="Helmet"/>
      <Slot itemId="95" name="Gloves"/>
    </ItemSet>
  </Items>
</PathOfBuilding>`;

    const dto = parsePobXml(realXml);

    expect(dto.build.className).toBe('Templar');
    expect(dto.build.level).toBe(72);
    expect(dto.items.length).toBe(2);
    expect(dto.itemSets.length).toBe(1);
    expect(dto.itemSets[0].slotItemIds['Helmet']).toBe('107');

    const helmet = dto.items.find(i => i.id === '107')!;
    expect(helmet.baseType).toBe('Bone Helmet');
    expect(helmet.rarity).toBe('rare');
    expect(helmet.rawMods.length).toBeGreaterThanOrEqual(4);

    const lifeMod = helmet.rawMods.find(m => m.text.includes('maximum Life'));
    expect(lifeMod).toBeDefined();
    expect(lifeMod!.explicit).toBe(true);

    const implicitMod = helmet.rawMods.find(m => m.text.includes('Socketed Duration Gems'));
    expect(implicitMod).toBeDefined();
    expect(implicitMod!.implicit).toBe(true);

    const gloves = dto.items.find(i => i.id === '95')!;
    expect(gloves.baseType).toBe('Paladin Gloves');
    expect(gloves.rawMods.length).toBeGreaterThanOrEqual(3);

    const craftedMod = gloves.rawMods.find(m => m.text.includes('{crafted}'));
    expect(craftedMod).toBeDefined();
    expect(craftedMod!.crafted).toBe(true);
  });

  it('filters items by loadout (multi-loadout build)', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build className="Marauder" level="90" ascendClassName="Juggernaut" targetVersion="3_0" bandit="kill-all"/>
  <Items>
    <Item id="1"><![CDATA[Rarity: RARE
Axe
Implicits: 0
+100 to maximum Life]]></Item>
    <Item id="2"><![CDATA[Rarity: RARE
Helmet
Implicits: 0
+50 to maximum Life]]></Item>
    <Item id="3"><![CDATA[Rarity: RARE
Shield
Implicits: 0
+200 to armour]]></Item>
    <ItemSet id="1" title="Lvl 50 (Leveling)">
      <Slot itemId="1" name="Weapon 1"/>
    </ItemSet>
    <ItemSet id="2" title="Lvl 90 (Endgame)">
      <Slot itemId="1" name="Weapon 1"/>
      <Slot itemId="2" name="Helmet"/>
      <Slot itemId="3" name="Shield"/>
    </ItemSet>
  </Items>
</PathOfBuilding>`;

    const dto = parsePobXml(xml);

    expect(dto.itemSets.length).toBe(2);

    const endgameItems = dto.items.filter(i => ['1', '2', '3'].includes(i.id));
    expect(endgameItems.length).toBe(3);
  });
});
