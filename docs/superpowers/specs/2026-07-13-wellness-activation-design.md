# Wellness Activation — Phase 1 Design

**Date:** 2026-07-13
**Status:** Approved, pending implementation plan
**Branch (proposed):** `feat/wellness-activation`

## Problem

The Health & Beauty storefront is fully built and serving zero products.

`/shop/health-and-beauty` has a complete SvelteKit loader (pagination, category
faceting, SEO, 6-hour edge caching) and a product detail route. Cart and Orders
already reference `wellness-lifestyle` and `oils-incense` polymorphically. But
both collections contain **zero documents in production**, and the shop index
card is hard-gated with `enabled: false`.

Meanwhile the category does **$245,362/year at the register** (12 months of
COMPLETED Square orders, 23,308 units across 548 distinct SKUs). The online
store's stated goal is $5–10k/month. Wellness is therefore roughly 2–4× the
entire online business being targeted, with no web presence at all.

This is not a feature build. It is a data pipeline, a schema gap, and a
curation problem.

## Findings that shaped this design

**1. The collections cannot currently be sold.**
`WellnessLifestyle` and `OilsIncense` have no `price`, `stock`, `weight`, or
`slug` field — not at the top level and not inside their `variations[]` arrays.
They were designed as *content* schemas (rich fields for `concentration`,
`scentFamily`, `sageBlend`) and never as *commerce* schemas. `FashionJewelry`,
which does work in production, has all four.

This is a **live latent bug**: both collections are already wired into the
polymorphic cart relationship, and `cartProductDetails.ts:141` resolves price as
`fashionVariation?.price ?? product?.price`. For a wellness product both are
`undefined`. Adding one to a cart today would price it at **$0.00**. It is
harmless only because the collections are empty. This design closes it.

**2. Supplier imagery is a dead end for the products that matter.**
Only 6% of the 912 items in the Square wellness tree have any image. The
instinct to source images from manufacturers fails on inspection: the revenue is
concentrated in *house-made* goods (whipped shea butters, house-blended scented
oils, local soaps). The national brands with downloadable product photos
(NOW Foods et al.) are the long tail, not the money. Photography is required.

**3. But far fewer photos than the SKU count implies.**
191 Phase 1 SKUs collapse to ~35 product pages, because 55 whipped shea butters
are the same tub in different scents and 104 scented oils are the same 1oz
bottle. One hero shot per product line plus a consistent scent-variant treatment
covers it.

