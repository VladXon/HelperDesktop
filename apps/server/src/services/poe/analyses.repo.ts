import { eq, desc } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema } from '../../db/index.js';

export function findAnalysesByHash(db: NodePgDatabase<typeof schema>, buildHash: string) {
  return db.select().from(schema.poeBuildAnalyses).where(eq(schema.poeBuildAnalyses.buildHash, buildHash)).orderBy(desc(schema.poeBuildAnalyses.createdAt));
}

export function findLatestAnalysis(db: NodePgDatabase<typeof schema>, buildHash: string) {
  return db.select().from(schema.poeBuildAnalyses).where(eq(schema.poeBuildAnalyses.buildHash, buildHash)).orderBy(desc(schema.poeBuildAnalyses.createdAt)).limit(1);
}

export function insertAnalysis(db: NodePgDatabase<typeof schema>, data: typeof schema.poeBuildAnalyses.$inferInsert) {
  return db.insert(schema.poeBuildAnalyses).values(data).returning();
}

export function findAnalysisById(db: NodePgDatabase<typeof schema>, id: number) {
  return db.select().from(schema.poeBuildAnalyses).where(eq(schema.poeBuildAnalyses.id, id));
}

export function deleteAnalysesForBuild(db: NodePgDatabase<typeof schema>, buildHash: string) {
  return db.delete(schema.poeBuildAnalyses).where(eq(schema.poeBuildAnalyses.buildHash, buildHash));
}

export function listRecentAnalyses(db: NodePgDatabase<typeof schema>, limit = 20) {
  return db.select().from(schema.poeBuildAnalyses).orderBy(desc(schema.poeBuildAnalyses.createdAt)).limit(limit);
}
