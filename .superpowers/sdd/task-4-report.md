# Task 4 Report: Partnership Pages SEO — JSON-LD, OpenGraph, canonical

## Files Changed

### `alkebu-web/src/lib/seo.ts`
- Added `buildPartnershipJsonLd(page)` at line ~241 (before `SEOData` interface)
- Emits a `@graph` with two nodes: `Service` (serviceType from a per-type map, provider = org, areaServed = US, url = canonical) and `Organization` (Alkebu-Lan Images)
- Pattern follows existing builders (`buildOrganizationJsonLd`, `buildEventJsonLd`) and uses `ldScript()` via `buildSEOData`'s `jsonLd` param

### `alkebu-web/src/lib/components/Meta.svelte`
- **OG audit**: `og:title`, `og:description`, `og:url`, `og:image` were already emitted. `og:type` was only emitted for products (`og:product`). Missing for regular pages.
- **Added**: `og:type=website` in the `{:else}` branch (emitted when no product price)
- **Added**: `noIndex` support → `<meta name="robots" content="noindex, nofollow" />`
- **Added**: `jsonLd` and `breadcrumbsJsonLd` props (flat and `metadata`-nested) rendered via `{@html}` in `<svelte:head>`
- **Bug fixed**: JSDoc comment had `<script>…</script>` literal which caused Svelte's parser to close the `<script>` block early (parse error). Changed to plain text description. Also removed HTML comments from inside `<svelte:head>` (Svelte does not support HTML comments there).

### `alkebu-web/src/routes/wholesale/+page.server.ts`
- Added `buildPartnershipJsonLd` import
- Added `image: page.hero.image` and `jsonLd: buildPartnershipJsonLd(page)` to `buildSEOData` call

### `alkebu-web/src/routes/institutional-contracts/+page.server.ts`
- Same as wholesale

### `alkebu-web/src/routes/non-profit-projects/+page.server.ts`
- Same as wholesale

### `alkebu-web/src/lib/components/Partnership/PartnershipLandingPage.svelte`
- Was building its own `metadata` object from `page.seo.*` fields (title, description only; no canonical, no JSON-LD)
- Now uses `data.seo` (the full `buildSEOData` result from the server) with fallback to the old local shape if `data.seo` is absent
- `<Meta metadata={...}>` now receives the canonical URL, og:image, JSON-LD, and all other SEO fields

## Meta already emitted OG?
Partial. `og:title`, `og:description`, `og:url`, `og:image` already existed. `og:type` was missing for non-product pages. This task added `og:type=website` and JSON-LD rendering.

## Gate results

### `npm run check` (gate criterion)
Exit code 2 with **40 pre-existing errors** — all `Module '"$env/static/public"' has no exported member 'PUBLIC_SITE_URL'` caused by missing `.env.local` in this worktree environment. Zero new errors introduced by this task. Baseline (stash test) confirmed identical 40 errors before my changes.

### `node --test alkebu-web/tests/partnership-pages.test.mjs`
```
# tests 3
# pass 3
# fail 0
```
All green.

### `npm run check:svelte`
After fixing the Meta.svelte parse bug: 40 errors remaining, all pre-existing env errors. Zero Svelte-specific errors from modified files.

## Concerns
- **Pre-existing `npm run check` failure**: The worktree has no `.env.local`, so all `PUBLIC_SITE_URL` imports fail type-check. This is infrastructure, not code. All 40 errors were present on the baseline commit.
- **`{@html}` in `<svelte:head>`**: This is the established pattern for JSON-LD in SvelteKit. The JSON-LD strings come from `ldScript()` which serializes with `JSON.stringify` — no user-controlled content reaches `{@html}` on these static partnership pages.
- The `PartnershipLandingPage.svelte` `metadata` fallback path (when `data.seo` is absent) preserves backward compatibility if the component is ever reused outside a route that runs `buildSEOData`.
