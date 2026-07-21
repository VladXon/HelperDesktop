import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parsePobXml,
  parsePobPastebin,
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
});
