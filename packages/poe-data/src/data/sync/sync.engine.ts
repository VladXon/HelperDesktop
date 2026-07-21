import type { AdapterResult } from '@helper/shared';
import { createSyncResult, type SyncResult } from './sync-status.js';

export type SyncTask = () => Promise<AdapterResult<Record<string, unknown>>>;

export interface SyncEngineOptions {
  onProgress?: (phase: string, detail: string) => void;
  onComplete?: (result: SyncResult) => void;
  onError?: (error: string) => void;
}

export async function runSyncPipeline(
  source: string,
  tasks: Array<{ name: string; fn: SyncTask }>,
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
      let fetchedCount = 0;
      if (Array.isArray(data.items)) fetchedCount = (data.items as unknown[]).length;
      else if (Array.isArray(data.data)) fetchedCount = (data.data as unknown[]).length;
      else if (Array.isArray(data.skills)) fetchedCount = (data.skills as unknown[]).length;
      else if (Array.isArray(data.leagues)) fetchedCount = (data.leagues as unknown[]).length;
      else if (typeof data.fetched === 'number') fetchedCount = data.fetched;

      result.inserted += fetchedCount;
      options?.onProgress?.(task.name, `processed ${fetchedCount} records`);
    } catch (err) {
      result.failed++;
      result.errors.push(`${task.name}: ${err instanceof Error ? err.message : String(err)}`);
      options?.onError?.(`${task.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  result.durationMs = Date.now() - startedAt;
  result.success = result.failed === 0;
  options?.onComplete?.(result);
  return result;
}
