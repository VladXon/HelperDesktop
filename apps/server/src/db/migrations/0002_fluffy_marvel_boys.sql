-- PoE OAuth accounts table
CREATE TABLE IF NOT EXISTS "poe_accounts" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL,
  "poe_account_id" text NOT NULL,
  "account_name" text NOT NULL,
  "access_token_encrypted" text NOT NULL,
  "refresh_token_encrypted" text,
  "token_expires_at" text,
  "scopes" text NOT NULL DEFAULT '',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_pa_user_id" ON "poe_accounts" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_pa_poe_account_id" ON "poe_accounts" ("poe_account_id");

-- PoE OAuth state (CSRF protection)
CREATE TABLE IF NOT EXISTS "poe_oauth_states" (
  "state" text PRIMARY KEY,
  "user_id" integer NOT NULL,
  "csrf_token" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "expires_at" integer NOT NULL
);

-- Build modifiers table
CREATE TABLE IF NOT EXISTS "poe_modifiers" (
  "id" serial PRIMARY KEY,
  "build_id" integer NOT NULL,
  "stat_id" text NOT NULL,
  "source" text NOT NULL,
  "type" text NOT NULL,
  "value" text NOT NULL
);
CREATE INDEX IF NOT EXISTS "idx_mod_build_id" ON "poe_modifiers" ("build_id");
CREATE INDEX IF NOT EXISTS "idx_mod_stat_id" ON "poe_modifiers" ("stat_id");

-- Add user ownership and PoB data to existing builds table
ALTER TABLE "poe_builds" ADD COLUMN IF NOT EXISTS "user_id" integer;
ALTER TABLE "poe_builds" ADD COLUMN IF NOT EXISTS "pob_url" text;
ALTER TABLE "poe_builds" ADD COLUMN IF NOT EXISTS "raw_pob_xml" text;
ALTER TABLE "poe_builds" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "poe_builds" ADD COLUMN IF NOT EXISTS "character_class" text;
ALTER TABLE "poe_builds" ADD COLUMN IF NOT EXISTS "ascendancy" text;
ALTER TABLE "poe_builds" ADD COLUMN IF NOT EXISTS "level" integer;
ALTER TABLE "poe_builds" ADD COLUMN IF NOT EXISTS "source" text;
ALTER TABLE "poe_builds" ADD COLUMN IF NOT EXISTS "build_hash" text;
ALTER TABLE "poe_builds" ADD COLUMN IF NOT EXISTS "game" text;
ALTER TABLE "poe_builds" ADD COLUMN IF NOT EXISTS "raw_source_hash" text;
ALTER TABLE "poe_builds" ADD COLUMN IF NOT EXISTS "created_at" timestamp;

CREATE INDEX IF NOT EXISTS "idx_builds_user" ON "poe_builds" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_builds_hash" ON "poe_builds" ("build_hash");
