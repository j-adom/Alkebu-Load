# Wellness photo and editor release

## Before deploying

- Include the product gallery, photography helper, four WebP assets, product-card change, health-and-beauty page change, two collection configuration changes, and `src/fields/collapsedVariations.ts`.
- Do not accidentally stage local `.impeccable/` cache/live files or `.codex/` hooks with the release.
- The Square-sync counter `lastRunSkippedNonBook` ships alongside this release. Its column, and the rest of the Square catalog staging schema, were applied to production on 2026-09-27 via `alkebu-load/scripts/add-square-catalog-staging-schema.sql` (all verify checks passed). No further database step is required for this release.

## Deployment and verification

1. Deploy the backend first. The collapsed editor configuration does not change stored product fields or require a product-data migration.
2. Open the Scented Oil editor while authenticated. Confirm the variation section starts closed and editing/saving a product photo works. Expand a variation and verify its fields. Existing row preferences can retain expanded rows; use Collapse All inside the section once if necessary.
3. Confirm the payment-provider endpoint still reports Stripe and build/deploy the storefront according to `docs/deployment.md`.
4. Verify both product galleries at desktop and mobile widths, select a scent/size, and check the matching cart SKU and price.
5. Keep Publish Online unchecked until the actual production descriptions, stock, prices, and packaged shipping weights are reviewed.

## Photos and follow-up

The bundled photos work without a Payload upload and can ship now. Moving them into Payload remains an editorial-management improvement, not a prerequisite for deploying this code. CMS hero/gallery images take priority; bundled photos currently remain as supporting gallery images. If the same photos are uploaded under new URLs, remove their bundled gallery entries to avoid duplicates. Review `docs/design/product-photography.md` for assets and AI-edit prompts.

Scent notes, family filters, and a separate Scents collection are follow-up work, not release requirements. An authenticated production editor performance check is still needed; local type/build checks do not establish a live speed improvement.
