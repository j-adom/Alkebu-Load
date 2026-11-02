-- Wellness/oils variations: trackInventory column (2026-11-02)
--
-- APPLY TO PRODUCTION POSTGRES *BEFORE* THE BACKEND DEPLOYS. The deploy adds
-- variations[].trackInventory to wellness-lifestyle and oils-incense; without the column
-- every read of those collections fails with 42703 (undefined column).
--
-- Column names and types come from Payload's own Drizzle schema for this branch
-- (`payload generate:db-schema` with the Postgres adapter):
--   wellness_lifestyle_variations.track_inventory  boolean DEFAULT true
--   oils_incense_variations.track_inventory        boolean DEFAULT true
-- Nullable, like the other checkbox columns (is_available). ADD COLUMN ... DEFAULT true
-- fills every existing row with true (PostgreSQL 11+ does this without a table rewrite),
-- which is the "tracked" behavior the code had before. Nothing is dropped or retyped.
--
-- Next step: scripts/wellness-untracked-availability.ts sets the untracked rows.
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
  IF to_regclass('public.wellness_lifestyle_variations') IS NULL
     OR to_regclass('public.oils_incense_variations') IS NULL THEN
    RAISE EXCEPTION 'wellness_lifestyle_variations / oils_incense_variations not found: this is not the Payload database (or scripts/fix-wellness-schema.sql was never applied)';
  END IF;
END$do$;

-- 1. Columns -----------------------------------------------------------------------------
ALTER TABLE public.wellness_lifestyle_variations ADD COLUMN IF NOT EXISTS track_inventory boolean DEFAULT true;
ALTER TABLE public.oils_incense_variations       ADD COLUMN IF NOT EXISTS track_inventory boolean DEFAULT true;

COMMIT;

-- 2. Verify (read-only; expect every ok = true) ------------------------------------------
SELECT 'wellness_lifestyle_variations.track_inventory' AS check,
       EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'wellness_lifestyle_variations'
                  AND column_name = 'track_inventory' AND data_type = 'boolean'
                  AND column_default = 'true') AS ok
UNION ALL
SELECT 'oils_incense_variations.track_inventory',
       EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'oils_incense_variations'
                  AND column_name = 'track_inventory' AND data_type = 'boolean'
                  AND column_default = 'true')
UNION ALL
SELECT 'no NULL track_inventory rows',
       NOT EXISTS (SELECT 1 FROM public.wellness_lifestyle_variations WHERE track_inventory IS NULL)
       AND NOT EXISTS (SELECT 1 FROM public.oils_incense_variations WHERE track_inventory IS NULL);
