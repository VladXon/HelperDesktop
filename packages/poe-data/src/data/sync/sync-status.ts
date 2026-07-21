export interface SyncResult {
  success: boolean;
  inserted: number;
  updated: number;
  failed: number;
  errors: string[];
  durationMs: number;
  source: string;
  syncedAt: number;
}

export function createSyncResult(source: string): SyncResult {
  return {
    success: true,
    inserted: 0,
    updated: 0,
    failed: 0,
    errors: [],
    durationMs: 0,
    source,
    syncedAt: Date.now(),
  };
}
