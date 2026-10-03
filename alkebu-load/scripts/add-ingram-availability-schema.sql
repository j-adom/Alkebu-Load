-- Ingram availability cache + manual vendor flag on book editions (plan Task 5)
--
-- APPLY TO PRODUCTION POSTGRES *BEFORE* DEPLOYING the branch that adds these Books fields.
-- Without the columns, Payload errors when it reads or writes books_editions.
--
-- Hand-applied SQL, not a migration file, for the same reason as
-- add-square-catalog-staging-schema.sql: prod has no prodMigrations configured and the
-- last migration snapshot predates several hand-applied fixes.
--
-- Additive only: four nullable/defaulted columns on books_editions. Nothing is dropped,
-- retyped or backfilled. Column names and types follow Payload's postgres naming for the
-- editions[].inventory group (inventory_stock_level numeric, booleans, timestamp(3) tz).
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
  IF to_regclass('public.books_editions') IS NULL THEN
    RAISE EXCEPTION 'books_editions not found: this is not the Payload database';
  END IF;
END
$do$;

-- 1. Columns -----------------------------------------------------------------------------
ALTER TABLE "books_editions" ADD COLUMN IF NOT EXISTS "inventory_ingram_on_hand" numeric;
ALTER TABLE "books_editions" ADD COLUMN IF NOT EXISTS "inventory_ingram_available" boolean DEFAULT false;
ALTER TABLE "books_editions" ADD COLUMN IF NOT EXISTS "inventory_ingram_checked_at" timestamp(3) with time zone;
ALTER TABLE "books_editions" ADD COLUMN IF NOT EXISTS "inventory_available_to_order" boolean DEFAULT false;

-- 2. Verify ------------------------------------------------------------------------------
DO $do$
DECLARE
  missing text;
BEGIN
  SELECT string_agg(expected.col || ' ' || expected.typ, ', ')
    INTO missing
    FROM (VALUES
      ('inventory_ingram_on_hand', 'numeric'),
      ('inventory_ingram_available', 'boolean'),
      ('inventory_ingram_checked_at', 'timestamp with time zone'),
      ('inventory_available_to_order', 'boolean')
    ) AS expected(col, typ)
    LEFT JOIN information_schema.columns c
      ON c.table_schema = 'public'
     AND c.table_name = 'books_editions'
     AND c.column_name = expected.col
     AND c.data_type = expected.typ
   WHERE c.column_name IS NULL;
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Verification failed, missing or wrong type: %', missing;
  END IF;
END
$do$;

COMMIT;

-- Optional check after COMMIT (expect four rows):
-- SELECT column_name, data_type, column_default
--   FROM information_schema.columns
--  WHERE table_name = 'books_editions' AND column_name LIKE 'inventory_%'
--  ORDER BY column_name;
