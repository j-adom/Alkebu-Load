-- Oils & Incense: poured-to-order availability (2026-11-02)
--
-- APPLY TO PRODUCTION POSTGRES *BEFORE* THE BACKEND DEPLOYS. The deploy adds
-- pouredToOrder, unavailableScents and unavailableSizes to oils-incense; without these
-- every read of that collection fails with 42703 / 42P01.
--
-- Names and types come from Payload's own Drizzle schema for this branch
-- (`payload generate:db-schema` with the Postgres adapter):
--   oils_incense.poured_to_order                  boolean DEFAULT false
--   oils_incense_unavailable_scents (_order, _parent_id -> oils_incense ON DELETE CASCADE, id, scent)
--   oils_incense_unavailable_sizes  (_order, _parent_id -> oils_incense ON DELETE CASCADE, id, size)
-- Additive only. Existing products get poured_to_order = false: nothing changes until
-- scripts/oils-poured-to-order.ts (or a person) turns it on for Scented Oil.
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
  IF to_regclass('public.oils_incense') IS NULL THEN
    RAISE EXCEPTION 'oils_incense not found: this is not the Payload database';
  END IF;
END$do$;

-- 1. Column and tables -------------------------------------------------------------------
ALTER TABLE public.oils_incense ADD COLUMN IF NOT EXISTS poured_to_order boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS public.oils_incense_unavailable_scents (
  _order integer NOT NULL,
  _parent_id integer NOT NULL,
  id varchar PRIMARY KEY,
  scent varchar,
  CONSTRAINT oils_incense_unavailable_scents_parent_id_fk
    FOREIGN KEY (_parent_id) REFERENCES public.oils_incense(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS oils_incense_unavailable_scents_order_idx ON public.oils_incense_unavailable_scents (_order);
CREATE INDEX IF NOT EXISTS oils_incense_unavailable_scents_parent_id_idx ON public.oils_incense_unavailable_scents (_parent_id);

CREATE TABLE IF NOT EXISTS public.oils_incense_unavailable_sizes (
  _order integer NOT NULL,
  _parent_id integer NOT NULL,
  id varchar PRIMARY KEY,
  size varchar,
  CONSTRAINT oils_incense_unavailable_sizes_parent_id_fk
    FOREIGN KEY (_parent_id) REFERENCES public.oils_incense(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS oils_incense_unavailable_sizes_order_idx ON public.oils_incense_unavailable_sizes (_order);
CREATE INDEX IF NOT EXISTS oils_incense_unavailable_sizes_parent_id_idx ON public.oils_incense_unavailable_sizes (_parent_id);

COMMIT;

-- 2. Verify (read-only; expect every ok = true) ------------------------------------------
SELECT 'oils_incense.poured_to_order' AS check,
       EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'oils_incense'
                  AND column_name = 'poured_to_order' AND data_type = 'boolean') AS ok
UNION ALL
SELECT 'oils_incense_unavailable_scents (4 columns)',
       (SELECT count(*) FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'oils_incense_unavailable_scents'
           AND column_name IN ('_order', '_parent_id', 'id', 'scent')) = 4
UNION ALL
SELECT 'oils_incense_unavailable_sizes (4 columns)',
       (SELECT count(*) FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'oils_incense_unavailable_sizes'
           AND column_name IN ('_order', '_parent_id', 'id', 'size')) = 4
UNION ALL
SELECT 'cascade foreign keys',
       (SELECT count(*) FROM pg_constraint
         WHERE conname IN ('oils_incense_unavailable_scents_parent_id_fk', 'oils_incense_unavailable_sizes_parent_id_fk')
           AND confdeltype = 'c') = 2;
