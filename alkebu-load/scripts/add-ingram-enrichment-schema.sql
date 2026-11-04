-- Ingram catalog enrichment schema (plan Phase 3, Task 18)
--   - books: subtitle, enrichment group (field provenance, last Ingram write, record date)
--   - books_editions: mediaMailEligible, ingramOnSaleDate, pricing.lockPrice
--   - enum_books_import_source: 'ingram'
--
-- APPLY TO PRODUCTION POSTGRES *BEFORE* DEPLOYING the branch that adds these fields.
-- Without the columns, Payload errors when it reads or writes books.
--
-- Hand-applied SQL, not a migration file, for the same reason as
-- add-square-catalog-staging-schema.sql: prod has no prodMigrations configured and the
-- last migration snapshot predates several hand-applied fixes.
--
-- Not hand-written: the DDL is drizzle-kit's diff between the Postgres schema Payload
-- builds for `main` and for this branch (both generated offline, no database), made
-- idempotent. Additive only: nullable/defaulted columns and one enum label. Nothing is
-- dropped, retyped or backfilled.
--
-- NOT YET RUN ANYWHERE: there was no disposable PostgreSQL available when this was
-- written. Before production, apply it to a disposable copy (apply, re-run as a no-op,
-- run the verify block) the way add-ingram-availability-schema.sql was tested.
--
-- Single transaction, all-or-nothing, idempotent (safe to re-run).
-- Requires PostgreSQL 12+ (ALTER TYPE ... ADD VALUE inside a transaction).

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- 0. Guards ------------------------------------------------------------------------------
DO $do$
BEGIN
  IF current_database() <> 'alkebulan' THEN
    RAISE EXCEPTION 'Connected to database "%", expected "alkebulan". Run \c alkebulan first.', current_database();
  END IF;
  IF current_setting('server_version_num')::int < 120000 THEN
    RAISE EXCEPTION 'PostgreSQL 12+ required, server is %', current_setting('server_version');
  END IF;
  IF to_regclass('public.books') IS NULL OR to_regclass('public.books_editions') IS NULL THEN
    RAISE EXCEPTION 'books / books_editions not found: this is not the Payload database';
  END IF;
  -- Task 5's columns must already exist (add-ingram-availability-schema.sql, applied 2026-10-03).
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'public' AND table_name = 'books_editions'
                    AND column_name = 'inventory_ingram_checked_at') THEN
    RAISE EXCEPTION 'Apply scripts/add-ingram-availability-schema.sql first';
  END IF;
END
$do$;

-- 1. Books (Task 18) ---------------------------------------------------------------------
ALTER TYPE public.enum_books_import_source ADD VALUE IF NOT EXISTS 'ingram';

ALTER TABLE "books" ADD COLUMN IF NOT EXISTS "subtitle" varchar;
ALTER TABLE "books" ADD COLUMN IF NOT EXISTS "enrichment_field_sources" jsonb;
ALTER TABLE "books" ADD COLUMN IF NOT EXISTS "enrichment_ingram_enriched_at" timestamp(3) with time zone;
ALTER TABLE "books" ADD COLUMN IF NOT EXISTS "enrichment_ingram_record_date" timestamp(3) with time zone;

ALTER TABLE "books_editions" ADD COLUMN IF NOT EXISTS "media_mail_eligible" boolean;
ALTER TABLE "books_editions" ADD COLUMN IF NOT EXISTS "ingram_on_sale_date" timestamp(3) with time zone;
ALTER TABLE "books_editions" ADD COLUMN IF NOT EXISTS "pricing_lock_price" boolean DEFAULT false;

-- 9. Verify (inside the transaction: any failure rolls everything back) ------------------
DO $do$
DECLARE
  missing text;
BEGIN
  SELECT string_agg(expected.tbl || '.' || expected.col || ' ' || expected.typ, ', ')
    INTO missing
    FROM (VALUES
      ('books', 'subtitle', 'character varying'),
      ('books', 'enrichment_field_sources', 'jsonb'),
      ('books', 'enrichment_ingram_enriched_at', 'timestamp with time zone'),
      ('books', 'enrichment_ingram_record_date', 'timestamp with time zone'),
      ('books_editions', 'media_mail_eligible', 'boolean'),
      ('books_editions', 'ingram_on_sale_date', 'timestamp with time zone'),
      ('books_editions', 'pricing_lock_price', 'boolean')
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
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
                  WHERE t.typname = 'enum_books_import_source' AND e.enumlabel = 'ingram') THEN
    RAISE EXCEPTION 'Verification failed: enum_books_import_source lacks ingram';
  END IF;
END
$do$;

COMMIT;

-- Optional read-only check after COMMIT (expect every row ok = true):
-- SELECT 'books.subtitle' AS check, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'books' AND column_name = 'subtitle') AS ok
-- UNION ALL SELECT 'books.enrichment_field_sources', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'books' AND column_name = 'enrichment_field_sources')
-- UNION ALL SELECT 'books_editions.pricing_lock_price', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'books_editions' AND column_name = 'pricing_lock_price')
-- UNION ALL SELECT 'import_source ingram', EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'enum_books_import_source' AND e.enumlabel = 'ingram');
