import type { AdapterResult } from '@helper/shared';

interface PassiveTreeInfo {
  version: string;
  nodeCount: number;
  fetchedAt: number;
}

export async function loadPassiveTree(): Promise<AdapterResult<PassiveTreeInfo>> {
  return {
    ok: true,
    data: { version: '3_25', nodeCount: 0, fetchedAt: Date.now() },
    meta: { source: 'stub', fetchedAt: Date.now(), cached: false },
  };
}
