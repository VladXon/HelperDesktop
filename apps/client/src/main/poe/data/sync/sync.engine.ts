import type { AdapterResult } from '@helper/shared';
import type { PoeItemRecord, PoeSkillRecord, PoeLeagueRecord, EconomySnapshot } from '@helper/shared';
import { createSyncResult, type SyncResult } from './sync-status.js';

export type SyncTask<T> = () => Promise<AdapterResult<Record<string, unknown>>>;

export interface SyncEngineOptions {
  onProgress?: (phase: string, detail: string) => void;
  onComplete?: (result: SyncResult) => void;
  onError?: (error: string) => void;
}

const EMPTY_ITEMS: PoeItemRecord[] = [];
const EMPTY_SKILLS: PoeSkillRecord[] = [];
const EMPTY_LEAGUES: PoeLeagueRecord[] = [];
const EMPTY_SNAPSHOTS: EconomySnapshot[] = [];

export async function runSyncPipeline(
  source: string,
  tasks: Array<{ name: string; fn: SyncTask<unknown> }>,
  options?: SyncEngineOptions,
): Promise<SyncResult> {
  const result = createSyncResult(source);
  const startedAt = Date.now();

  for (const task of tasks) {
    try {
      options?.onProgress?.(task.name, 'fetching');
      const res = await task.fn();

      if (!res.ok) {
        result.failed++;
        result.errors.push(`${task.name}: ${res.error}`);
        options?.onError?.(`${task.name}: ${res.error}`);
        continue;
      }

      const data = res.data;
      let count = 0;
      if (Array.isArray(data.items)) count = (data.items as unknown[]).length;
      else if (Array.isArray(data.data)) count = (data.data as unknown[]).length;
      else if (typeof data.count === 'number') count = data.count;
      else if (Array.isArray(data.leagues)) count = (data.leagues as unknown[]).length;
      else if (Array.isArray(data.skills)) count = (data.skills as unknown[]).length;

      result.inserted += count;
      options?.onProgress?.(task.name, `synced ${count} records`);
    } catch (err) {
      result.failed++;
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`${task.name}: ${msg}`);
      options?.onError?.(`${task.name}: ${msg}`);
    }
  }

  result.durationMs = Date.now() - startedAt;
  result.success = result.failed === 0;
  options?.onComplete?.(result);
  return result;
}

export function createItemTask(loader: () => Promise<AdapterResult<{ items: PoeItemRecord[] }>>): SyncTask<PoeItemRecord> {
  return async () => {
    const res = await loader();
    if (!res.ok) return res;
    return { ok: true, data: { items: res.data.items }, meta: res.meta };
  };
}

export function createSkillTask(loader: () => Promise<AdapterResult<{ skills: PoeSkillRecord[] }>>): SyncTask<PoeSkillRecord> {
  return async () => {
    const res = await loader();
    if (!res.ok) return res;
    return { ok: true, data: { items: res.data.skills }, meta: res.meta };
  };
}

export function createLeagueTask(loader: () => Promise<AdapterResult<{ leagues: PoeLeagueRecord[] }>>): SyncTask<PoeLeagueRecord> {
  return async () => {
    const res = await loader();
    if (!res.ok) return res;
    return { ok: true, data: { items: res.data.leagues }, meta: res.meta };
  };
}

export function createEconomyTask(
  loader: () => Promise<AdapterResult<EconomySnapshot[]>>,
): SyncTask<EconomySnapshot> {
  return async () => {
    const res = await loader();
    if (!res.ok) return res;
    return { ok: true, data: { data: res.data }, meta: res.meta };
  };
}
