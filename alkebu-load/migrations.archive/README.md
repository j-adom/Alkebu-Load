# Archived migrations (pre-Phase 6)

These migration files were generated against SQLite during the project's
early SQLite-only dev phase. They were applied to production (Postgres)
before the Phase 6 snapshot regeneration on 2026-05-24.

They are kept here for historical reference only. They are no longer
imported by `src/migrations/index.ts` and will not run again. The
production `payload_migrations` table retains rows referencing these
filenames as the audit trail of what was applied.

The new snapshot (`src/migrations/20260524_052325_customer_foundation_phase6.json`)
captures the current Postgres schema as the diff baseline for all future
auto-generated migrations.
