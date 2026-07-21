import { eq, desc } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import { poeAccounts, poeOauthStates } from '../schema/poe.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = NodePgDatabase<Record<string, any>>;

export function findAccountByUserId(db: Db, userId: number) {
  return db.select().from(poeAccounts).where(eq(poeAccounts.userId, userId)).limit(1);
}

export function findAccountByPoeId(db: Db, poeAccountId: string) {
  return db.select().from(poeAccounts).where(eq(poeAccounts.poeAccountId, poeAccountId)).limit(1);
}

export function listAccountsByUser(db: Db, userId: number) {
  return db.select().from(poeAccounts).where(eq(poeAccounts.userId, userId)).orderBy(desc(poeAccounts.createdAt));
}

export function insertAccount(db: Db, data: typeof poeAccounts.$inferInsert) {
  return db.insert(poeAccounts).values(data).returning();
}

export function updateAccountTokens(
  db: Db,
  poeAccountId: string,
  data: { accessTokenEncrypted: string; refreshTokenEncrypted?: string; tokenExpiresAt?: string },
) {
  return db.update(poeAccounts)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(poeAccounts.poeAccountId, poeAccountId));
}

export function deleteAccount(db: Db, poeAccountId: string) {
  return db.delete(poeAccounts).where(eq(poeAccounts.poeAccountId, poeAccountId));
}

export function insertOauthState(db: Db, data: typeof poeOauthStates.$inferInsert) {
  return db.insert(poeOauthStates).values(data).returning();
}

export function findOauthState(db: Db, state: string) {
  return db.select().from(poeOauthStates).where(eq(poeOauthStates.state, state)).limit(1);
}

export function deleteOauthState(db: Db, state: string) {
  return db.delete(poeOauthStates).where(eq(poeOauthStates.state, state));
}
