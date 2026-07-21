import { describe, it, expect, vi, afterEach } from 'vitest';
import { createSyncResult } from '../data/sync/sync-status.js';
import { runSyncPipeline } from '../data/sync/sync.engine.js';
import { SyncScheduler } from '../data/sync/sync.scheduler.js';
import { MockHttpClient } from '../http/http-client.js';
import { createNinjaSource } from '../data/sources/ninja.source.js';
import { createWikiSource } from '../data/sources/poe-wiki.source.js';
import type { AdapterResult } from '@helper/shared';

describe('createSyncResult', () => {
  it('creates a default sync result', () => {
    const result = createSyncResult('test-source');

    expect(result.success).toBe(true);
    expect(result.inserted).toBe(0);
    expect(result.updated).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.errors).toEqual([]);
    expect(result.source).toBe('test-source');
    expect(result.syncedAt).toBeGreaterThan(0);
  });
});

describe('runSyncPipeline', () => {
  it('runs tasks and collects results', async () => {
    const tasks = [
      {
        name: 'task1',
        fn: async () => {
          return {
            ok: true as const,
            data: { items: [1, 2, 3] },
            meta: { source: 'test', fetchedAt: Date.now(), cached: false },
          };
        },
      },
      {
        name: 'task2',
        fn: async () => {
          return {
            ok: true as const,
            data: { skills: [4, 5] },
            meta: { source: 'test', fetchedAt: Date.now(), cached: false },
          };
        },
      },
    ];

    const result = await runSyncPipeline('test-pipeline', tasks);

    expect(result.source).toBe('test-pipeline');
    expect(result.inserted).toBe(5);
    expect(result.failed).toBe(0);
    expect(result.success).toBe(true);
  });

  it('counts "data" array results', async () => {
    const tasks = [
      {
        name: 'data-task',
        fn: async () => {
          return {
            ok: true as const,
            data: { data: ['a', 'b', 'c', 'd'] },
            meta: { source: 'test', fetchedAt: Date.now(), cached: false },
          };
        },
      },
    ];

    const result = await runSyncPipeline('test', tasks);
    expect(result.inserted).toBe(4);
  });

  it('counts leagues array results', async () => {
    const tasks = [
      {
        name: 'league-task',
        fn: async () => {
          return {
            ok: true as const,
            data: { leagues: [{ leagueId: 'std' }, { leagueId: 'hc' }] },
            meta: { source: 'test', fetchedAt: Date.now(), cached: false },
          };
        },
      },
    ];

    const result = await runSyncPipeline('test', tasks);
    expect(result.inserted).toBe(2);
  });

  it('handles task failures', async () => {
    const tasks = [
      {
        name: 'failing-task',
        fn: async () => {
          return { ok: false as const, error: 'Something went wrong' };
        },
      },
      {
        name: 'success-task',
        fn: async () => {
          return {
            ok: true as const,
            data: { items: [1] },
            meta: { source: 'test', fetchedAt: Date.now(), cached: false },
          };
        },
      },
    ];

    const result = await runSyncPipeline('test', tasks);

    expect(result.failed).toBe(1);
    expect(result.inserted).toBe(1);
    expect(result.success).toBe(false);
    expect(result.errors).toContain('failing-task: Something went wrong');
  });

  it('handles thrown exceptions', async () => {
    const tasks = [
      {
        name: 'thrower',
        fn: async () => {
          throw new Error('Crash!');
        },
      },
    ];

    const result = await runSyncPipeline('test', tasks);

    expect(result.failed).toBe(1);
    expect(result.success).toBe(false);
    expect(result.errors).toContain('thrower: Crash!');
  });

  it('has nonzero duration', async () => {
    const tasks = [
      {
        name: 'task',
        fn: async () => {
          return {
            ok: true as const,
            data: { items: [] },
            meta: { source: 'test', fetchedAt: Date.now(), cached: false },
          };
        },
      },
    ];

    const result = await runSyncPipeline('test', tasks);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('calls progress and completion callbacks', async () => {
    const progressCalls: string[] = [];
    let completed = false;

    const tasks = [
      {
        name: 'cb-task',
        fn: async () => {
          return {
            ok: true as const,
            data: { items: [1] },
            meta: { source: 'test', fetchedAt: Date.now(), cached: false },
          };
        },
      },
    ];

    await runSyncPipeline('test', tasks, {
      onProgress: (phase, detail) => {
        progressCalls.push(`${phase}:${detail}`);
      },
      onComplete: () => {
        completed = true;
      },
    });

    expect(progressCalls).toContain('cb-task:fetching');
    expect(completed).toBe(true);
  });

  it('calls error callback on failure', async () => {
    let errorMsg = '';

    const tasks = [
      {
        name: 'bad',
        fn: async () => {
          return { ok: false as const, error: 'Fail' };
        },
      },
    ];

    await runSyncPipeline('test', tasks, {
      onError: (msg) => { errorMsg = msg; },
    });

    expect(errorMsg).toBe('bad: Fail');
  });

  it('counts "fetched" field when present', async () => {
    const tasks = [
      {
        name: 'fetched-task',
        fn: async () => {
          return {
            ok: true as const,
            data: { fetched: 42 },
            meta: { source: 'test', fetchedAt: Date.now(), cached: false },
          };
        },
      },
    ];

    const result = await runSyncPipeline('test', tasks);
    expect(result.inserted).toBe(42);
  });
});

describe('SyncScheduler', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates a scheduler with correct initial state', () => {
    const client = new MockHttpClient();
    const ninja = createNinjaSource(client);
    const wiki = createWikiSource(client);

    const scheduler = new SyncScheduler({ league: 'Standard', ninjaSource: ninja, wikiSource: wiki });
    expect(scheduler.isActive()).toBe(false);
  });

  it('starts and stops correctly', () => {
    vi.useFakeTimers();

    const client = new MockHttpClient();
    const url = 'https://poe.ninja/api/data/currencyoverview?league=Standard&type=Currency';
    client.onGet(url, { lines: [] });

    const ninja = createNinjaSource(client);
    const wiki = createWikiSource(client);

    const scheduler = new SyncScheduler({ league: 'Standard', ninjaSource: ninja, wikiSource: wiki });
    scheduler.start();

    expect(scheduler.isActive()).toBe(true);

    scheduler.stop();
    expect(scheduler.isActive()).toBe(false);
  });
});
