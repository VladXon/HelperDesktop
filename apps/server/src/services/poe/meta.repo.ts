import { eq, and } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema } from '../../db/index.js';

export function listMetaBuilds(db: NodePgDatabase<typeof schema>, game: string, league: string) {
  return db.select().from(schema.poeMetaBuilds).where(and(eq(schema.poeMetaBuilds.game, game), eq(schema.poeMetaBuilds.league, league)));
}

export function insertMetaBuild(db: NodePgDatabase<typeof schema>, data: typeof schema.poeMetaBuilds.$inferInsert) {
  return db.insert(schema.poeMetaBuilds).values(data).returning();
}

export function replaceMetaBuildsForLeague(db: NodePgDatabase<typeof schema>, game: string, league: string) {
  return db.delete(schema.poeMetaBuilds).where(and(eq(schema.poeMetaBuilds.game, game), eq(schema.poeMetaBuilds.league, league)));
}

export function listCraftingMethods(db: NodePgDatabase<typeof schema>, game: string) {
  return db.select().from(schema.poeCraftingMethods).where(eq(schema.poeCraftingMethods.game, game));
}

export function insertCraftingMethod(db: NodePgDatabase<typeof schema>, data: typeof schema.poeCraftingMethods.$inferInsert) {
  return db.insert(schema.poeCraftingMethods).values(data).returning();
}
