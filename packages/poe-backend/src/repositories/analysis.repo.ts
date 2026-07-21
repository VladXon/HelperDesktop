import { eq, desc } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = NodePgDatabase<Record<string, any>>;

export function findByBuildHash(
  db: Db,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  analysesTable: any,
  buildHash: string,
) {
  return db.select().from(analysesTable)
    .where(eq(analysesTable.buildHash, buildHash))
    .orderBy(desc(analysesTable.createdAt));
}

export function findLatestByHash(
  db: Db,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  analysesTable: any,
  buildHash: string,
) {
  return db.select().from(analysesTable)
    .where(eq(analysesTable.buildHash, buildHash))
    .orderBy(desc(analysesTable.createdAt))
    .limit(1);
}

export function insertAnalysis(
  db: Db,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  analysesTable: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>,
) {
  return db.insert(analysesTable).values(data).returning();
}

export function removeForBuild(
  db: Db,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  analysesTable: any,
  buildHash: string,
) {
  return db.delete(analysesTable).where(eq(analysesTable.buildHash, buildHash));
}
