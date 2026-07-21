import { describe, it, expect } from 'vitest';
import { STAT_REGISTRY, S } from '../index.js';

describe('StatRegistry — core', () => {
  it('contains 80+ seed stats', () => {
    const count = Object.keys(STAT_REGISTRY).length;
    expect(count).toBeGreaterThanOrEqual(80);
  });

  it('has no duplicate IDs', () => {
    const ids = Object.values(STAT_REGISTRY).map((s) => s.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('every stat has a namespaced ID (category.name)', () => {
    for (const stat of Object.values(STAT_REGISTRY)) {
      expect(stat.id).toMatch(/^[a-z]+\.[a-zA-Z_]+$/);
    }
  });

  it('every stat has a non-empty displayName', () => {
    for (const stat of Object.values(STAT_REGISTRY)) {
      expect(stat.displayName).toBeTruthy();
      expect(typeof stat.displayName).toBe('string');
      expect(stat.displayName.trim()).not.toBe('');
    }
  });

  it('every stat has a valid category', () => {
    const validCategories = [
      'defense',
      'resistance',
      'offense',
      'attribute',
      'resource',
      'skill',
      'ailment',
      'conversion',
      'enemy',
      'mechanic',
    ];
    for (const stat of Object.values(STAT_REGISTRY)) {
      expect(validCategories).toContain(stat.category);
    }
  });

  it('every stat has a valid aggregation kind', () => {
    const validKinds = ['sum', 'product', 'maximum', 'override', 'flag'];
    for (const stat of Object.values(STAT_REGISTRY)) {
      expect(validKinds).toContain(stat.aggregation.kind);
    }
  });

  it('every stat has a gameMappings array', () => {
    for (const stat of Object.values(STAT_REGISTRY)) {
      expect(Array.isArray(stat.gameMappings)).toBe(true);
    }
  });

  it('sum aggregation is the most common', () => {
    const sumCount = Object.values(STAT_REGISTRY).filter(
      (s) => s.aggregation.kind === 'sum',
    ).length;
    const totalCount = Object.keys(STAT_REGISTRY).length;
    expect(sumCount).toBeGreaterThan(totalCount * 0.5);
  });

  it('flag aggregation stats have no defaultBase', () => {
    const flagStats = Object.values(STAT_REGISTRY).filter(
      (s) => s.aggregation.kind === 'flag',
    );
    for (const stat of flagStats) {
      expect(stat.defaultBase).toBeUndefined();
    }
  });

  it('registry is frozen (immutable)', () => {
    expect(Object.isFrozen(STAT_REGISTRY)).toBe(true);
  });

  it('registry is a flat map, not nested', () => {
    const keys = Object.keys(STAT_REGISTRY);
    for (const key of keys) {
      expect(key).toContain('.');
      const stat = STAT_REGISTRY[key]!;
      expect(stat.id).toBe(key);
    }
  });
});
