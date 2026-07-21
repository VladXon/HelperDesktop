import { describe, it, expect } from 'vitest';
import { runSyncPipeline, createItemTask, createSkillTask, createEconomyTask } from '../sync/sync.engine.js';
import { createSyncResult, type SyncResult } from '../sync/sync-status.js';
import type { AdapterResult, PoeItemRecord, PoeSkillRecord, EconomySnapshot } from '@helper/shared';

function makeItemResult(items: PoeItemRecord[]): AdapterResult<{ items: PoeItemRecord[] }> {
  return {
    ok: true,
    data: { items },
    meta: { source: 'test', fetchedAt: Date.now(), cached: false },
  };
}

function makeSkillResult(skills: PoeSkillRecord[]): AdapterResult<{ skills: PoeSkillRecord[] }> {
  return {
    ok: true,
    data: { skills },
    meta: { source: 'test', fetchedAt: Date.now(), cached: false },
  };
}

function makeEconomyResult(snapshots: EconomySnapshot[]): AdapterResult<EconomySnapshot[]> {
  return {
    ok: true,
    data: snapshots,
    meta: { source: 'test', fetchedAt: Date.now(), cached: false },
  };
}

function makeErrorResult(): AdapterResult<unknown> {
  return { ok: false, error: 'connection refused' };
}

describe('sync engine', () => {
  it('creates a fresh SyncResult', () => {
    const result = createSyncResult('test-source');
    expect(result.success).toBe(true);
    expect(result.inserted).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.errors).toEqual([]);
    expect(result.source).toBe('test-source');
    expect(result.syncedAt).toBeGreaterThan(0);
  });

  it('runs pipeline with successful tasks', async () => {
    const items: PoeItemRecord[] = [
      { game: 'poe1', name: 'Test', baseType: 'Base', itemType: '', category: '', level: 0, requiredLevel: 0, explicitStats: {}, dropSources: [], flavourText: '', icon: '', source: '', sourceUrl: '', version: '', updatedAt: 0 },
    ];
    const result = await runSyncPipeline('test-sync', [
      { name: 'load-items', fn: createItemTask(async () => makeItemResult(items)) },
    ]);
    expect(result.success).toBe(true);
    expect(result.inserted).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('tracks failed tasks', async () => {
    const result = await runSyncPipeline('test-fail', [
      { name: 'fail-task', fn: async () => makeErrorResult() },
    ]);
    expect(result.success).toBe(false);
    expect(result.failed).toBe(1);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain('connection refused');
  });

  it('continues after individual task failures', async () => {
    const items: PoeItemRecord[] = [
      { game: 'poe1', name: 'Test', baseType: 'Base', itemType: '', category: '', level: 0, requiredLevel: 0, explicitStats: {}, dropSources: [], flavourText: '', icon: '', source: '', sourceUrl: '', version: '', updatedAt: 0 },
    ];
    const result = await runSyncPipeline('test-continue', [
      { name: 'fail-task', fn: async () => makeErrorResult() },
      { name: 'success-task', fn: createItemTask(async () => makeItemResult(items)) },
    ]);
    expect(result.success).toBe(false);
    expect(result.failed).toBe(1);
    expect(result.inserted).toBe(1);
  });

  it('counts skills correctly', async () => {
    const skills: PoeSkillRecord[] = [
      { game: 'poe1', name: 'Fireball', type: 'active', gemLevel: 20, manaMultiplier: 100, qualityStats: [], tags: [], source: '', sourceUrl: '', version: '', updatedAt: 0 },
      { game: 'poe1', name: 'Ice Nova', type: 'active', gemLevel: 20, manaMultiplier: 100, qualityStats: [], tags: [], source: '', sourceUrl: '', version: '', updatedAt: 0 },
    ];
    const result = await runSyncPipeline('test-skills', [
      { name: 'load-skills', fn: createSkillTask(async () => makeSkillResult(skills)) },
    ]);
    expect(result.inserted).toBe(2);
  });

  it('handles economy snapshots', async () => {
    const snapshots: EconomySnapshot[] = [
      { league: 'Standard', currency: 'Chaos Orb', chaosEquivalent: 1, divineEquivalent: 0.0043, change24h: 0, listingCount: 1000, snapshotTime: Date.now(), history: [] },
    ];
    const result = await runSyncPipeline('test-economy', [
      { name: 'economy', fn: createEconomyTask(async () => makeEconomyResult(snapshots)) },
    ]);
    expect(result.inserted).toBe(1);
  });
});
