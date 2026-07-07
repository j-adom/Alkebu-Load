-- fix-mcp-schema.sql — 2026-07-05 production incident patch
--
-- Root cause: the staff-agent MCP plugin (@payloadcms/plugin-mcp, merged to main
-- 2026-07-03, commit 3243b0d) registers the `payload-mcp-api-keys` collection even
-- when `disabled: true` — the plugin intentionally keeps collections so the schema
-- stays consistent. Production Postgres never received the corresponding DDL, so
-- every logged-in /admin render crashed with:
--   column "...payload_mcp_api_keys_id" does not exist  (Postgres 42703)
--
-- This script is IDEMPOTENT — every statement is guarded, safe to re-run.
-- It also back-fills two drift items found while diffing (refund columns and
-- job-task enum values) in case the earlier manual patches missed them.
--
-- Apply:  psql "$DATABASE_URI" -f scripts/fix-mcp-schema.sql

  BEGIN;

  -- ── 1. MCP API keys collection (the outage fix) ────────────────────────────────

  CREATE TABLE IF NOT EXISTS "payload_mcp_api_keys" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" integer NOT NULL,
    "label" varchar,
    "description" varchar,
    "orders_find" boolean DEFAULT false,
    "orders_update" boolean DEFAULT false,
    "books_find" boolean DEFAULT false,
    "books_update" boolean DEFAULT false,
    "wellness_lifestyle_find" boolean DEFAULT false,
    "wellness_lifestyle_update" boolean DEFAULT false,
    "fashion_jewelry_find" boolean DEFAULT false,
    "fashion_jewelry_update" boolean DEFAULT false,
    "oils_incense_find" boolean DEFAULT false,
    "oils_incense_update" boolean DEFAULT false,
    "blog_posts_find" boolean DEFAULT false,
    "blog_posts_create" boolean DEFAULT false,
    "blog_posts_update" boolean DEFAULT false,
    "customers_find" boolean DEFAULT false,
    "carts_find" boolean DEFAULT false,
    "reviews_find" boolean DEFAULT false,
    "search_analytics_find" boolean DEFAULT false,
    "authors_find" boolean DEFAULT false,
    "publishers_find" boolean DEFAULT false,
    "vendors_find" boolean DEFAULT false,
    "payload_mcp_tool_list_orders_needs_attention" boolean DEFAULT true,
    "payload_mcp_tool_low_stock" boolean DEFAULT true,
    "payload_mcp_tool_draft_refund" boolean DEFAULT true,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "enable_a_p_i_key" boolean,
    "api_key" varchar,
    "api_key_index" varchar
  );

  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "payload_mcp_api_keys_id" integer;
  ALTER TABLE "payload_preferences_rels"      ADD COLUMN IF NOT EXISTS "payload_mcp_api_keys_id" integer;

  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payload_mcp_api_keys_user_id_users_id_fk') THEN
      ALTER TABLE "payload_mcp_api_keys"
        ADD CONSTRAINT "payload_mcp_api_keys_user_id_users_id_fk"
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_payload_mcp_api_keys_fk') THEN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_payload_mcp_api_keys_fk"
        FOREIGN KEY ("payload_mcp_api_keys_id") REFERENCES "public"."payload_mcp_api_keys"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payload_preferences_rels_payload_mcp_api_keys_fk') THEN
      ALTER TABLE "payload_preferences_rels"
        ADD CONSTRAINT "payload_preferences_rels_payload_mcp_api_keys_fk"
        FOREIGN KEY ("payload_mcp_api_keys_id") REFERENCES "public"."payload_mcp_api_keys"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
  END $$;

  CREATE INDEX IF NOT EXISTS "payload_mcp_api_keys_user_idx"       ON "payload_mcp_api_keys" USING btree ("user_id");
  CREATE INDEX IF NOT EXISTS "payload_mcp_api_keys_updated_at_idx" ON "payload_mcp_api_keys" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "payload_mcp_api_keys_created_at_idx" ON "payload_mcp_api_keys" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_payload_mcp_api_keys_id_idx" ON "payload_locked_documents_rels" USING btree ("payload_mcp_api_keys_id");
  CREATE INDEX IF NOT EXISTS "payload_preferences_rels_payload_mcp_api_keys_id_idx"      ON "payload_preferences_rels" USING btree ("payload_mcp_api_keys_id");

  -- ── 2. Refund schema drift (no-ops if the June patch already ran) ──────────────

  ALTER TABLE "orders_items"   ADD COLUMN IF NOT EXISTS "refunded_quantity" numeric DEFAULT 0;
  ALTER TABLE "orders_items"   ADD COLUMN IF NOT EXISTS "do_not_ship" boolean DEFAULT false;
  ALTER TABLE "orders_refunds" ADD COLUMN IF NOT EXISTS "note" varchar;
  ALTER TABLE "orders_refunds" ADD COLUMN IF NOT EXISTS "items" jsonb;
  ALTER TABLE "orders_refunds" ADD COLUMN IF NOT EXISTS "restock" boolean DEFAULT false;

  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_orders_email_notifications_refund_notification_status') THEN
      CREATE TYPE "public"."enum_orders_email_notifications_refund_notification_status" AS ENUM('pending', 'sent', 'failed', 'skipped');
    END IF;
  END $$;

  ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "email_notifications_refund_notification_status" "enum_orders_email_notifications_refund_notification_status";
  ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "email_notifications_refund_notification_recipient" varchar;
  ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "email_notifications_refund_notification_provider" varchar;
  ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "email_notifications_refund_notification_sent_at" timestamp(3) with time zone;
  ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "email_notifications_refund_notification_error" varchar;

  COMMIT;

  -- ── 3. Enum value additions (must run OUTSIDE a transaction on PG < 12,
  --       and ADD VALUE cannot run inside a transaction block at all on some
  --       versions — kept separate and guarded via IF NOT EXISTS) ────────────────

  ALTER TYPE "public"."enum_orders_payment_payment_status" ADD VALUE IF NOT EXISTS 'partially_refunded' BEFORE 'refunded';
  ALTER TYPE "public"."enum_orders_fulfillment_carrier"    ADD VALUE IF NOT EXISTS 'direct_to_home';
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug"    ADD VALUE IF NOT EXISTS 'recover-stripe-orders';
  ALTER TYPE "public"."enum_payload_jobs_task_slug"        ADD VALUE IF NOT EXISTS 'recover-stripe-orders';
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug"    ADD VALUE IF NOT EXISTS 'quote-followups';
  ALTER TYPE "public"."enum_payload_jobs_task_slug"        ADD VALUE IF NOT EXISTS 'quote-followups';
