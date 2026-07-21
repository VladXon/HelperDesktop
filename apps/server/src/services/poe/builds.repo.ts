import { eq, desc } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema } from '../../db/index.js';

export function findBuildByHash(db: NodePgDatabase<typeof schema>, buildHash: string) {
  return db.select().from(schema.poeBuilds).where(eq(schema.poeBuilds.buildHash, buildHash));
}

export function insertBuild(db: NodePgDatabase<typeof schema>, data: typeof schema.poeBuilds.$inferInsert) {
  return db.insert(schema.poeBuilds).values(data).returning();
}

export function listBuilds(db: NodePgDatabase<typeof schema>, limit = 50) {
  return db.select().from(schema.poeBuilds).orderBy(desc(schema.poeBuilds.createdAt)).limit(limit);
}

export function deleteBuild(db: NodePgDatabase<typeof schema>, buildHash: string) {
  return db.delete(schema.poeBuilds).where(eq(schema.poeBuilds.buildHash, buildHash));
}
