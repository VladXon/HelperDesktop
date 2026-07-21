import { eq, and, desc, gte, lt } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema } from '../../db/index.js';

export function findCurrencySnapshots(db: NodePgDatabase<typeof schema>, league: string, currencyType: string, since: number) {
  return db.select().from(schema.poeCurrencySnapshots)
    .where(and(
      eq(schema.poeCurrencySnapshots.league, league),
      eq(schema.poeCurrencySnapshots.currencyType, currencyType),
      gte(schema.poeCurrencySnapshots.snapshotTime, since),
    ))
    .orderBy(desc(schema.poeCurrencySnapshots.snapshotTime));
}

export function findLatestCurrencySnapshot(db: NodePgDatabase<typeof schema>, league: string, currencyType: string) {
  return db.select().from(schema.poeCurrencySnapshots)
    .where(and(eq(schema.poeCurrencySnapshots.league, league), eq(schema.poeCurrencySnapshots.currencyType, currencyType)))
    .orderBy(desc(schema.poeCurrencySnapshots.snapshotTime))
    .limit(1);
}

export function insertCurrencySnapshot(db: NodePgDatabase<typeof schema>, data: typeof schema.poeCurrencySnapshots.$inferInsert) {
  return db.insert(schema.poeCurrencySnapshots).values(data).returning();
}

export function purgeOldCurrencySnapshots(db: NodePgDatabase<typeof schema>, before: number) {
  return db.delete(schema.poeCurrencySnapshots).where(lt(schema.poeCurrencySnapshots.snapshotTime, before));
}

export function findEconomicEvents(db: NodePgDatabase<typeof schema>, league: string, limit = 20) {
  return db.select().from(schema.poeEconomicEvents)
    .where(eq(schema.poeEconomicEvents.league, league))
    .orderBy(desc(schema.poeEconomicEvents.occurredAt))
    .limit(limit);
}

export function insertEconomicEvent(db: NodePgDatabase<typeof schema>, data: typeof schema.poeEconomicEvents.$inferInsert) {
  return db.insert(schema.poeEconomicEvents).values(data).returning();
}
