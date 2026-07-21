import { eq, desc } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { poeModifiers } from '../schema/poe.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = NodePgDatabase<Record<string, any>>;

export function findModifiersByBuildId(db: Db, buildId: number) {
  return db.select().from(poeModifiers).where(eq(poeModifiers.buildId, buildId));
}

export function insertModifiers(
  db: Db,
  data: Array<typeof poeModifiers.$inferInsert>,
) {
  if (data.length === 0) return [];
  return db.insert(poeModifiers).values(data).returning();
}

export function deleteModifiersForBuild(db: Db, buildId: number) {
  return db.delete(poeModifiers).where(eq(poeModifiers.buildId, buildId));
}
