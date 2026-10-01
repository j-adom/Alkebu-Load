-- Square catalog staging schema (2026-09-27)
--
-- APPLY TO PRODUCTION POSTGRES *BEFORE* PUSHING main. The backend deploy registers the
-- square-catalog-staging collection, the squareSyncState global, and two new job tasks;
-- without these tables and enum values Payload will error on boot/first query.
--
-- This is plan Task 8 (docs/superpowers/plans/2026-09-25-square-catalog-staging.md),
-- delivered as hand-applied SQL rather than a Payload migration file: prod has no
-- prodMigrations configured, and the last migration snapshot (20260705) predates several
-- hand-applied fixes, so `migrate:create` would re-emit DDL prod already has.
--
-- Not hand-written: the statements below are drizzle-kit's diff between the Postgres
-- schema Payload generates at origin/main and at main + the uncommitted
-- lastRunSkippedNonBook counter, made idempotent. That diff was checked against the
-- plan's allow-list: on `books` it only adds last_synced_at and a UNIQUE index on
-- square_item_id. An existing non-unique index with that name is replaced atomically;
-- no product records, tables, or columns are dropped or retyped.
--
-- Supersedes scripts/add-square-sync-skipped-count.sql (that script assumed
-- square_sync_state already existed; it does not until this runs).
--
-- Single transaction, all-or-nothing, idempotent (safe to re-run).
-- Requires PostgreSQL 12+ (ALTER TYPE ... ADD VALUE inside a transaction).

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- 0. Guards ------------------------------------------------------------------------------
-- The July 11 patch reported success against the `postgres` maintenance DB. Refuse to run
-- anywhere that is not the Alkebu-Lan database.
DO $do$
BEGIN
  IF current_database() <> 'alkebulan' THEN
    RAISE EXCEPTION 'Connected to database "%", expected "alkebulan". Run \c alkebulan first.', current_database();
  END IF;
  IF current_setting('server_version_num')::int < 120000 THEN
    RAISE EXCEPTION 'PostgreSQL 12+ required, server is %', current_setting('server_version');
  END IF;
  IF to_regclass('public.books') IS NULL OR to_regclass('public.payload_jobs') IS NULL THEN
    RAISE EXCEPTION 'books / payload_jobs not found: this is not the Payload database';
  END IF;
END$do$;

-- The UNIQUE index on books.square_item_id fails if prod already holds duplicates
-- (empty strings count; NULLs do not). Fail early with the offending values.
DO $do$
DECLARE dupes text;
BEGIN
  SELECT string_agg(format('%L x%s (ids %s)', square_item_id, n, ids), '; ')
    INTO dupes
    FROM (
      SELECT square_item_id, count(*) AS n, string_agg(id::text, ',' ORDER BY id) AS ids
        FROM public.books
       WHERE square_item_id IS NOT NULL
       GROUP BY square_item_id
      HAVING count(*) > 1
    ) d;
  IF dupes IS NOT NULL THEN
    RAISE EXCEPTION 'Duplicate books.square_item_id values block the UNIQUE index: %', dupes;
  END IF;
END$do$;

-- 1. Enums -------------------------------------------------------------------------------
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_square_catalog_staging_review_status') THEN
    CREATE TYPE public.enum_square_catalog_staging_review_status
      AS ENUM ('needs-review', 'ready', 'promoted', 'rejected');
  END IF;
END$do$;

ALTER TYPE public.enum_payload_jobs_log_task_slug ADD VALUE IF NOT EXISTS 'square-catalog-sync';
ALTER TYPE public.enum_payload_jobs_log_task_slug ADD VALUE IF NOT EXISTS 'square-inventory-sync';
ALTER TYPE public.enum_payload_jobs_task_slug     ADD VALUE IF NOT EXISTS 'square-catalog-sync';
ALTER TYPE public.enum_payload_jobs_task_slug     ADD VALUE IF NOT EXISTS 'square-inventory-sync';