**4. Square categories cannot be trusted as a publish signal.**
Filed under the wellness tree in Square: a **Mali Djembe** (a drum), a **Mud
Cloth Bucket Hat**, and a line item literally named **"Shipping"**. Square is
doing double duty as a POS and a supply-inventory ledger — it also carries bulk
and packaging SKUs ("25lb Box Shea Butter", "5 Gallon BPA Free Bottle w/no
Spout", "1oz Oil Bottle Diamond Cut - 2 Dozen") that must never appear online.
Curation must be a human gate, not a heuristic.

## Scope

**In — four house-made lines, $94,862/yr of proven demand across 191 SKUs:**

| Line | Revenue/yr | SKUs | Product pages | Variant axis |
|---|---|---|---|---|
| Whipped Shea Butter | $29,598 | 55 | 1 | scent |
| Scented Oil | $28,787 | 104 | 1 | scent |
| Soaps | $23,351 | 29 | ~29 | size (some) |
| Raw / Natural Butters | $13,125 | 3 | 3 | — |

All shelf-stable, all ship flat-rate, all house-made (best margin, most
differentiated, most on-brand), no health claims.

**Explicitly deferred to Phase 2, with reasons:**

- **Sea Moss ($34,323/yr — the single largest family).** Seamoss World Gel is a
  refrigerated perishable. Shipping it means cold packs, 2-day air, spoilage
  liability, and a returns policy that does not exist. Enormous in-store,
  genuinely hard online. It deserves its own project, not a footnote in this one.
- **Bitters & Tonics ($23,504/yr).** SKU names in this family include *AIH Blood
  Pressure*, *AIH Cholesterol Health Control*, *AIH Kidney Formula*, *Firm & Flat
  Tonic*, *Liver Health Capsules*, *20/20 Eye Tonic*. Selling these in person is
  one risk posture; publishing an indexed e-commerce page titled "Blood Pressure"
  with marketing copy is another — that is FDA/FTC territory (disease claims,
  DSHEA disclaimers). Tractable via renaming plus a compliance disclaimer, but it
  is a compliance workstream, not a launch-day task.

## Architecture

**Square remains the source of truth for price and stock. Payload owns what the
web needs and Square does not have: images, copy, slug, and the publish gate.**

Sync is strictly one-directional (Square → Payload). Nothing writes back to
Square. This keeps the POS authoritative and avoids an entire class of
write-conflict bugs.

```
Square Catalog ──import script (idempotent upsert)──> Payload wellness/oils
Square Inventory ──webhook──────────────────────────> variation.stock
                                                            │
                                      publishOnline gate ───┤ (human, default false)
                                                            v
                                              SvelteKit /shop/health-and-beauty
```

**`publishOnline` defaults to `false`.** Nothing reaches the storefront until a
human ticks the box. Given the djembe/bucket-hat/"Shipping" contamination above,
this is the load-bearing safety property of the whole design.

## Components

### 1. Schema — commerce fields on `WellnessLifestyle` + `OilsIncense`

Top level: `slug` (unique), `publishOnline` (checkbox, default `false`),
`heroImage` (upload), `scentFamily` (select — already on Oils, add to Wellness).

Inside `variations[]`: `price`, `stock`, `weight`, and `scent` (already present
on Wellness). Keep `squareVariationId` / `squareItemId`.

Delete the dead `medusaVariantId` field from both — Medusa was dropped from the
architecture and the field is unreferenced.

**One code path for both variant shapes.** A whipped shea butter is one document
with 55 variation rows; a Yadain bar soap is one document with one variation row;
Raw Black Soap is one document with two (LB, ½ LB). The `variations[]` array
already expresses all three. No branching required.

> ⚠️ **Price units are a live trap.** `cartProductDetails.ts:23` documents that
> book prices are stored in **cents** while apparel is stored in **dollars**.
> Wellness will be stored in **cents**, matching Square's `price_money.amount`
> exactly, and registered explicitly in the price normalizer — never inferred.
> Getting this wrong charges a customer $1,499 for a $14.99 shea butter.

### 2. Product-line grouping

An explicit, reviewed mapping table from Square item → product line → variant
label. Deliberately **a table, not a regex**: an exploratory regex pass during
research misfiled a djembe drum as a supplement. That failure mode is
unacceptable on a page that takes money.

### 3. Import script — `scripts/import-wellness-from-square.ts`

Idempotent upsert keyed on `squareItemId`. Seeds one document per product line
with a variation row per scent × size, carrying price, stock, and
`squareVariationId` from Square. Re-runnable; never sets `publishOnline`.

### 4. Cart price + weight resolution

Extend `cartProductDetails.ts` to resolve the chosen variation via
`identifiers.squareVariationId` and read its price and weight.

`CartItems.identifiers.squareVariationId` and `Orders.items.identifiers.squareVariationId`
**already exist** — variant selection rides the existing cart plumbing.
Carts and Orders need no schema change.

This component also closes the $0.00-price bug described above.

### 5. Stock sync

Extend the existing Square inventory webhook to update wellness/oils variation
stock by `squareVariationId`, alongside the existing books path.

### 6. Shipping weights

Shippo needs real weights or checkout mis-rates the shipment. Square is unlikely
to carry them, so: sensible defaults per packaging type (a 4oz jar ships ≈ 6oz
with packaging), overridable per variation. Mirrors the existing
`backfill-book-shipping-weights.ts` approach.

### 7. Storefront

Variant picker (scent, then size) on the product detail page. Scent-family filter
on the grid. Flip `enabled: true` on the Health & Beauty card in
`alkebu-web/src/routes/shop/+page.svelte`.

### 8. Admin curation view

Bulk-toggle `publishOnline`, with image coverage visible so staff can see at a
glance which products are blocked on a photo.

## Testing

TDD on the two pure functions that can silently lose money:

1. **Price normalization** — cents vs dollars, per collection. Table-driven,
   including the wellness-in-cents case and a regression guard against the
   apparel-in-dollars path.
2. **Variation resolution** — chosen scent → correct Square variation → correct
   price and stock. Including the miss case (unknown `squareVariationId` must
   fail loudly, never default to `0`).

Then an end-to-end checkout of a wellness item against `sk_test_dummy`, and a
verification that an unpublished product is not reachable from the storefront.

## Sequencing

Components 1–6 are backend and need **no photography**. Photography can proceed
in parallel; the schema will be waiting for the images. The only step blocked on
the camera is the final `publishOnline` flip.

Suggested order: schema → cart resolution (closes the live bug) → import →
stock sync → weights → storefront → admin curation.

## Open questions

- Free-shipping threshold interaction: wellness baskets are smaller than book
  baskets. Confirm `FREE_SHIPPING_THRESHOLD` still makes sense for a $14.99 tub.
- Do soaps and butters need a Media-collection image-size story before launch?
  The Media collection has no `imageSizes` (raw originals only), so product
  photos must be pre-optimized before upload.
