import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPoeImportService } from '../poe-import.service.js';
import { createPoeAnalysisService } from '../poe-analysis.service.js';
import { createModDB } from '@helper/poe-engine';
import { fromPob } from '@helper/poe-data';

const TEST_DIR = resolve(fileURLToPath(import.meta.url), '..');
const FIXTURES_DIR = resolve(TEST_DIR, '..', '..', '..', '..', '..', '..', '..', 'packages', 'poe-data', 'src', '__tests__', 'fixtures');

function readFixture(name: string): string {
  return readFileSync(resolve(FIXTURES_DIR, name), 'utf-8');
}

describe('PoE Import Service', () => {
  it('imports a PoB fixture via importFromXml', async () => {
    const xml = readFixture('boneshatter-jugg.pob.xml');
    const service = createPoeImportService();

    const result = await service.importFromXml(xml);

    expect(result.dto.build.className).toBe('Juggernaut');
    expect(result.modifiers.length).toBeGreaterThan(0);
    expect(result.build.character.class).toBe('Juggernaut');
    expect(result.build.items.length).toBeGreaterThanOrEqual(7);
  });

  it('importFromXml produces valid modifiers for the engine', async () => {
    const xml = readFixture('boneshatter-jugg.pob.xml');
    const service = createPoeImportService();
    const result = await service.importFromXml(xml);

    for (const mod of result.modifiers) {
      expect(mod.id).toBeTruthy();
      expect(mod.source).toBeTruthy();
      expect(mod.type).toBeTruthy();
      expect(mod.stat).toBeDefined();
      expect(typeof mod.value).toBe('number');
    }
  });

  it('imports firetrap elementalist build', async () => {
    const xml = readFixture('firetrap-elementalist.pob.xml');
    const service = createPoeImportService();
    const result = await service.importFromXml(xml);

    expect(result.dto.build.className).toBe('Elementalist');
    expect(result.dto.build.level).toBe(92);
    expect(result.modifiers.length).toBeGreaterThan(0);
  });
});

describe('PoE Analysis Service', () => {
  it('full pipeline: import → analysis', async () => {
    const xml = readFixture('boneshatter-jugg.pob.xml');
    const importService = createPoeImportService();
    const importResult = await importService.importFromXml(xml);

    const modDb = createModDB();
    const analysisService = createPoeAnalysisService(modDb);

    const result = await analysisService.analyze({
      build: importResult.build,
      modifiers: importResult.modifiers,
    });

    expect(Object.keys(result.stats).length).toBeGreaterThan(0);
    expect(result.layers.length).toBeGreaterThan(0);
    expect(result.legacy.build.class).toBe('Juggernaut');
    expect(result.legacy.facts.offense).toBeDefined();
    expect(result.legacy.facts.defense).toBeDefined();
    expect(result.legacy.scores.overall).toBeGreaterThanOrEqual(0);
    expect(result.legacy.scores.overall).toBeLessThanOrEqual(100);
  });

  it('produces stat values via engine calculator', async () => {
    const xml = readFixture('boneshatter-jugg.pob.xml');
    const importService = createPoeImportService();
    const importResult = await importService.importFromXml(xml);

    const modDb = createModDB();
    const analysisService = createPoeAnalysisService(modDb);

    const result = await analysisService.analyze({
      build: importResult.build,
      modifiers: importResult.modifiers,
    });

    expect(result.stats['defense.life']).toBeDefined();
    expect(result.stats['resistance.fire']).toBeDefined();
  });

  it('produces explanation', async () => {
    const xml = readFixture('boneshatter-jugg.pob.xml');
    const importService = createPoeImportService();
    const importResult = await importService.importFromXml(xml);

    const modDb = createModDB();
    const analysisService = createPoeAnalysisService(modDb);

    const result = await analysisService.analyze({
      build: importResult.build,
      modifiers: importResult.modifiers,
    });

    expect(result.explanation).toBeDefined();
    expect(result.explanation!.summary).toBeTruthy();
    expect(result.explanation!.stats.length).toBeGreaterThan(0);
    expect(result.explanation!.modifiers.length).toBeGreaterThan(0);
  });

  it('analyses firetrap elementalist', async () => {
    const xml = readFixture('firetrap-elementalist.pob.xml');
    const importService = createPoeImportService();
    const importResult = await importService.importFromXml(xml);

    const modDb = createModDB();
    const analysisService = createPoeAnalysisService(modDb);

    const result = await analysisService.analyze({
      build: importResult.build,
      modifiers: importResult.modifiers,
    });

    expect(result.legacy.build.class).toBe('Elementalist');
    expect(result.legacy.facts.defense.energyShield).toBeGreaterThan(0);
    expect(result.legacy.scores.overall).toBeGreaterThanOrEqual(0);
    expect(result.legacy.scores.overall).toBeLessThanOrEqual(100);
  });

  it('handles empty modifier list gracefully', async () => {
    const xml = readFixture('boneshatter-jugg.pob.xml');
    const importService = createPoeImportService();
    const importResult = await importService.importFromXml(xml);

    const modDb = createModDB();
    const analysisService = createPoeAnalysisService(modDb);

    const result = await analysisService.analyze({
      build: importResult.build,
      modifiers: [],
    });

    expect(result.stats).toEqual({});
    expect(result.layers.length).toBe(0);
    expect(result.legacy.build.class).toBe('Juggernaut');
  });
});
