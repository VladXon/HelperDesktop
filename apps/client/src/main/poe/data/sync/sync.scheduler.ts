import { runSyncPipeline, createItemTask, createSkillTask, createEconomyTask } from './sync.engine.js';
import { loadUniques } from '../loaders/item.loader.js';
import { loadSkills } from '../loaders/skill.loader.js';
import { ninjaSource } from '../sources/ninja.source.js';
import type { SyncResult } from './sync-status.js';

interface SchedulerOptions {
  league: string;
  onSyncComplete?: (result: SyncResult) => void;
  onSyncError?: (error: string) => void;
}

let activeTimers: ReturnType<typeof setInterval>[] = [];

export function startSyncScheduler(options: SchedulerOptions): () => void {
  stopSyncScheduler();

  const economyInterval = 30 * 60 * 1000;
  const dailyInterval = 24 * 60 * 60 * 1000;
  const weeklyInterval = 7 * 24 * 60 * 60 * 1000;

  const { league } = options;

  const runEconomySync = () => {
    runSyncPipeline('ninja-economy', [
      { name: 'currency', fn: createEconomyTask(() => ninjaSource.fetchCurrencyOverview(league)) },
    ], {
      onComplete: options.onSyncComplete,
      onError: options.onSyncError,
    }).catch(() => {});
  };

  const runDailySync = () => {
    runSyncPipeline('daily-sync', [
      { name: 'leagues', fn: async () => ({ ok: true as const, data: { leagues: [] as unknown[] }, meta: { source: 'scheduler', fetchedAt: Date.now(), cached: false } }) },
    ], {
      onComplete: options.onSyncComplete,
      onError: options.onSyncError,
    }).catch(() => {});
  };

  const runWeeklySync = () => {
    runSyncPipeline('weekly-items', [
      { name: 'uniques', fn: createItemTask(loadUniques) },
      { name: 'skills', fn: createSkillTask(loadSkills) },
    ], {
      onComplete: options.onSyncComplete,
      onError: options.onSyncError,
    }).catch(() => {});
  };

  activeTimers.push(setInterval(runEconomySync, economyInterval));
  activeTimers.push(setInterval(runDailySync, dailyInterval));
  activeTimers.push(setInterval(runWeeklySync, weeklyInterval));

  runEconomySync();
  runDailySync();

  return stopSyncScheduler;
}

export function stopSyncScheduler(): void {
  for (const timer of activeTimers) {
    clearInterval(timer);
  }
  activeTimers = [];
}

export function isSyncActive(): boolean {
  return activeTimers.length > 0;
}
