import { eq, lt } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema } from '../../db/index.js';

export function findTradeCacheByHash(db: NodePgDatabase<typeof schema>, queryHash: string) {
  return db.select().from(schema.poeTradeSearchCache).where(eq(schema.poeTradeSearchCache.queryHash, queryHash));
}

export function insertTradeCache(db: NodePgDatabase<typeof schema>, data: typeof schema.poeTradeSearchCache.$inferInsert) {
  return db.insert(schema.poeTradeSearchCache).values(data).returning();
}

export function purgeExpiredTradeCache(db: NodePgDatabase<typeof schema>) {
  return db.delete(schema.poeTradeSearchCache).where(lt(schema.poeTradeSearchCache.expiresAt, Math.floor(Date.now() / 1000)));
}
