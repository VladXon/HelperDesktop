import { describe, it, expect } from 'vitest';
import { runSyncPipeline } from '../sync/sync.engine.js';
import { createSyncResult, type SyncResult } from '../sync/sync-status.js';
import type { AdapterResult, PoeItemRecord, PoeSkillRecord, EconomySnapshot } from '@helper/shared';

function makeItems(): PoeItemRecord[] {
  return [
    { game: 'poe1', name: 'Test', baseType: 'Base', itemType: '', category: '', level: 0, requiredLevel: 0, explicitStats: {}, dropSources: [], flavourText: '', icon: '', source: '', sourceUrl: '', version: '', updatedAt: 0 },
  ];
}

function makeSkills(): PoeSkillRecord[] {
  return [
    { game: 'poe1', name: 'Fireball', type: 'active', gemLevel: 20, manaMultiplier: 100, qualityStats: [], tags: [], source: '', sourceUrl: '', version: '', updatedAt: 0 },
    { game: 'poe1', name: 'Ice Nova', type: 'active', gemLevel: 20, manaMultiplier: 100, qualityStats: [], tags: [], source: '', sourceUrl: '', version: '', updatedAt: 0 },
  ];
}

function makeSnapshots(): EconomySnapshot[] {
  return [
    { league: 'Standard', currency: 'Chaos Orb', chaosEquivalent: 1, divineEquivalent: 0.0043, change24h: 0, listingCount: 1000, snapshotTime: Date.now(), history: [] },
  ];
}

function makeError(): AdapterResult<unknown> {
  return { ok: false, error: 'connection refused' };
}

describe('sync engine', () => {
  it('creates a fresh SyncResult', () => {
    const result = createSyncResult('test-source');
    expect(result.success).toBe(true);
    expect(result.inserted).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.errors).toEqual([]);
  });

  it('runs pipeline with successful tasks', async () => {
    const result = await runSyncPipeline('test-sync', [
      {
        name: 'load-items',
        fn: async () => ({ ok: true as const, data: { items: makeItems() }, meta: { source: 'test', fetchedAt: Date.now(), cached: false } }),
      },
    ]);
    expect(result.success).toBe(true);
    expect(result.inserted).toBe(1);
    expect(result.failed).toBe(0);
  });

  it('tracks failed tasks', async () => {
    const result = await runSyncPipeline('test-fail', [
      { name: 'fail-task', fn: async () => makeError() },
    ]);
    expect(result.success).toBe(false);
    expect(result.failed).toBe(1);
    expect(result.errors.length).toBe(1);
  });

  it('continues after individual task failures', async () => {
    const result = await runSyncPipeline('test-continue', [
      { name: 'fail-task', fn: async () => makeError() },
      {
        name: 'success-task',
        fn: async () => ({ ok: true as const, data: { items: makeItems() }, meta: { source: 'test', fetchedAt: Date.now(), cached: false } }),
      },
    ]);
    expect(result.success).toBe(false);
    expect(result.failed).toBe(1);
    expect(result.inserted).toBe(1);
  });

  it('counts skills correctly', async () => {
    const result = await runSyncPipeline('test-skills', [
      {
        name: 'load-skills',
        fn: async () => ({ ok: true as const, data: { skills: makeSkills() }, meta: { source: 'test', fetchedAt: Date.now(), cached: false } }),
      },
    ]);
    expect(result.inserted).toBe(2);
  });

  it('handles economy snapshots', async () => {
    const result = await runSyncPipeline('test-economy', [
      {
        name: 'economy',
        fn: async () => ({ ok: true as const, data: { data: makeSnapshots() }, meta: { source: 'test', fetchedAt: Date.now(), cached: false } }),
      },
    ]);
    expect(result.inserted).toBe(1);
  });
});
