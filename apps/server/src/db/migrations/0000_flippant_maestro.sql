CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"action" text NOT NULL,
	"ip" text,
	"user_agent" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"ip" text NOT NULL,
	"login" text NOT NULL,
	"success" boolean NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"tags" text DEFAULT '[]' NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"reminder_at" integer,
	"notify_telegram" boolean DEFAULT false NOT NULL,
	"telegram_notified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "presets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"icon" text DEFAULT '' NOT NULL,
	"apps" text DEFAULT '[]' NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"refresh_token_used_at" text,
	"device_id" text,
	"ip" text,
	"user_agent" text,
	"expires_at" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"user_id" integer NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "settings_user_id_key_pk" PRIMARY KEY("user_id","key")
);
--> statement-breakpoint
CREATE TABLE "telegram_actions" (
	"token" text PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"user_id" integer,
	"telegram_id" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telegram_links" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"telegram_id" integer NOT NULL,
	"linked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"login" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"password" text NOT NULL,
	"is_dev" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presets" ADD CONSTRAINT "presets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_actions" ADD CONSTRAINT "telegram_actions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_links" ADD CONSTRAINT "telegram_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_log_user_id" ON "audit_log" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_login_attempts_created" ON "login_attempts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_notes_user_id" ON "notes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notes_reminder" ON "notes" USING btree ("user_id","reminder_at") WHERE reminder_at IS NOT NULL AND completed = false;--> statement-breakpoint
CREATE INDEX "idx_notes_notify" ON "notes" USING btree ("user_id","telegram_notified") WHERE notify_telegram = true AND telegram_notified = false;--> statement-breakpoint
CREATE INDEX "idx_presets_user_id" ON "presets" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_unique" ON "sessions" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_refresh_token_unique" ON "sessions" USING btree ("refresh_token");--> statement-breakpoint
CREATE INDEX "idx_sessions_token" ON "sessions" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_sessions_refresh_token" ON "sessions" USING btree ("refresh_token");--> statement-breakpoint
CREATE INDEX "idx_sessions_user_id" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_telegram_actions_expires" ON "telegram_actions" USING btree ("expires_at") WHERE status = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "telegram_links_telegram_id_unique" ON "telegram_links" USING btree ("telegram_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_login_unique" ON "users" USING btree ("login");