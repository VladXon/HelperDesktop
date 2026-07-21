import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  real,
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

// ── PoE Analyzer tables ──

export const poeCurrencySnapshots = pgTable(
  'poe_currency_snapshots',
  {
    id: serial('id').primaryKey(),
    league: text('league').notNull(),
    currencyType: text('currency_type').notNull(),
    chaosEquivalent: real('chaos_equivalent').notNull(),
    divineEquivalent: real('divine_equivalent').notNull(),
    change24h: real('change_24h'),
    listingCount: integer('listing_count'),
    snapshotTime: integer('snapshot_time').notNull(),
    source: text('source').notNull().default('ninja'),
  },
  (t) => ({
    leagueCurrencyTimeIdx: index('idx_cs_league_time').on(t.league, t.currencyType, t.snapshotTime),
  }),
);

export const poeMarketSnapshots = pgTable(
  'poe_market_snapshots',
  {
    id: serial('id').primaryKey(),
    league: text('league').notNull(),
    itemName: text('item_name').notNull(),
    itemType: text('item_type').notNull(),
    chaosValue: real('chaos_value').notNull(),
    divineValue: real('divine_value'),
    change24h: real('change_24h'),
    listingCount: integer('listing_count'),
    snapshotTime: integer('snapshot_time').notNull(),
    source: text('source').notNull().default('trade'),
  },
  (t) => ({
    leagueItemTimeIdx: index('idx_ms_league_time').on(t.league, t.itemName, t.snapshotTime),
  }),
);

export const poeTradeSearchCache = pgTable(
  'poe_trade_search_cache',
  {
    id: serial('id').primaryKey(),
    queryHash: text('query_hash').notNull().unique(),
    queryJson: text('query_json').notNull(),
    league: text('league').notNull(),
    resultJson: text('result_json').notNull(),
    totalItems: integer('total_items').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
    expiresAt: integer('expires_at').notNull(),
  },
);

export const poeBuilds = pgTable(
  'poe_builds',
  {
    id: serial('id').primaryKey(),
    buildHash: text('build_hash').notNull().unique(),
    game: text('game').notNull(),
    name: text('name'),
    source: text('source').notNull(),
    characterClass: text('character_class'),
    ascendancy: text('ascendancy'),
    level: integer('level'),
    rawSourceHash: text('raw_source_hash'),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
  },
);

export const poeBuildAnalyses = pgTable(
  'poe_build_analyses',
  {
    id: serial('id').primaryKey(),
    buildHash: text('build_hash').notNull(),
    game: text('game'),
    league: text('league'),
    patchVersion: text('patch_version'),
    analyzerVersion: text('analyzer_version'),
    analysisContextJson: text('analysis_context_json'),
    resultJson: text('result_json').notNull(),
    overallScore: integer('overall_score').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
  },
  (t) => ({
    buildHashIdx: index('idx_ba_hash').on(t.buildHash),
    scoreIdx: index('idx_ba_score').on(t.overallScore),
  }),
);

export const poeItemValuations = pgTable(
  'poe_item_valuations',
  {
    id: serial('id').primaryKey(),
    league: text('league').notNull(),
    itemHash: text('item_hash').notNull(),
    itemName: text('item_name').notNull(),
    itemType: text('item_type').notNull(),
    chaosValue: real('chaos_value').notNull(),
    confidence: text('confidence').notNull(),
    listingCount: integer('listing_count'),
    minPrice: real('min_price'),
    medianPrice: real('median_price'),
    maxPrice: real('max_price'),
    valuedAt: integer('valued_at').notNull(),
    source: text('source').notNull().default('trade'),
  },
);

