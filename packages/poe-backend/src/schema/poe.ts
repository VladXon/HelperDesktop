import { pgTable, serial, integer, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const poeAccounts = pgTable(
  'poe_accounts',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull(),
    poeAccountId: text('poe_account_id').notNull(),
    accountName: text('account_name').notNull(),
    accessTokenEncrypted: text('access_token_encrypted').notNull(),
    refreshTokenEncrypted: text('refresh_token_encrypted'),
    tokenExpiresAt: text('token_expires_at'),
    scopes: text('scopes').notNull().default(''),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
  },
  (t) => ({
    userIdIdx: index('idx_pa_user_id').on(t.userId),
    poeAccountIdUnique: uniqueIndex('idx_pa_poe_account_id').on(t.poeAccountId),
  }),
);

export const poeModifiers = pgTable(
  'poe_modifiers',
  {
    id: serial('id').primaryKey(),
    buildId: integer('build_id').notNull(),
    statId: text('stat_id').notNull(),
    source: text('source').notNull(),
    type: text('type').notNull(),
    value: text('value').notNull(),
  },
  (t) => ({
    buildIdIdx: index('idx_mod_build_id').on(t.buildId),
    statIdx: index('idx_mod_stat_id').on(t.statId),
  }),
);

export const poeOauthStates = pgTable(
  'poe_oauth_states',
  {
    state: text('state').primaryKey(),
    userId: integer('user_id').notNull(),
    csrfToken: text('csrf_token').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
    expiresAt: integer('expires_at').notNull(),
  },
);

export type PoeAccount = typeof poeAccounts.$inferSelect;
export type NewPoeAccount = typeof poeAccounts.$inferInsert;
export type PoeModifier = typeof poeModifiers.$inferSelect;
export type NewPoeModifier = typeof poeModifiers.$inferInsert;
export type PoeOauthState = typeof poeOauthStates.$inferSelect;
export type NewPoeOauthState = typeof poeOauthStates.$inferInsert;
