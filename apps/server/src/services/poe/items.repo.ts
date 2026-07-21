import { eq, and } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema } from '../../db/index.js';

export function findItemByName(db: NodePgDatabase<typeof schema>, game: string, name: string) {
  return db.select().from(schema.poeItems).where(and(eq(schema.poeItems.game, game), eq(schema.poeItems.name, name)));
}

export function upsertItem(db: NodePgDatabase<typeof schema>, data: typeof schema.poeItems.$inferInsert) {
  return db.insert(schema.poeItems).values(data)
    .onConflictDoUpdate({ target: [schema.poeItems.game, schema.poeItems.name], set: { ...data } })
    .returning();
}

export function findSkillByNameType(db: NodePgDatabase<typeof schema>, game: string, name: string, type: string) {
  return db.select().from(schema.poeSkills).where(and(eq(schema.poeSkills.game, game), eq(schema.poeSkills.name, name), eq(schema.poeSkills.type, type)));
}

export function upsertSkill(db: NodePgDatabase<typeof schema>, data: typeof schema.poeSkills.$inferInsert) {
  return db.insert(schema.poeSkills).values(data)
    .onConflictDoUpdate({ target: [schema.poeSkills.game, schema.poeSkills.name, schema.poeSkills.type], set: { ...data } })
    .returning();
}

export function listLeagues(db: NodePgDatabase<typeof schema>, game: string) {
  return db.select().from(schema.poeLeagueInfo).where(eq(schema.poeLeagueInfo.game, game));
}

export function getCurrentLeague(db: NodePgDatabase<typeof schema>, game: string) {
  return db.select().from(schema.poeLeagueInfo).where(and(eq(schema.poeLeagueInfo.game, game), eq(schema.poeLeagueInfo.isCurrent, true)));
}

export function upsertLeague(db: NodePgDatabase<typeof schema>, data: typeof schema.poeLeagueInfo.$inferInsert) {
  return db.insert(schema.poeLeagueInfo).values(data)
    .onConflictDoUpdate({ target: [schema.poeLeagueInfo.leagueId], set: { ...data } })
    .returning();
}