export const poeItems = pgTable(
  'poe_items',
  {
    id: serial('id').primaryKey(),
    game: text('game').notNull(),
    name: text('name').notNull(),
    baseType: text('base_type'),
    itemType: text('item_type'),
    category: text('category'),
    level: integer('level'),
    requiredLevel: integer('required_level'),
    flavourText: text('flavour_text'),
    explicitStatsJson: text('explicit_stats_json'),
    dropSourcesJson: text('drop_sources_json'),
    icon: text('icon'),
    source: text('source').notNull().default('wiki'),
    sourceUrl: text('source_url'),
    version: text('version').notNull().default('1.0'),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => ({
    gameNameUnique: uniqueIndex('idx_items_game_name').on(t.game, t.name),
  }),
);

export const poeSkills = pgTable(
  'poe_skills',
  {
    id: serial('id').primaryKey(),
    game: text('game').notNull(),
    name: text('name').notNull(),
    type: text('type').notNull(),
    tagsJson: text('tags_json').notNull(),
    gemLevel: integer('gem_level'),
    manaMultiplier: integer('mana_multiplier'),
    qualityStatsJson: text('quality_stats_json'),
    source: text('source').notNull().default('wiki'),
    sourceUrl: text('source_url'),
    version: text('version').notNull().default('1.0'),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => ({
    gameNameTypeUnique: uniqueIndex('idx_skills_game_name').on(t.game, t.name, t.type),
  }),
);

export const poeMetaBuilds = pgTable(
  'poe_meta_builds',
  {
    id: serial('id').primaryKey(),
    game: text('game').notNull(),
    league: text('league').notNull(),
    name: text('name').notNull(),
    class: text('class').notNull(),
    ascendancy: text('ascendancy'),
    mainSkill: text('main_skill'),
    budget: text('budget').notNull(),
    popularity: integer('popularity'),
    pastebinUrl: text('pastebin_url'),
    forumUrl: text('forum_url'),
    tagsJson: text('tags_json'),
    source: text('source').notNull().default('forum'),
    sourceUrl: text('source_url'),
    version: text('version').notNull().default('1.0'),
    updatedAt: integer('updated_at').notNull(),
  },
);

export const poeCraftingMethods = pgTable(
  'poe_crafting_methods',
  {
    id: serial('id').primaryKey(),
    game: text('game').notNull(),
    methodName: text('method_name').notNull(),
    targetItem: text('target_item').notNull(),
    stepsJson: text('steps_json').notNull(),
    estimatedCostLow: real('estimated_cost_low'),
    estimatedCostHigh: real('estimated_cost_high'),
    requiredUnlocksJson: text('required_unlocks_json'),
    source: text('source').notNull().default('community'),
    sourceUrl: text('source_url'),
    version: text('version').notNull().default('1.0'),
    updatedAt: integer('updated_at').notNull(),
  },
);

export const poeLeagueInfo = pgTable(
  'poe_league_info',
  {
    id: serial('id').primaryKey(),
    game: text('game').notNull(),
    leagueId: text('league_id').notNull(),
    leagueName: text('league_name').notNull(),
    isCurrent: boolean('is_current').notNull().default(false),
    isHardcore: boolean('is_hardcore').notNull().default(false),
    isSsf: boolean('is_ssf').notNull().default(false),
    startDate: integer('start_date').notNull(),
    endDate: integer('end_date'),
    version: text('version').notNull().default('1.0'),
  },
);

export const poeEconomicEvents = pgTable(
  'poe_economic_events',
  {
    id: serial('id').primaryKey(),
    league: text('league').notNull(),
    eventType: text('event_type').notNull(),
    currency: text('currency'),
    itemName: text('item_name'),
    description: text('description').notNull(),
    changePercent: real('change_percent'),
    occurredAt: integer('occurred_at').notNull(),
  },
);

export const poeAiRequests = pgTable(
  'poe_ai_requests',
  {
    id: serial('id').primaryKey(),
    buildAnalysisId: integer('build_analysis_id'),
    provider: text('provider').notNull(),
    model: text('model').notNull(),
    promptVersion: text('prompt_version').notNull(),
    promptHash: text('prompt_hash').notNull(),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    status: text('status').notNull(),
    responseText: text('response_text'),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
  },
  (t) => ({
    analysisIdx: index('idx_ar_analysis').on(t.buildAnalysisId),
    statusIdx: index('idx_ar_status').on(t.status),
  }),
);

export const poeAiProviderSettings = pgTable(
  'poe_ai_provider_settings',
  {
    id: serial('id').primaryKey(),
    provider: text('provider').notNull().unique(),
    model: text('model').notNull(),
    endpoint: text('endpoint'),
    enabled: boolean('enabled').notNull().default(false),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
  },
);

export const poeSyncHistory = pgTable(
  'poe_sync_history',
  {
    id: serial('id').primaryKey(),
    source: text('source').notNull(),
    syncType: text('sync_type').notNull(),
    startedAt: timestamp('started_at', { mode: 'string' }).notNull(),
    finishedAt: timestamp('finished_at', { mode: 'string' }),
    status: text('status').notNull().default('running'),
    inserted: integer('inserted').notNull().default(0),
    updated: integer('updated').notNull().default(0),
    failed: integer('failed').notNull().default(0),
    errorJson: text('error_json'),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
  },
);

// ── Phase 9: PoE OAuth + persistence tables ──

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

export type PoeCurrencySnapshot = typeof poeCurrencySnapshots.$inferSelect;
export type NewPoeCurrencySnapshot = typeof poeCurrencySnapshots.$inferInsert;
export type PoeMarketSnapshot = typeof poeMarketSnapshots.$inferSelect;
export type NewPoeMarketSnapshot = typeof poeMarketSnapshots.$inferInsert;
export type PoeTradeSearchCache = typeof poeTradeSearchCache.$inferSelect;
export type NewPoeTradeSearchCache = typeof poeTradeSearchCache.$inferInsert;
export type PoeBuild = typeof poeBuilds.$inferSelect;
export type NewPoeBuild = typeof poeBuilds.$inferInsert;
export type PoeBuildAnalysis = typeof poeBuildAnalyses.$inferSelect;
export type NewPoeBuildAnalysis = typeof poeBuildAnalyses.$inferInsert;
export type PoeItemValuation = typeof poeItemValuations.$inferSelect;
export type NewPoeItemValuation = typeof poeItemValuations.$inferInsert;
export type PoeItem = typeof poeItems.$inferSelect;
export type NewPoeItem = typeof poeItems.$inferInsert;
export type PoeSkill = typeof poeSkills.$inferSelect;
export type NewPoeSkill = typeof poeSkills.$inferInsert;
export type PoeMetaBuild = typeof poeMetaBuilds.$inferSelect;
export type NewPoeMetaBuild = typeof poeMetaBuilds.$inferInsert;
export type PoeCraftingMethod = typeof poeCraftingMethods.$inferSelect;
export type NewPoeCraftingMethod = typeof poeCraftingMethods.$inferInsert;
export type PoeLeagueInfo = typeof poeLeagueInfo.$inferSelect;
export type NewPoeLeagueInfo = typeof poeLeagueInfo.$inferInsert;
export type PoeEconomicEvent = typeof poeEconomicEvents.$inferSelect;
export type NewPoeEconomicEvent = typeof poeEconomicEvents.$inferInsert;
export type PoeAiRequest = typeof poeAiRequests.$inferSelect;
export type NewPoeAiRequest = typeof poeAiRequests.$inferInsert;
export type PoeAiProviderSetting = typeof poeAiProviderSettings.$inferSelect;
export type NewPoeAiProviderSetting = typeof poeAiProviderSettings.$inferInsert;
export type PoeSyncHistory = typeof poeSyncHistory.$inferSelect;

export type PoeAccount = typeof poeAccounts.$inferSelect;
export type NewPoeAccount = typeof poeAccounts.$inferInsert;
export type PoeModifier = typeof poeModifiers.$inferSelect;
export type NewPoeModifier = typeof poeModifiers.$inferInsert;
export type PoeOauthState = typeof poeOauthStates.$inferSelect;
export type NewPoeOauthState = typeof poeOauthStates.$inferInsert;
export type NewPoeSyncHistory = typeof poeSyncHistory.$inferInsert;
