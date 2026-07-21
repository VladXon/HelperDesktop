import { eq, desc } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = NodePgDatabase<Record<string, any>>;

export function findByHash(
  db: Db,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildsTable: any,
  buildHash: string,
) {
  return db.select().from(buildsTable).where(eq(buildsTable.buildHash, buildHash)).limit(1);
}

export function listByUser(
  db: Db,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildsTable: any,
  userId: number,
  limit = 50,
) {
  return db.select().from(buildsTable)
    .where(eq(buildsTable.userId, userId))
    .orderBy(desc(buildsTable.createdAt))
    .limit(limit);
}

export function insertBuild(
  db: Db,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildsTable: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>,
) {
  return db.insert(buildsTable).values(data).returning();
}

export function removeBuild(
  db: Db,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildsTable: any,
  buildHash: string,
) {
  return db.delete(buildsTable).where(eq(buildsTable.buildHash, buildHash));
}
