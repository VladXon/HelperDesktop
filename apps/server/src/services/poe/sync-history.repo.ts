import { eq, desc } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema } from '../../db/index.js';

export function findSyncHistoryById(
  db: NodePgDatabase<typeof schema>,
  id: number,
) {
  return db.select().from(schema.poeSyncHistory).where(eq(schema.poeSyncHistory.id, id)).limit(1);
}

export function listSyncHistory(
  db: NodePgDatabase<typeof schema>,
  limit?: number,
) {
  return db
    .select()
    .from(schema.poeSyncHistory)
    .orderBy(desc(schema.poeSyncHistory.startedAt))
    .limit(limit ?? 20);
}

export function listSyncHistoryBySource(
  db: NodePgDatabase<typeof schema>,
  source: string,
  limit?: number,
) {
  return db
    .select()
    .from(schema.poeSyncHistory)
    .where(eq(schema.poeSyncHistory.source, source))
    .orderBy(desc(schema.poeSyncHistory.startedAt))
    .limit(limit ?? 10);
}

export function insertSyncHistory(
  db: NodePgDatabase<typeof schema>,
  data: typeof schema.poeSyncHistory.$inferInsert,
) {
  return db.insert(schema.poeSyncHistory).values(data).returning();
}

export function updateSyncHistory(
  db: NodePgDatabase<typeof schema>,
  id: number,
  data: Partial<typeof schema.poeSyncHistory.$inferInsert>,
) {
  return db.update(schema.poeSyncHistory).set(data).where(eq(schema.poeSyncHistory.id, id));
}
