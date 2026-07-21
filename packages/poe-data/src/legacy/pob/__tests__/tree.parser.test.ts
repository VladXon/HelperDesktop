import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePobXml } from '../../parsers/pob-xml.parser.js';
import { parsePoBTree } from '../tree.parser.js';
import type { PoBTree } from '../../dto/pob-xml.dto.js';

const TEST_DIR = resolve(fileURLToPath(import.meta.url), '..');
const FIXTURES_DIR = resolve(TEST_DIR, '..', '..', '__tests__', 'fixtures');

describe('tree parser', () => {
  it('parses tree version', () => {
    const xml = readFileSync(resolve(FIXTURES_DIR, 'boneshatter-jugg.pob.xml'), 'utf-8');
    const dto = parsePobXml(xml);
    const tree = parsePoBTree(dto.tree);

    expect(tree.version).toBeTruthy();
    expect(tree.version.length).toBeGreaterThan(0);
  });

  it('parses allocated nodes', () => {
    const xml = readFileSync(resolve(FIXTURES_DIR, 'boneshatter-jugg.pob.xml'), 'utf-8');
    const dto = parsePobXml(xml);
    const tree = parsePoBTree(dto.tree);

    expect(tree.allocatedNodes).toBeInstanceOf(Array);
  });

  it('preserves mastery choices', () => {
    const xml = readFileSync(resolve(FIXTURES_DIR, 'boneshatter-jugg.pob.xml'), 'utf-8');
    const dto = parsePobXml(xml);
    const tree = parsePoBTree(dto.tree);

    expect(typeof tree.masteryChoices).toBe('object');
  });

  it('parses keystone names', () => {
    const xml = readFileSync(resolve(FIXTURES_DIR, 'boneshatter-jugg.pob.xml'), 'utf-8');
    const dto = parsePobXml(xml);
    const tree = parsePoBTree(dto.tree);

    expect(tree.keystones).toBeInstanceOf(Array);
  });

  it('handles empty tree gracefully', () => {
    const emptyTree: PoBTree = {
      treeVersion: '3_25',
      nodes: [],
      masteryEffects: {},
      keystones: [],
      ascendancyNodes: [],
    };
    const result = parsePoBTree(emptyTree);

    expect(result.version).toBe('3_25');
    expect(result.allocatedNodes).toEqual([]);
    expect(result.keystones).toEqual([]);
    expect(result.ascendancyNodes).toEqual([]);
    expect(result.masteryChoices).toEqual({});
  });
});
