-- Ingram availability schema (plan Tasks 5, 9 and 12)
--   - books_editions: Ingram availability cache + manual vendor flag
--   - orders / orders_items: needsIngramOrder flag + per-line fulfillmentSource
--   - payload_jobs task-slug enums: ingram-stock-fetch, ingram-stock-apply
--
-- Requires PostgreSQL 12+ (ALTER TYPE ... ADD VALUE inside a transaction).
--
-- APPLY TO PRODUCTION POSTGRES *BEFORE* DEPLOYING the branch that adds these fields.
-- Without the columns, Payload errors when it reads or writes books or orders.
--
-- Hand-applied SQL, not a migration file, for the same reason as
-- add-square-catalog-staging-schema.sql: prod has no prodMigrations configured and the
-- last migration snapshot predates several hand-applied fixes.
--
-- Additive only: new nullable/defaulted columns, one enum type and one index. Nothing is
-- dropped, retyped or backfilled. Names and types follow Payload's postgres naming
-- (group prefixes, enum_<table>_<field>, <table>_<column>_idx).
--
-- Single transaction, all-or-nothing, idempotent (safe to re-run).

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- 0. Guards ------------------------------------------------------------------------------
DO $do$
BEGIN
  IF current_database() <> 'alkebulan' THEN
    RAISE EXCEPTION 'Connected to database "%", expected "alkebulan". Run \c alkebulan first.', current_database();
  END IF;
  IF to_regclass('public.books_editions') IS NULL OR to_regclass('public.orders_items') IS NULL THEN
    RAISE EXCEPTION 'books_editions / orders_items not found: this is not the Payload database';
  END IF;
END
$do$;

-- 1. Columns -----------------------------------------------------------------------------
ALTER TABLE "books_editions" ADD COLUMN IF NOT EXISTS "inventory_ingram_on_hand" numeric;
ALTER TABLE "books_editions" ADD COLUMN IF NOT EXISTS "inventory_ingram_available" boolean DEFAULT false;
ALTER TABLE "books_editions" ADD COLUMN IF NOT EXISTS "inventory_ingram_checked_at" timestamp(3) with time zone;
ALTER TABLE "books_editions" ADD COLUMN IF NOT EXISTS "inventory_available_to_order" boolean DEFAULT false;

DO $do$
BEGIN
  IF to_regtype('public.enum_orders_items_fulfillment_source') IS NULL THEN
    CREATE TYPE "public"."enum_orders_items_fulfillment_source" AS ENUM ('in-store', 'ingram', 'vendor');
  END IF;
END
$do$;
ALTER TABLE "orders_items" ADD COLUMN IF NOT EXISTS "fulfillment_source" "enum_orders_items_fulfillment_source";
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "needs_ingram_order" boolean DEFAULT false;
CREATE INDEX IF NOT EXISTS "orders_needs_ingram_order_idx" ON "orders" USING btree ("needs_ingram_order");

ALTER TYPE public.enum_payload_jobs_log_task_slug ADD VALUE IF NOT EXISTS 'ingram-stock-fetch';
ALTER TYPE public.enum_payload_jobs_log_task_slug ADD VALUE IF NOT EXISTS 'ingram-stock-apply';
ALTER TYPE public.enum_payload_jobs_task_slug     ADD VALUE IF NOT EXISTS 'ingram-stock-fetch';
ALTER TYPE public.enum_payload_jobs_task_slug     ADD VALUE IF NOT EXISTS 'ingram-stock-apply';

-- 2. Verify ------------------------------------------------------------------------------
DO $do$
DECLARE
  missing text;
BEGIN
  SELECT string_agg(expected.tbl || '.' || expected.col || ' ' || expected.typ, ', ')
    INTO missing
    FROM (VALUES
      ('books_editions', 'inventory_ingram_on_hand', 'numeric'),
      ('books_editions', 'inventory_ingram_available', 'boolean'),
      ('books_editions', 'inventory_ingram_checked_at', 'timestamp with time zone'),
      ('books_editions', 'inventory_available_to_order', 'boolean'),
      ('orders_items', 'fulfillment_source', 'USER-DEFINED'),
      ('orders', 'needs_ingram_order', 'boolean')
    ) AS expected(tbl, col, typ)
    LEFT JOIN information_schema.columns c
      ON c.table_schema = 'public'
     AND c.table_name = expected.tbl
     AND c.column_name = expected.col
     AND c.data_type = expected.typ
   WHERE c.column_name IS NULL;
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Verification failed, missing or wrong type: %', missing;
  END IF;
  -- Enum labels added in this transaction are visible to catalog queries here.
  IF (SELECT count(*) FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
       WHERE t.typname IN ('enum_payload_jobs_task_slug', 'enum_payload_jobs_log_task_slug')
         AND e.enumlabel IN ('ingram-stock-fetch', 'ingram-stock-apply')) <> 4 THEN
    RAISE EXCEPTION 'Verification failed: Ingram job slugs missing from the payload_jobs enums';
  END IF;
END
$do$;

COMMIT;

-- Optional check after COMMIT (expect six rows):
-- SELECT table_name, column_name, data_type, column_default
--   FROM information_schema.columns
--  WHERE (table_name = 'books_editions' AND column_name LIKE 'inventory_%ingram%')
--     OR (table_name = 'books_editions' AND column_name = 'inventory_available_to_order')
--     OR (table_name = 'orders_items' AND column_name = 'fulfillment_source')
--     OR (table_name = 'orders' AND column_name = 'needs_ingram_order')
--  ORDER BY table_name, column_name;