-- 2. New tables --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.square_catalog_staging (
  "id" serial PRIMARY KEY NOT NULL,
  "square_item_id" varchar NOT NULL,
  "square_catalog_version" varchar NOT NULL,
  "square_updated_at" timestamp(3) with time zone NOT NULL,
  "raw_item" jsonb NOT NULL,
  "review_status" public.enum_square_catalog_staging_review_status DEFAULT 'needs-review' NOT NULL,
  "promoted_book_id" integer,
  "proposed_title" varchar,
  "proposed_isbn" varchar,
  "proposed_price_cents" numeric,
  "last_seen_at" timestamp(3) with time zone NOT NULL,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.square_catalog_staging_validation_issues (
  "_order" integer NOT NULL,
  "_parent_id" integer NOT NULL,
  "id" varchar PRIMARY KEY NOT NULL,
  "field" varchar NOT NULL,
  "code" varchar NOT NULL,
  "detail" varchar,
  "variation_id" varchar
);

CREATE TABLE IF NOT EXISTS public.square_sync_state (
  "id" serial PRIMARY KEY NOT NULL,
  "catalog_synced_through" timestamp(3) with time zone,
  "last_run_at" timestamp(3) with time zone,
  "last_run_created" numeric DEFAULT 0,
  "last_run_updated" numeric DEFAULT 0,
  "last_run_staged" numeric DEFAULT 0,
  "last_run_unresolved" numeric DEFAULT 0,
  "last_run_skipped_non_book" numeric DEFAULT 0,
  "updated_at" timestamp(3) with time zone,
  "created_at" timestamp(3) with time zone
);
-- Covers a table created by an earlier partial apply without the newest counter.
ALTER TABLE public.square_sync_state
  ADD COLUMN IF NOT EXISTS "last_run_skipped_non_book" numeric DEFAULT 0;

-- 3. Columns on existing tables ----------------------------------------------------------
ALTER TABLE public.books                          ADD COLUMN IF NOT EXISTS "last_synced_at" timestamp(3) with time zone;
ALTER TABLE public.payload_jobs                   ADD COLUMN IF NOT EXISTS "concurrency_key" varchar;
ALTER TABLE public.payload_locked_documents_rels  ADD COLUMN IF NOT EXISTS "square_catalog_staging_id" integer;

-- 4. Foreign keys ------------------------------------------------------------------------
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'square_catalog_staging_validation_issues_parent_id_fk') THEN
    ALTER TABLE public.square_catalog_staging_validation_issues
      ADD CONSTRAINT square_catalog_staging_validation_issues_parent_id_fk
      FOREIGN KEY ("_parent_id") REFERENCES public.square_catalog_staging("id")
      ON DELETE cascade ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'square_catalog_staging_promoted_book_id_books_id_fk') THEN
    ALTER TABLE public.square_catalog_staging
      ADD CONSTRAINT square_catalog_staging_promoted_book_id_books_id_fk
      FOREIGN KEY ("promoted_book_id") REFERENCES public.books("id")
      ON DELETE set null ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payload_locked_documents_rels_square_catalog_staging_fk') THEN
    ALTER TABLE public.payload_locked_documents_rels
      ADD CONSTRAINT payload_locked_documents_rels_square_catalog_staging_fk
      FOREIGN KEY ("square_catalog_staging_id") REFERENCES public.square_catalog_staging("id")
      ON DELETE cascade ON UPDATE no action;
  END IF;
END$do$;

-- 5. Indexes -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS square_catalog_staging_validation_issues_order_idx
  ON public.square_catalog_staging_validation_issues USING btree ("_order");
CREATE INDEX IF NOT EXISTS square_catalog_staging_validation_issues_parent_id_idx
  ON public.square_catalog_staging_validation_issues USING btree ("_parent_id");
CREATE UNIQUE INDEX IF NOT EXISTS square_catalog_staging_square_item_id_idx
  ON public.square_catalog_staging USING btree ("square_item_id");
CREATE INDEX IF NOT EXISTS square_catalog_staging_review_status_idx
  ON public.square_catalog_staging USING btree ("review_status");
CREATE INDEX IF NOT EXISTS square_catalog_staging_promoted_book_idx
  ON public.square_catalog_staging USING btree ("promoted_book_id");
CREATE INDEX IF NOT EXISTS square_catalog_staging_updated_at_idx
  ON public.square_catalog_staging USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS square_catalog_staging_created_at_idx
  ON public.square_catalog_staging USING btree ("created_at");
-- IF NOT EXISTS alone would silently retain an older non-unique index.
-- The transaction restores that index if its unique replacement fails.
DO $do$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_index
    WHERE indexrelid = to_regclass('public.books_square_item_id_idx')
      AND indrelid = 'public.books'::regclass
      AND NOT indisunique
  ) THEN
    DROP INDEX public.books_square_item_id_idx;
  END IF;
END$do$;
CREATE UNIQUE INDEX IF NOT EXISTS books_square_item_id_idx
  ON public.books USING btree ("square_item_id");
CREATE INDEX IF NOT EXISTS payload_jobs_concurrency_key_idx
  ON public.payload_jobs USING btree ("concurrency_key");
CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_square_catalog_staging_id_idx
  ON public.payload_locked_documents_rels USING btree ("square_catalog_staging_id");

COMMIT;

-- 6. Verify (read-only; expect every row = true) -----------------------------------------
SELECT 'staging table'        AS check, to_regclass('public.square_catalog_staging') IS NOT NULL AS ok
UNION ALL SELECT 'issues table',     to_regclass('public.square_catalog_staging_validation_issues') IS NOT NULL
UNION ALL SELECT 'sync state table', to_regclass('public.square_sync_state') IS NOT NULL
UNION ALL SELECT 'skipped counter',  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'square_sync_state' AND column_name = 'last_run_skipped_non_book')
UNION ALL SELECT 'books.last_synced_at', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'books' AND column_name = 'last_synced_at')
UNION ALL SELECT 'books unique idx', EXISTS (SELECT 1 FROM pg_index WHERE indexrelid = to_regclass('public.books_square_item_id_idx') AND indrelid = 'public.books'::regclass AND indisunique AND indisvalid)
UNION ALL SELECT 'jobs concurrency', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payload_jobs' AND column_name = 'concurrency_key')
UNION ALL SELECT 'task slug enum',   EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'enum_payload_jobs_task_slug' AND e.enumlabel = 'square-inventory-sync');
