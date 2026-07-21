import { eq, asc } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema } from '../../db/index.js';

export function getActiveProvider(db: NodePgDatabase<typeof schema>) {
  return db.select().from(schema.poeAiProviderSettings).where(eq(schema.poeAiProviderSettings.enabled, true));
}

export function upsertProvider(db: NodePgDatabase<typeof schema>, data: typeof schema.poeAiProviderSettings.$inferInsert) {
  return db.insert(schema.poeAiProviderSettings).values(data)
    .onConflictDoUpdate({ target: schema.poeAiProviderSettings.provider, set: { model: data.model, endpoint: data.endpoint, enabled: data.enabled, updatedAt: data.updatedAt } })
    .returning();
}

export function disableAllProviders(db: NodePgDatabase<typeof schema>) {
  return db.update(schema.poeAiProviderSettings).set({ enabled: false, updatedAt: '' + new Date().toISOString() });
}

export function insertAiRequest(db: NodePgDatabase<typeof schema>, data: typeof schema.poeAiRequests.$inferInsert) {
  return db.insert(schema.poeAiRequests).values(data).returning();
}

export function listAiRequests(db: NodePgDatabase<typeof schema>, buildAnalysisId: number, limit = 10) {
  return db.select().from(schema.poeAiRequests)
    .where(eq(schema.poeAiRequests.buildAnalysisId, buildAnalysisId))
    .orderBy(asc(schema.poeAiRequests.createdAt)).limit(limit);
}
