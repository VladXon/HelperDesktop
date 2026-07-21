import type { AdapterResult } from '@helper/shared';

export interface PassiveTreeInfo {
  version: string;
  nodeCount: number;
  fetchedAt: number;
}

export function createPassiveLoader() {
  return {
    async loadPassiveTree(): Promise<AdapterResult<PassiveTreeInfo>> {
      return {
        ok: true,
        data: { version: '3_25', nodeCount: 0, fetchedAt: Date.now() },
        meta: { source: 'stub', fetchedAt: Date.now(), cached: false },
      };
    },
  };
}
