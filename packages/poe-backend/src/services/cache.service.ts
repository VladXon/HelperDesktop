import { createHash } from 'node:crypto';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as analysisRepo from '../repositories/analysis.repo.js';
import type { AnalysisResult } from '@helper/shared';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = NodePgDatabase<Record<string, any>>;

export interface CacheServiceDeps {
  db: Db;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  analysesTable: any;
}

export function createCacheService(deps: CacheServiceDeps) {
  const { db, analysesTable } = deps;

  return {
    async getCachedAnalysis(pobUrl: string): Promise<AnalysisResult | null> {
      const urlHash = createHash('sha256').update(pobUrl).digest('hex').slice(0, 16);
      const rows = await analysisRepo.findLatestByHash(db, analysesTable, urlHash) as unknown as Array<{ resultJson: string; createdAt: string }>;

      if (rows.length === 0) return null;

      const row = rows[0]!;
      const cacheAge = Date.now() - new Date(row.createdAt).getTime();
      if (cacheAge > 24 * 60 * 60 * 1000) return null; // stale after 24h

      try {
        return JSON.parse(row.resultJson) as AnalysisResult;
      } catch {
        return null;
      }
    },
  };
}

export type CacheService = ReturnType<typeof createCacheService>;
