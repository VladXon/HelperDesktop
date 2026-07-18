import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    login: text('login').notNull(),
    name: text('name').notNull().default(''),
    email: text('email').notNull().default(''),
    password: text('password').notNull(),
    isDev: boolean('is_dev').notNull().default(false),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
  },
  (t) => ({
    loginUnique: uniqueIndex('users_login_unique').on(t.login),
  }),
);

export const sessions = pgTable(
  'sessions',
  {
    id: serial('id').primaryKey(),
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
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
  },
  (t) => ({
    tokenUnique: uniqueIndex('sessions_token_unique').on(t.token),
    refreshTokenUnique: uniqueIndex('sessions_refresh_token_unique').on(t.refreshToken),
    tokenIdx: index('idx_sessions_token').on(t.token),
    refreshTokenIdx: index('idx_sessions_refresh_token').on(t.refreshToken),
    userIdIdx: index('idx_sessions_user_id').on(t.userId),
  }),
);

export const telegramLinks = pgTable(
  'telegram_links',
  {
    userId: integer('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    telegramId: integer('telegram_id').notNull(),
    linkedAt: timestamp('linked_at', { mode: 'string' }).notNull().defaultNow(),
  },
  (t) => ({
    telegramIdUnique: uniqueIndex('telegram_links_telegram_id_unique').on(t.telegramId),
  }),
);

export const telegramActions = pgTable(
  'telegram_actions',
  {
    token: text('token').primaryKey(),
    action: text('action').notNull(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
    telegramId: integer('telegram_id'),
    status: text('status').notNull().default('pending'),
    expiresAt: integer('expires_at').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
  },
  (t) => ({
    expiresIdx: index('idx_telegram_actions_expires')
      .on(t.expiresAt)
      .where(sql`status = 'pending'`),
  }),
);

export const notes = pgTable(
  'notes',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull().default(''),
    body: text('body').notNull().default(''),
    tags: text('tags').notNull().default('[]'),
    pinned: boolean('pinned').notNull().default(false),
    completed: boolean('completed').notNull().default(false),
    reminderAt: integer('reminder_at'),
    notifyTelegram: boolean('notify_telegram').notNull().default(false),
    telegramNotified: boolean('telegram_notified').notNull().default(false),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
  },
  (t) => ({
    userIdIdx: index('idx_notes_user_id').on(t.userId),
    reminderIdx: index('idx_notes_reminder')
      .on(t.userId, t.reminderAt)
      .where(sql`reminder_at IS NOT NULL AND completed = false`),
    notifyIdx: index('idx_notes_notify')
      .on(t.userId, t.telegramNotified)
      .where(sql`notify_telegram = true AND telegram_notified = false`),
  }),
);

export const presets = pgTable(
  'presets',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    icon: text('icon').notNull().default(''),
    apps: text('apps').notNull().default('[]'),
    pinned: boolean('pinned').notNull().default(false),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
  },
  (t) => ({
    userIdIdx: index('idx_presets_user_id').on(t.userId),
  }),
);

export const settings = pgTable(
  'settings',
  {
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    value: text('value').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.key] }),
  }),
);

export const auditLog = pgTable(
  'audit_log',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    ip: text('ip'),
    userAgent: text('user_agent'),
    metadata: text('metadata'),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
  },
  (t) => ({
    userIdIdx: index('idx_audit_log_user_id').on(t.userId, t.createdAt),
  }),
);

export const loginAttempts = pgTable(
  'login_attempts',
  {
    id: serial('id').primaryKey(),
    ip: text('ip').notNull(),
    login: text('login').notNull(),
    success: boolean('success').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
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
