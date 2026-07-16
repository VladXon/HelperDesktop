import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const users = sqliteTable(
  'users',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    login: text('login').notNull(),
    name: text('name').notNull().default(''),
    email: text('email').notNull().default(''),
    password: text('password').notNull(),
    isDev: integer('is_dev', { mode: 'boolean' }).notNull().default(false),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  },
  (t) => ({
    loginUnique: uniqueIndex('users_login_unique').on(t.login),
  }),
);

export const sessions = sqliteTable(
  'sessions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull(),
    refreshToken: text('refresh_token').notNull(),
    refreshTokenUsedAt: text('refresh_token_used_at'),
    deviceId: text('device_id'),
    ip: text('ip'),
    userAgent: text('user_agent'),
    expiresAt: text('expires_at').notNull(),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  },
  (t) => ({
    tokenUnique: uniqueIndex('sessions_token_unique').on(t.token),
    refreshTokenUnique: uniqueIndex('sessions_refresh_token_unique').on(t.refreshToken),
    tokenIdx: index('idx_sessions_token').on(t.token),
    refreshTokenIdx: index('idx_sessions_refresh_token').on(t.refreshToken),
    userIdIdx: index('idx_sessions_user_id').on(t.userId),
  }),
);

export const telegramLinks = sqliteTable(
  'telegram_links',
  {
    userId: integer('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    telegramId: integer('telegram_id').notNull(),
    linkedAt: text('linked_at').notNull().default(sql`(datetime('now'))`),
  },
  (t) => ({
    telegramIdUnique: uniqueIndex('telegram_links_telegram_id_unique').on(t.telegramId),
  }),
);

export const telegramActions = sqliteTable(
  'telegram_actions',
  {
    token: text('token').primaryKey(),
    action: text('action').notNull(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
    telegramId: integer('telegram_id'),
    status: text('status').notNull().default('pending'),
    expiresAt: integer('expires_at').notNull(),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  },
  (t) => ({
    expiresIdx: index('idx_telegram_actions_expires')
      .on(t.expiresAt)
      .where(sql`status = 'pending'`),
    actionCheck: check(
      'telegram_actions_action_check',
      sql`action IN ('link_code', 'qr_login')`,
    ),
    statusCheck: check(
      'telegram_actions_status_check',
      sql`status IN ('pending', 'approved', 'expired')`,
    ),
  }),
);

export const notes = sqliteTable(
  'notes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull().default(''),
    body: text('body').notNull().default(''),
    tags: text('tags').notNull().default('[]'),
    pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
    completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
    reminderAt: integer('reminder_at'),
    notifyTelegram: integer('notify_telegram', { mode: 'boolean' }).notNull().default(false),
    telegramNotified: integer('telegram_notified', { mode: 'boolean' })
      .notNull()
      .default(false),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
    updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  },
  (t) => ({
    userIdIdx: index('idx_notes_user_id').on(t.userId),
    reminderIdx: index('idx_notes_reminder')
      .on(t.userId, t.reminderAt)
      .where(sql`reminder_at IS NOT NULL AND completed = 0`),
    notifyIdx: index('idx_notes_notify')
      .on(t.userId, t.telegramNotified)
      .where(sql`notify_telegram = 1 AND telegram_notified = 0`),
  }),
);

export const presets = sqliteTable(
  'presets',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    icon: text('icon').notNull().default(''),
    apps: text('apps').notNull().default('[]'),
    pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
    updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  },
  (t) => ({
    userIdIdx: index('idx_presets_user_id').on(t.userId),
  }),
);

export const settings = sqliteTable(
  'settings',
  {
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    value: text('value').notNull(),
    updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.key] }),
  }),
);

export const auditLog = sqliteTable(
  'audit_log',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    ip: text('ip'),
    userAgent: text('user_agent'),
    metadata: text('metadata'),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  },
  (t) => ({
    userIdIdx: index('idx_audit_log_user_id').on(t.userId, t.createdAt),
  }),
);

export const loginAttempts = sqliteTable(
  'login_attempts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    ip: text('ip').notNull(),
    login: text('login').notNull(),
    success: integer('success', { mode: 'boolean' }).notNull(),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  },
  (t) => ({
    createdIdx: index('idx_login_attempts_created').on(t.createdAt),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
export type Preset = typeof presets.$inferSelect;
export type NewPreset = typeof presets.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;
export type AuditLog = typeof auditLog.$inferSelect;
export type NewAuditLog = typeof auditLog.$inferInsert;
export type LoginAttempt = typeof loginAttempts.$inferSelect;
export type NewLoginAttempt = typeof loginAttempts.$inferInsert;
export type TelegramLink = typeof telegramLinks.$inferSelect;
export type NewTelegramLink = typeof telegramLinks.$inferInsert;
export type TelegramAction = typeof telegramActions.$inferSelect;
export type NewTelegramAction = typeof telegramActions.$inferInsert;
