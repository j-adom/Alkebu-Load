-- Ingram catalog enrichment schema (plan Phase 3, Tasks 18, 20 and 21)
--   - books: subtitle, enrichment group (field provenance, last Ingram write, record date)
--   - books_editions: mediaMailEligible, ingramOnSaleDate, pricing.lockPrice
--   - enum_books_import_source: 'ingram'
--   - ingram_enrichment_log, ingram_enrichment_review (+ payload_locked_documents_rels links)
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
-- idempotent. Additive only: new tables, nullable/defaulted columns, enum types and labels,
-- indexes and foreign keys. Nothing is dropped, retyped or backfilled.
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

-- 2. Enrichment log and review queue (Task 20) --------------------------------------------
DO $do$
BEGIN
  IF to_regtype('public.enum_ingram_enrichment_log_target') IS NULL THEN
    CREATE TYPE "public"."enum_ingram_enrichment_log_target" AS ENUM ('payload', 'square');
  END IF;
  IF to_regtype('public.enum_ingram_enrichment_log_action') IS NULL THEN
    CREATE TYPE "public"."enum_ingram_enrichment_log_action" AS ENUM ('fill', 'correct', 'accept');
  END IF;
  IF to_regtype('public.enum_ingram_enrichment_review_state') IS NULL THEN
    CREATE TYPE "public"."enum_ingram_enrichment_review_state" AS ENUM ('pending', 'accepted', 'rejected', 'superseded');
  END IF;
END
$do$;

CREATE TABLE IF NOT EXISTS "ingram_enrichment_log" (
  "id" serial PRIMARY KEY NOT NULL,
  "book_id" integer,
  "field_path" varchar NOT NULL,
  "edition_isbn" varchar,
  "target" "enum_ingram_enrichment_log_target" DEFAULT 'payload' NOT NULL,
  "action" "enum_ingram_enrichment_log_action",
  "previous_value" jsonb,
  "new_value" jsonb,
  "previous_source" varchar,
  "square_object_id" varchar,
  "square_version" varchar,
  "ingram_record_date" timestamp(3) with time zone,
  "run_id" varchar NOT NULL,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "ingram_enrichment_review" (
  "id" serial PRIMARY KEY NOT NULL,
  "book_id" integer,
  "field_path" varchar NOT NULL,
  "path" varchar NOT NULL,
  "edition_isbn" varchar,
  "current_value" jsonb,
  "proposed_value" jsonb,
  "proposed_key" varchar,
  "state" "enum_ingram_enrichment_review_state" DEFAULT 'pending' NOT NULL,
  "reason" varchar,
  "run_id" varchar,
  "ingram_record_date" timestamp(3) with time zone,
  "reviewed_by_id" integer,
  "reviewed_at" timestamp(3) with time zone,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "ingram_enrichment_log_id" integer;
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "ingram_enrichment_review_id" integer;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ingram_enrichment_log_book_id_books_id_fk') THEN
    ALTER TABLE "ingram_enrichment_log" ADD CONSTRAINT "ingram_enrichment_log_book_id_books_id_fk"
      FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE set null ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ingram_enrichment_review_book_id_books_id_fk') THEN
    ALTER TABLE "ingram_enrichment_review" ADD CONSTRAINT "ingram_enrichment_review_book_id_books_id_fk"
      FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE set null ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ingram_enrichment_review_reviewed_by_id_users_id_fk') THEN
    ALTER TABLE "ingram_enrichment_review" ADD CONSTRAINT "ingram_enrichment_review_reviewed_by_id_users_id_fk"
      FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_ingram_enrichment_log_fk') THEN
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_ingram_enrichment_log_fk"
      FOREIGN KEY ("ingram_enrichment_log_id") REFERENCES "public"."ingram_enrichment_log"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_ingram_enrichment_review_fk') THEN
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_ingram_enrichment_review_fk"
      FOREIGN KEY ("ingram_enrichment_review_id") REFERENCES "public"."ingram_enrichment_review"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END
$do$;

CREATE INDEX IF NOT EXISTS "ingram_enrichment_log_book_idx" ON "ingram_enrichment_log" USING btree ("book_id");
CREATE INDEX IF NOT EXISTS "ingram_enrichment_log_field_path_idx" ON "ingram_enrichment_log" USING btree ("field_path");
CREATE INDEX IF NOT EXISTS "ingram_enrichment_log_square_object_id_idx" ON "ingram_enrichment_log" USING btree ("square_object_id");
CREATE INDEX IF NOT EXISTS "ingram_enrichment_log_run_id_idx" ON "ingram_enrichment_log" USING btree ("run_id");
CREATE INDEX IF NOT EXISTS "ingram_enrichment_log_updated_at_idx" ON "ingram_enrichment_log" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "ingram_enrichment_log_created_at_idx" ON "ingram_enrichment_log" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "ingram_enrichment_review_book_idx" ON "ingram_enrichment_review" USING btree ("book_id");
CREATE INDEX IF NOT EXISTS "ingram_enrichment_review_field_path_idx" ON "ingram_enrichment_review" USING btree ("field_path");
CREATE INDEX IF NOT EXISTS "ingram_enrichment_review_path_idx" ON "ingram_enrichment_review" USING btree ("path");
CREATE INDEX IF NOT EXISTS "ingram_enrichment_review_proposed_key_idx" ON "ingram_enrichment_review" USING btree ("proposed_key");
CREATE INDEX IF NOT EXISTS "ingram_enrichment_review_state_idx" ON "ingram_enrichment_review" USING btree ("state");
CREATE INDEX IF NOT EXISTS "ingram_enrichment_review_run_id_idx" ON "ingram_enrichment_review" USING btree ("run_id");
CREATE INDEX IF NOT EXISTS "ingram_enrichment_review_reviewed_by_idx" ON "ingram_enrichment_review" USING btree ("reviewed_by_id");
CREATE INDEX IF NOT EXISTS "ingram_enrichment_review_updated_at_idx" ON "ingram_enrichment_review" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "ingram_enrichment_review_created_at_idx" ON "ingram_enrichment_review" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_ingram_enrichment_log_id_idx" ON "payload_locked_documents_rels" USING btree ("ingram_enrichment_log_id");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_ingram_enrichment_review_i_idx" ON "payload_locked_documents_rels" USING btree ("ingram_enrichment_review_id");

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
      ('books_editions', 'pricing_lock_price', 'boolean'),
      ('ingram_enrichment_log', 'field_path', 'character varying'),
      ('ingram_enrichment_log', 'previous_value', 'jsonb'),
      ('ingram_enrichment_log', 'target', 'USER-DEFINED'),
      ('ingram_enrichment_review', 'proposed_key', 'character varying'),
      ('ingram_enrichment_review', 'state', 'USER-DEFINED'),
      ('payload_locked_documents_rels', 'ingram_enrichment_log_id', 'integer'),
      ('payload_locked_documents_rels', 'ingram_enrichment_review_id', 'integer')
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
-- UNION ALL SELECT 'log table', to_regclass('public.ingram_enrichment_log') IS NOT NULL
-- UNION ALL SELECT 'review table', to_regclass('public.ingram_enrichment_review') IS NOT NULL
-- UNION ALL SELECT 'import_source ingram', EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'enum_books_import_source' AND e.enumlabel = 'ingram');
