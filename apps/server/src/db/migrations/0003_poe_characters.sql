-- PoE Character Analyzer tables
CREATE TABLE IF NOT EXISTS "poe_characters" (
  "id" serial PRIMARY KEY,
  "account_id" integer NOT NULL,
  "name" text NOT NULL,
  "league" text NOT NULL,
  "class" text NOT NULL,
  "ascendancy" text,
  "level" integer NOT NULL,
  "experience" bigint,
  "raw_json" jsonb NOT NULL DEFAULT '{}',
  "passive_tree_json" jsonb,
  "fetched_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "poe_characters_account_name_unique" UNIQUE("account_id", "name")
);

CREATE TABLE IF NOT EXISTS "poe_character_snapshots" (
  "id" serial PRIMARY KEY,
  "character_id" integer NOT NULL,
  "level" integer NOT NULL,
  "raw_json" jsonb NOT NULL,
  "change_summary" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "poe_item_cache" (
  "id" serial PRIMARY KEY,
  "item_hash" text UNIQUE NOT NULL,
  "name" text NOT NULL,
  "type_line" text NOT NULL,
  "inventory_id" text NOT NULL,
  "frame_type" integer NOT NULL,
  "raw_json" jsonb NOT NULL,
  "cached_at" timestamp NOT NULL DEFAULT now(),
  "expires_at" timestamp NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_char_account" ON "poe_characters" ("account_id");
CREATE INDEX IF NOT EXISTS "idx_char_league" ON "poe_characters" ("league");
CREATE INDEX IF NOT EXISTS "idx_snap_character" ON "poe_character_snapshots" ("character_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_item_hash" ON "poe_item_cache" ("item_hash");

ALTER TABLE "poe_characters" ADD CONSTRAINT "fk_char_account"
  FOREIGN KEY ("account_id") REFERENCES "poe_accounts"("id") ON DELETE CASCADE;

ALTER TABLE "poe_character_snapshots" ADD CONSTRAINT "fk_snap_character"
  FOREIGN KEY ("character_id") REFERENCES "poe_characters"("id") ON DELETE CASCADE;
