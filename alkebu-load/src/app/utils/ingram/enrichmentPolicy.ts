// The spec's field-policy table ("Catalog enrichment from Ingram Titles Basic" > "Field
// policy") as data. Precedence: manual (staff) > Ingram > ISBNdb / Google / Open Library /
// CSV > empty, with two owner-directed exceptions, price uplift and title cleanup.
//
// Fields not listed here (stockLevel, categories, collections, images, slug, ...) are
// never touched: the diff only ever looks at keys in this table.
import type { EnrichmentField } from './enrichmentFields';

export type PolicyKind =
  /** Auto-apply when empty or when the current value came from a non-manual source. */
  | 'authoritative'
  /** Always written by the job (read-only in the admin). */
  | 'system'
  /** Price: raise to Ingram list when higher, never lower (see priceUplift). */
  | 'uplift'
  /** Title cleanup (see titleCleanup.ts): exact patterns apply, anything else is reviewed. */
  | 'title'
  /** Auto-apply only when empty; a different existing value goes to review. */
  | 'fill-gap'
  /** Differences always go to review; never auto-applied. */
  | 'review-only';

export const FIELD_POLICY: Readonly<Record<EnrichmentField, PolicyKind>> = {
  // Edition, objective
  'pricing.shippingWeight': 'authoritative',
  dimensions: 'authoritative',
  pages: 'authoritative',
  binding: 'authoritative',
  language: 'authoritative',
  datePublished: 'authoritative',
  // Edition, system
  mediaMailEligible: 'system',
  ingramOnSaleDate: 'system',
  // Edition, money
  'pricing.retailPrice': 'uplift',
  'pricing.wholesalePrice': 'fill-gap',
  // Book
  title: 'title',
  subtitle: 'title',
  publisherText: 'fill-gap',
  subjects: 'fill-gap',
  synopsis: 'fill-gap',
  description: 'fill-gap',
  excerpt: 'fill-gap',
  authorsText: 'review-only',
};

/** A price more than this multiple of the current one goes to review (data/unit errors). */
export const PRICE_UPLIFT_REVIEW_MULTIPLE = 3;

export type PriceAction = 'raise' | 'keep' | 'review';

/**
 * Owner directive 2026-10-02: raise a price to Ingram's US list price when that is higher;
 * never lower one. Consignment and locked editions, and a missing/zero Ingram price, keep.
 */
export function priceUplift({
  currentCents,
  ingramListCents,
  isConsignment = false,
  lockPrice = false,
}: {
  currentCents: number | null | undefined;
  ingramListCents: number | null | undefined;
  isConsignment?: boolean | null;
  lockPrice?: boolean | null;
}): { action: PriceAction; cents: number | null } {
  const current = Number.isFinite(Number(currentCents)) && Number(currentCents) > 0 ? Math.round(Number(currentCents)) : null;
  const ingram = Number.isFinite(Number(ingramListCents)) && Number(ingramListCents) > 0 ? Math.round(Number(ingramListCents)) : null;
  if (isConsignment || lockPrice || ingram === null) return { action: 'keep', cents: current };
  if (current === null) return { action: 'review', cents: ingram };
  if (ingram > current * PRICE_UPLIFT_REVIEW_MULTIPLE) return { action: 'review', cents: ingram };
  if (ingram > current) return { action: 'raise', cents: ingram };
  return { action: 'keep', cents: current };
}
