import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePobXml } from '../parsers/pob-xml.parser.js';
import { fromPob } from '../factory/build-factory.js';
import { analyze } from '../engine/analyzer.engine.js';

const TEST_DIR = resolve(fileURLToPath(import.meta.url), '..');
const FIXTURES_DIR = resolve(TEST_DIR, 'fixtures');

describe('PoB import integration', () => {
  it('parses boneshatter juggernaut PoB XML and produces AnalysisResult', () => {
    const xml = readFileSync(resolve(FIXTURES_DIR, 'boneshatter-jugg.pob.xml'), 'utf-8');
    expect(xml.length).toBeGreaterThan(0);

    const dto = parsePobXml(xml);
    expect(dto.build.className).toBe('Juggernaut');
    expect(dto.build.ascendClassName).toBe('Berserker');
    expect(dto.build.level).toBe(90);
    expect(dto.skills.length).toBeGreaterThanOrEqual(1);
    expect(dto.items.length).toBeGreaterThanOrEqual(7);

    const build = fromPob(dto);
    expect(build.character.class).toBe('Juggernaut');
    expect(build.character.level).toBe(90);
    expect(build.items.length).toBeGreaterThanOrEqual(7);
    expect(build.skills.length).toBe(2);

    const result = analyze(build);
    expect(result.build.buildName).toContain('Berserker');
    expect(result.build.class).toBe('Juggernaut');
    expect(result.facts.offense).toBeDefined();
    expect(result.facts.defense).toBeDefined();
    expect(result.facts.scaling).toBeDefined();
    expect(result.insights.problems).toBeInstanceOf(Array);
    expect(result.insights.recommendations).toBeInstanceOf(Array);
    expect(result.scores.overall).toBeGreaterThanOrEqual(0);
    expect(result.scores.overall).toBeLessThanOrEqual(100);
  });

  it('detects enabled skills from the bone shatter build', () => {
    const xml = readFileSync(resolve(FIXTURES_DIR, 'boneshatter-jugg.pob.xml'), 'utf-8');
    const dto = parsePobXml(xml);
    const build = fromPob(dto);

    const enabledSkills = build.skills.filter((s) => s.isEnabled);
    expect(enabledSkills.length).toBe(2);
    expect(enabledSkills[0]?.activeGem.name).toBe('Boneshatter');
  });

  it('maps item slots correctly', () => {
    const xml = readFileSync(resolve(FIXTURES_DIR, 'boneshatter-jugg.pob.xml'), 'utf-8');
    const dto = parsePobXml(xml);
    const build = fromPob(dto);

    const slots = build.items.map((item) => item.slot);
    expect(slots).toContain('mainHand');
    expect(slots).toContain('helm');
    expect(slots).toContain('chest');
    expect(slots).toContain('gloves');
    expect(slots).toContain('boots');
    expect(slots).toContain('amulet');
    expect(slots).toContain('ring1');
    expect(slots).toContain('ring2');
    expect(slots).toContain('belt');
  });

  it('includes version metadata in AnalysisResult', () => {
    const xml = readFileSync(resolve(FIXTURES_DIR, 'boneshatter-jugg.pob.xml'), 'utf-8');
    const dto = parsePobXml(xml);
    const build = fromPob(dto);
    const result = analyze(build);

    expect(result.metadata.analyzerVersion).toBe('2.0.0');
    expect(result.metadata.calculationVersion).toBe('1.0.0');
    expect(result.metadata.patchVersion).toBeTruthy();
    expect(result.metadata.buildHash).toBeTruthy();
    expect(result.metadata.analyzedAt).toBeGreaterThan(0);
  });

  it('parses fire trap elementalist spell build and produces AnalysisResult', () => {
    const xml = readFileSync(resolve(FIXTURES_DIR, 'firetrap-elementalist.pob.xml'), 'utf-8');
    const dto = parsePobXml(xml);
    expect(dto.build.className).toBe('Elementalist');
    expect(dto.build.level).toBe(92);
    expect(dto.skills.length).toBe(2);

    const build = fromPob(dto);
    expect(build.character.class).toBe('Elementalist');
    expect(build.character.level).toBe(92);
    expect(build.items.length).toBeGreaterThanOrEqual(7);
    expect(build.skills.length).toBe(2);

    const result = analyze(build);
    expect(result.build.buildName).toContain('Elementalist');
    expect(result.facts.offense).toBeDefined();
    expect(result.facts.defense).toBeDefined();
    expect(result.facts.scaling).toBeDefined();
    expect(result.metadata.calculationVersion).toBe('1.0.0');
    expect(result.scores.overall).toBeGreaterThanOrEqual(0);
    expect(result.scores.overall).toBeLessThanOrEqual(100);
  });

  it('aggregates energy shield stats for hybrid builds', () => {
    const xml = readFileSync(resolve(FIXTURES_DIR, 'firetrap-elementalist.pob.xml'), 'utf-8');
    const dto = parsePobXml(xml);
    const build = fromPob(dto);
    const result = analyze(build);

    expect(result.facts.defense.energyShield).toBeGreaterThan(0);
    expect(result.facts.defense.combinedPool).toBeGreaterThan(result.facts.defense.life);
  });
});
