import { eq, and, desc, gte } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema } from '../../db/index.js';

export function findMarketSnapshots(db: NodePgDatabase<typeof schema>, league: string, itemName: string, since: number) {
  return db.select().from(schema.poeMarketSnapshots)
    .where(and(eq(schema.poeMarketSnapshots.league, league), eq(schema.poeMarketSnapshots.itemName, itemName), gte(schema.poeMarketSnapshots.snapshotTime, since)))
    .orderBy(desc(schema.poeMarketSnapshots.snapshotTime));
}

export function insertMarketSnapshot(db: NodePgDatabase<typeof schema>, data: typeof schema.poeMarketSnapshots.$inferInsert) {
  return db.insert(schema.poeMarketSnapshots).values(data).returning();
}

export function insertItemValuation(db: NodePgDatabase<typeof schema>, data: typeof schema.poeItemValuations.$inferInsert) {
  return db.insert(schema.poeItemValuations).values(data).returning();
}

export function findLatestItemValuation(db: NodePgDatabase<typeof schema>, league: string, itemHash: string) {
  return db.select().from(schema.poeItemValuations)
    .where(and(eq(schema.poeItemValuations.league, league), eq(schema.poeItemValuations.itemHash, itemHash)))
    .orderBy(desc(schema.poeItemValuations.valuedAt))
    .limit(1);
}
