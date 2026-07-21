import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePobXml } from '../../parsers/pob-xml.parser.js';
import { parsePoBConfig } from '../config.parser.js';
import type { PoBConfig } from '../../dto/pob-xml.dto.js';

const TEST_DIR = resolve(fileURLToPath(import.meta.url), '..');
const FIXTURES_DIR = resolve(TEST_DIR, '..', '..', '__tests__', 'fixtures');

describe('config parser', () => {
  it('parses isBoss flag', () => {
    const xml = readFileSync(resolve(FIXTURES_DIR, 'boneshatter-jugg.pob.xml'), 'utf-8');
    const dto = parsePobXml(xml);
    const config = parsePoBConfig(dto.config);

    expect(typeof config.isBoss).toBe('boolean');
  });

  it('defaults isGuardian and isUber to false', () => {
    const xml = readFileSync(resolve(FIXTURES_DIR, 'boneshatter-jugg.pob.xml'), 'utf-8');
    const dto = parsePobXml(xml);
    const config = parsePoBConfig(dto.config);

    expect(config.isGuardian).toBe(false);
    expect(config.isUber).toBe(false);
  });

  it('parses enemy resistances', () => {
    const xml = readFileSync(resolve(FIXTURES_DIR, 'boneshatter-jugg.pob.xml'), 'utf-8');
    const dto = parsePobXml(xml);
    const config = parsePoBConfig(dto.config);

    expect(typeof config.enemyResistances).toBe('number');
    expect(config.enemyResistances).toBeGreaterThanOrEqual(0);
  });

  it('parses charge counts', () => {
    const xml = readFileSync(resolve(FIXTURES_DIR, 'boneshatter-jugg.pob.xml'), 'utf-8');
    const dto = parsePobXml(xml);
    const config = parsePoBConfig(dto.config);

    expect(config.charges.frenzy).toBeGreaterThanOrEqual(0);
    expect(config.charges.power).toBeGreaterThanOrEqual(0);
    expect(config.charges.endurance).toBeGreaterThanOrEqual(0);
  });

  it('handles zero-charge config', () => {
    const zeroConfig: PoBConfig = {
      isBoss: true,
      enemyResistances: 50,
      charges: { frenzy: 0, power: 0, endurance: 0 },
    };
    const result = parsePoBConfig(zeroConfig);

    expect(result.isBoss).toBe(true);
    expect(result.enemyResistances).toBe(50);
    expect(result.charges.frenzy).toBe(0);
    expect(result.charges.power).toBe(0);
    expect(result.charges.endurance).toBe(0);
  });
});
