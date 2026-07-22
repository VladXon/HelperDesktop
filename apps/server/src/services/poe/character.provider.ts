import { getDb, schema } from '../../db/index.js';
import { eq, desc } from 'drizzle-orm';
import { log } from '../../utils/logger.js';
import { HttpError } from '../../middleware/error-handler.js';
import { createGggClient } from './ggg-client.js';
import type { GggCharacterDetail } from './ggg-client.js';

export interface CharacterSummary {
  id: number;
  name: string;
  league: string;
  class: string;
  ascendancy: string | null;
  level: number;
  fetchedAt: string;
}

export interface CharacterRecord {
  id: number;
  accountId: number;
  name: string;
  league: string;
  class: string;
  ascendancy: string | null;
  level: number;
  experience: number | null;
  rawJson: GggCharacterDetail;
  passiveTreeJson: unknown;
  fetchedAt: string;
}

export interface PoeCharacterProvider {
  fetchAndSaveCharacters(accountId: number, sessionId: string, accountName?: string): Promise<CharacterSummary[]>;
  getCharacter(characterId: number): Promise<CharacterRecord>;
  refreshCharacter(characterId: number, sessionId: string, accountName?: string): Promise<CharacterRecord>;
  getSnapshots(characterId: number): Promise<Array<{ id: number; level: number; createdAt: string; changeSummary: unknown }>>;
}

function computeChanges(previous: unknown, current: GggCharacterDetail): Record<string, unknown> {
  const prev = previous as GggCharacterDetail | undefined;
  if (!prev) return {};
  const changes: Record<string, unknown> = {};
  if (prev.character?.level !== current.character?.level) {
    changes.levelChange = { from: prev.character?.level, to: current.character?.level };
  }
  if (prev.character?.ascendancyClass !== current.character?.ascendancyClass) {
    changes.ascendancyChange = true;
  }
  const prevItems = prev.items?.length ?? 0;
  const currItems = current.items?.length ?? 0;
  if (prevItems !== currItems) {
    changes.itemCountChange = { from: prevItems, to: currItems };
  }
  return changes;
}

export function createCharacterProvider(): PoeCharacterProvider {
  const db = getDb();
  const ggg = createGggClient();

  return {
    async fetchAndSaveCharacters(accountId: number, sessionId: string, accountName?: string): Promise<CharacterSummary[]> {
      const gggChars = await ggg.getCharacters(sessionId, accountName);
      const result: CharacterSummary[] = [];

      for (const ch of gggChars) {
        const existing = await db.select({ id: schema.poeCharacters.id })
          .from(schema.poeCharacters)
          .where(eq(schema.poeCharacters.name, ch.name))
          .limit(1);

        if (existing.length > 0) {
          await db.update(schema.poeCharacters)
            .set({
              league: ch.league,
              class: ch.class,
              level: ch.level,
              fetchedAt: new Date().toISOString(),
            })
            .where(eq(schema.poeCharacters.id, existing[0]!.id));
          result.push({ id: existing[0]!.id, name: ch.name, league: ch.league, class: ch.class, ascendancy: null, level: ch.level, fetchedAt: new Date().toISOString() });
        } else {
          const inserted = await db.insert(schema.poeCharacters).values({
            accountId,
            name: ch.name,
            league: ch.league,
            class: ch.class,
            level: ch.level,
            rawJson: {},
          }).returning({ id: schema.poeCharacters.id });
          const id = inserted[0]!.id;
          result.push({ id, name: ch.name, league: ch.league, class: ch.class, ascendancy: null, level: ch.level, fetchedAt: new Date().toISOString() });
        }
      }

      log.info('poe_characters_synced', { accountId, count: result.length });
      return result;
    },

    async getCharacter(characterId: number): Promise<CharacterRecord> {
      const rows = await db.select().from(schema.poeCharacters)
        .where(eq(schema.poeCharacters.id, characterId))
        .limit(1);
      if (rows.length === 0) throw new HttpError(404, 'not_found', 'Character not found');
      const c = rows[0]!;
      return {
        id: c.id,
        accountId: c.accountId,
        name: c.name,
        league: c.league,
        class: c.class,
        ascendancy: c.ascendancy,
        level: c.level,
        experience: c.experience,
        rawJson: c.rawJson as GggCharacterDetail,
        passiveTreeJson: c.passiveTreeJson,
        fetchedAt: c.fetchedAt,
      };
    },

    async refreshCharacter(characterId: number, sessionId: string, accountName?: string): Promise<CharacterRecord> {
      const rows = await db.select().from(schema.poeCharacters)
        .where(eq(schema.poeCharacters.id, characterId))
        .limit(1);
      if (rows.length === 0) throw new HttpError(404, 'not_found', 'Character not found');

      const ch = rows[0]!;
      const detail = await ggg.getCharacterDetail(sessionId, ch.name, accountName);
      const changes = computeChanges(ch.rawJson, detail);

      await db.update(schema.poeCharacters)
        .set({
          class: detail.character.class,
          ascendancy: detail.character.ascendancyClass ? String(detail.character.ascendancyClass) : null,
          level: detail.character.level,
          experience: detail.character.experience,
          rawJson: detail as unknown as Record<string, unknown>,
          fetchedAt: new Date().toISOString(),
        })
        .where(eq(schema.poeCharacters.id, characterId));

      await db.insert(schema.poeCharacterSnapshots).values({
        characterId,
        level: ch.level,
        rawJson: ch.rawJson as Record<string, unknown>,
        changeSummary: changes,
        createdAt: new Date().toISOString(),
      });

      log.info('poe_character_refreshed', { characterId, name: ch.name, level: detail.character.level });
      return {
        id: ch.id,
        accountId: ch.accountId,
        name: detail.character.name,
        league: detail.character.league,
        class: detail.character.class,
        ascendancy: detail.character.ascendancyClass ? String(detail.character.ascendancyClass) : null,
        level: detail.character.level,
        experience: detail.character.experience,
        rawJson: detail,
        passiveTreeJson: ch.passiveTreeJson,
        fetchedAt: new Date().toISOString(),
      };
    },

    async getSnapshots(characterId: number) {
      const snaps = await db.select({
        id: schema.poeCharacterSnapshots.id,
        level: schema.poeCharacterSnapshots.level,
        createdAt: schema.poeCharacterSnapshots.createdAt,
        changeSummary: schema.poeCharacterSnapshots.changeSummary,
      }).from(schema.poeCharacterSnapshots)
        .where(eq(schema.poeCharacterSnapshots.characterId, characterId))
        .orderBy(desc(schema.poeCharacterSnapshots.createdAt))
        .limit(50);

      return snaps;
    },
  };
}
