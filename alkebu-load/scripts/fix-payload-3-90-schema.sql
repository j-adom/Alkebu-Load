-- fix-payload-3-90-schema.sql — 2026-10-13 security upgrade (Payload 3.79 → 3.90.2)
--
-- Payload 3.90 adds stored fields that production Postgres doesn't have yet:
--   - auth collections (users, customers): `resetPasswordRequestedAt` (date)
--   - @payloadcms/storage-s3 upload collections (media): `_objectKey` (text)
-- (`hasAPIKey` on payload-mcp-api-keys is virtual and needs no column.)
--
-- Without these, reads of users/customers/media fail with Postgres 42703
-- ("column does not exist"), which breaks /admin login and media.
--
-- Apply BEFORE the 3.90 container starts serving traffic. Adding nullable
-- columns is backwards compatible, so 3.79 keeps working after this runs.
--
-- This script is IDEMPOTENT — every statement is guarded, safe to re-run.
--
-- Apply:  psql "$DATABASE_URI" -f scripts/fix-payload-3-90-schema.sql

  BEGIN;

  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reset_password_requested_at" timestamp(3) with time zone;
  ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "reset_password_requested_at" timestamp(3) with time zone;
  ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "_objectkey" varchar;

  COMMIT;
