CREATE TABLE "poe_ai_provider_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"endpoint" text,
	"enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "poe_ai_provider_settings_provider_unique" UNIQUE("provider")
);
--> statement-breakpoint
CREATE TABLE "poe_ai_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"build_analysis_id" integer,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"prompt_version" text NOT NULL,
	"prompt_hash" text NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"status" text NOT NULL,
	"response_text" text,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poe_build_analyses" (
	"id" serial PRIMARY KEY NOT NULL,
	"build_hash" text NOT NULL,
	"game" text,
	"league" text,
	"patch_version" text,
	"analyzer_version" text,
	"analysis_context_json" text,
	"result_json" text NOT NULL,
	"overall_score" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poe_builds" (
	"id" serial PRIMARY KEY NOT NULL,
	"build_hash" text NOT NULL,
	"game" text NOT NULL,
	"name" text,
	"source" text NOT NULL,
	"character_class" text,
	"ascendancy" text,
	"level" integer,
	"raw_source_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "poe_builds_build_hash_unique" UNIQUE("build_hash")
);
--> statement-breakpoint
CREATE TABLE "poe_crafting_methods" (
	"id" serial PRIMARY KEY NOT NULL,
	"game" text NOT NULL,
	"method_name" text NOT NULL,
	"target_item" text NOT NULL,
	"steps_json" text NOT NULL,
	"estimated_cost_low" real,
	"estimated_cost_high" real,
	"required_unlocks_json" text,
	"source" text DEFAULT 'community' NOT NULL,
	"source_url" text,
	"version" text DEFAULT '1.0' NOT NULL,
	"updated_at" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poe_currency_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"league" text NOT NULL,
	"currency_type" text NOT NULL,
	"chaos_equivalent" real NOT NULL,
	"divine_equivalent" real NOT NULL,
	"change_24h" real,
	"listing_count" integer,
	"snapshot_time" integer NOT NULL,
	"source" text DEFAULT 'ninja' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poe_economic_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"league" text NOT NULL,
	"event_type" text NOT NULL,
	"currency" text,
	"item_name" text,
	"description" text NOT NULL,
	"change_percent" real,
	"occurred_at" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poe_item_valuations" (
	"id" serial PRIMARY KEY NOT NULL,
	"league" text NOT NULL,
	"item_hash" text NOT NULL,
	"item_name" text NOT NULL,
	"item_type" text NOT NULL,
	"chaos_value" real NOT NULL,
	"confidence" text NOT NULL,
	"listing_count" integer,
	"min_price" real,
	"median_price" real,
	"max_price" real,
	"valued_at" integer NOT NULL,
	"source" text DEFAULT 'trade' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poe_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"game" text NOT NULL,
	"name" text NOT NULL,
	"base_type" text,
	"item_type" text,
	"category" text,
	"level" integer,
	"required_level" integer,
	"flavour_text" text,
	"explicit_stats_json" text,
	"drop_sources_json" text,
	"icon" text,
	"source" text DEFAULT 'wiki' NOT NULL,
	"source_url" text,
	"version" text DEFAULT '1.0' NOT NULL,
	"updated_at" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poe_league_info" (
	"id" serial PRIMARY KEY NOT NULL,
	"game" text NOT NULL,
	"league_id" text NOT NULL,
	"league_name" text NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"is_hardcore" boolean DEFAULT false NOT NULL,
	"is_ssf" boolean DEFAULT false NOT NULL,
	"start_date" integer NOT NULL,
	"end_date" integer,
	"version" text DEFAULT '1.0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poe_market_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"league" text NOT NULL,
	"item_name" text NOT NULL,
	"item_type" text NOT NULL,
	"chaos_value" real NOT NULL,
	"divine_value" real,
	"change_24h" real,
	"listing_count" integer,
	"snapshot_time" integer NOT NULL,
	"source" text DEFAULT 'trade' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poe_meta_builds" (
	"id" serial PRIMARY KEY NOT NULL,
	"game" text NOT NULL,
	"league" text NOT NULL,
	"name" text NOT NULL,
	"class" text NOT NULL,
	"ascendancy" text,
	"main_skill" text,
	"budget" text NOT NULL,
	"popularity" integer,
	"pastebin_url" text,
	"forum_url" text,
	"tags_json" text,
	"source" text DEFAULT 'forum' NOT NULL,
	"source_url" text,
	"version" text DEFAULT '1.0' NOT NULL,
	"updated_at" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poe_skills" (
	"id" serial PRIMARY KEY NOT NULL,
	"game" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"tags_json" text NOT NULL,
	"gem_level" integer,
	"mana_multiplier" integer,
	"quality_stats_json" text,
	"source" text DEFAULT 'wiki' NOT NULL,
	"source_url" text,
	"version" text DEFAULT '1.0' NOT NULL,
	"updated_at" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poe_trade_search_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"query_hash" text NOT NULL,
	"query_json" text NOT NULL,
	"league" text NOT NULL,
	"result_json" text NOT NULL,
	"total_items" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" integer NOT NULL,
	CONSTRAINT "poe_trade_search_cache_query_hash_unique" UNIQUE("query_hash")
);
--> statement-breakpoint
CREATE INDEX "idx_ar_analysis" ON "poe_ai_requests" USING btree ("build_analysis_id");--> statement-breakpoint
CREATE INDEX "idx_ar_status" ON "poe_ai_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_ba_hash" ON "poe_build_analyses" USING btree ("build_hash");--> statement-breakpoint
CREATE INDEX "idx_ba_score" ON "poe_build_analyses" USING btree ("overall_score");--> statement-breakpoint
CREATE INDEX "idx_cs_league_time" ON "poe_currency_snapshots" USING btree ("league","currency_type","snapshot_time");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_items_game_name" ON "poe_items" USING btree ("game","name");--> statement-breakpoint
CREATE INDEX "idx_ms_league_time" ON "poe_market_snapshots" USING btree ("league","item_name","snapshot_time");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_skills_game_name" ON "poe_skills" USING btree ("game","name","type");