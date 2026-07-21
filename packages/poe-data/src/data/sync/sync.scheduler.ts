import { runSyncPipeline, type SyncEngineOptions } from './sync.engine.js';
import type { NinjaSource } from '../sources/ninja.source.js';
import type { WikiSource } from '../sources/poe-wiki.source.js';
import { normalizeEconomyEntries } from '../normalizers/economy.normalizer.js';
import { createItemLoader } from '../loaders/item.loader.js';
import { createSkillLoader } from '../loaders/skill.loader.js';
import type { SyncResult } from './sync-status.js';

export interface SyncSchedulerOptions {
  league: string;
  ninjaSource: NinjaSource;
  wikiSource: WikiSource;
  onSyncComplete?: (result: SyncResult) => void;
  onSyncError?: (error: string) => void;
}

export class SyncScheduler {
  private timers: ReturnType<typeof setInterval>[] = [];
  private options: SyncSchedulerOptions;

  constructor(options: SyncSchedulerOptions) {
    this.options = options;
  }

  start(): void {
    this.stop();

    const { league, ninjaSource, wikiSource } = this.options;
    const itemLoader = createItemLoader(wikiSource);
    const skillLoader = createSkillLoader(wikiSource);

    const engineOpts: SyncEngineOptions = {
      onComplete: this.options.onSyncComplete,
      onError: this.options.onSyncError,
    };

    const runEconomySync = () => {
      runSyncPipeline('ninja-economy', [
        {
          name: 'currency',
          fn: async () => {
            const res = await ninjaSource.fetchCurrencyOverview(league);
            if (!res.ok) return res;
            const snapshots = normalizeEconomyEntries(res.data, league, Date.now());
            return { ok: true as const, data: { data: snapshots }, meta: { source: 'ninja', fetchedAt: Date.now(), cached: false } };
          },
        },
      ], engineOpts).catch(() => {});
    };

    const runWeeklySync = () => {
      runSyncPipeline('weekly-items', [
        {
          name: 'uniques',
          fn: async () => {
            const res = await itemLoader.loadUniques();
            if (!res.ok) return res;
            return { ok: true as const, data: { items: res.data.items }, meta: res.meta };
          },
        },
        {
          name: 'skills',
          fn: async () => {
            const res = await skillLoader.loadSkills();
            if (!res.ok) return res;
            return { ok: true as const, data: { skills: res.data.skills }, meta: res.meta };
          },
        },
      ], engineOpts).catch(() => {});
    };

    this.timers.push(setInterval(runEconomySync, 30 * 60 * 1000));
    this.timers.push(setInterval(runWeeklySync, 7 * 24 * 60 * 60 * 1000));

    runEconomySync();
  }

  stop(): void {
    for (const timer of this.timers) {
      clearInterval(timer);
    }
    this.timers = [];
  }

  isActive(): boolean {
    return this.timers.length > 0;
  }
}
