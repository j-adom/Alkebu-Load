# Wellness photo and editor release

## Before deploying

- Include the product gallery, photography helper, four WebP assets, product-card change, health-and-beauty page change, two collection configuration changes, and `src/fields/collapsedVariations.ts`.
- Do not accidentally stage local `.impeccable/` cache/live files or `.codex/` hooks with the release.
- The Square-sync counter `lastRunSkippedNonBook` ships alongside this release. Production database prerequisites are verified as of 2026-09-27 (see evidence below). No further database update is needed for this release; do not rerun the DDL solely for deployment.

## Progress — 2026-09-27

### Completed

- Photo galleries, four enhanced WebP assets, product-card fallbacks, and collapsed variation editor configuration are implemented (commit `2eac4fb`). The Square counter and scoped schema script are committed in `8c09288`; subsequent index-handling corrections remain local at this checkpoint.
- Earlier validation passed: frontend production build, lint, 34 tests, and Svelte check (0 errors, 2 existing warnings); backend production build, type/script checks, and 401 tests. Gallery browser checks used local fixtures at desktop and mobile sizes, not published production products.
- Production database checks were run by the user in `psql` 17.9 against `alkebulan`. The latest results supersede the earlier missing-schema results:
  - No duplicate non-null `books.square_item_id` values.
  - `books_square_item_id_idx` is a UNIQUE btree index on `books.square_item_id`.
  - `square_sync_state`, `square_catalog_staging`, and `square_catalog_staging_validation_issues` exist.
  - `books.last_synced_at` is `timestamp with time zone`.
  - `payload_jobs.concurrency_key` is `character varying`.
  - `payload_locked_documents_rels.square_catalog_staging_id` is `integer`.
  - `square_sync_state.last_run_skipped_non_book` is `numeric`.
  - Both job enums (`enum_payload_jobs_task_slug` and `enum_payload_jobs_log_task_slug`) contain `square-catalog-sync` and `square-inventory-sync` (four matching rows).
- The scoped script, `alkebu-load/scripts/add-square-catalog-staging-schema.sql`, was additionally tested on disposable PostgreSQL 14 with a modeled pre-feature schema: apply, rerun, non-unique-index upgrade, duplicate refusal without schema changes, book-data preservation, and multiple null Square IDs passed. This was not a production dump or a live application integration test. The temporary server was stopped.
- The script now replaces an existing non-unique book index transactionally and verifies uniqueness/validity rather than only index existence. Production already has the unique index, so this correction does not require another production DDL run.

### Still pending

- Review and commit the remaining migration-script/documentation corrections; push and redeploy are not confirmed at this checkpoint. Pushing `main` triggers Coolify deployment.
- Perform the authenticated production editor, gallery, and cart checks below.
- Review actual product descriptions, prices, stock, and packaged shipping weights before enabling Publish Online. Product publication has not been performed as part of this work.
- Square inventory regression verification and reconciliation/backfill remain separate pending release steps in the [Square implementation plan](../superpowers/plans/2026-09-25-square-catalog-staging.md#task-10-deploy-and-backfill--user-owned).


## Deployment and verification

1. Deploy the backend first. The collapsed editor configuration does not change stored product fields or require a product-data migration.
2. Open the Scented Oil editor while authenticated. Confirm the variation section starts closed and editing/saving a product photo works. Expand a variation and verify its fields. Existing row preferences can retain expanded rows; use Collapse All inside the section once if necessary.
3. Confirm the payment-provider endpoint still reports Stripe and build/deploy the storefront according to `docs/deployment.md`.
4. Verify both product galleries at desktop and mobile widths, select a scent/size, and check the matching cart SKU and price.
5. Keep Publish Online unchecked until the actual production descriptions, stock, prices, and packaged shipping weights are reviewed.

## Photos and follow-up

The bundled photos work without a Payload upload and can ship now. Moving them into Payload remains an editorial-management improvement, not a prerequisite for deploying this code. CMS hero/gallery images take priority; bundled photos currently remain as supporting gallery images. If the same photos are uploaded under new URLs, remove their bundled gallery entries to avoid duplicates. Review `docs/design/product-photography.md` for assets and AI-edit prompts.

Scent notes, family filters, and a separate Scents collection are follow-up work, not release requirements. An authenticated production editor performance check is still needed; local type/build checks do not establish a live speed improvement.
