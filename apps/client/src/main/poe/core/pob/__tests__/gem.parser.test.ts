import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePobXml } from '../../parsers/pob-xml.parser.js';
import { parsePoBSkills } from '../gem.parser.js';

const TEST_DIR = resolve(fileURLToPath(import.meta.url), '..');
const FIXTURES_DIR = resolve(TEST_DIR, '..', '..', '__tests__', 'fixtures');

describe('gem parser', () => {
  const xml = readFileSync(resolve(FIXTURES_DIR, 'boneshatter-jugg.pob.xml'), 'utf-8');
  const dto = parsePobXml(xml);
  const setups = parsePoBSkills(dto.skills);

  it('parses skill setups', () => {
    expect(setups.length).toBe(2);
  });

  it('identifies active gem in each setup', () => {
    for (const setup of setups) {
      expect(setup.activeGem).toBeDefined();
      expect(setup.activeGem.name.length).toBeGreaterThan(0);
    }
  });

  it('identifies Boneshatter as the first active gem', () => {
    expect(setups[0]!.activeGem.name).toBe('Boneshatter');
  });

  it('separates support gems from active', () => {
    const boneshatter = setups[0]!;
    expect(boneshatter.supportGems.length).toBe(4);
  });

  it('parses gem level and quality', () => {
    const active = setups[0]!.activeGem;
    expect(active.level).toBeGreaterThanOrEqual(1);
    expect(active.level).toBeLessThanOrEqual(40);
    expect(active.quality).toBeGreaterThanOrEqual(0);
    expect(active.quality).toBeLessThanOrEqual(23);
  });

  it('maps regular variant', () => {
    const active = setups[0]!.activeGem;
    expect(active.variant).toBe('regular');
  });

  it('isVaal and isAwakened are false for regular gems', () => {
    const active = setups[0]!.activeGem;
    expect(active.isVaal).toBe(false);
    expect(active.isAwakened).toBe(false);
  });

  it('returns empty array for empty skill sets', () => {
    expect(parsePoBSkills([])).toEqual([]);
  });
});
