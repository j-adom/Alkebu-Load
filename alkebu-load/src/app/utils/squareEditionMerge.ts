/**
 * Merges Square catalog data onto an EXISTING Books `editions[]` array, keyed on
 * `squareVariationId`.
 *
 * Payload array fields do NOT row-reconcile on update -- when `editions` is present in
 * an update's `data`, the ENTIRE stored array is replaced. Rebuilding it fresh from
 * Square on every run (the importer's original behavior) silently destroys curated
 * metadata (publisher, dimensions, stripePriceId, ...) and resets `inventory.stockLevel`
 * (kept live by the separate Square inventory webhook). This function exists to stop
 * that: it starts from the EXISTING row for every edition Square still carries, and
 * overwrites only the fields Square actually owns.
 *
 * Square owns: whether a variation exists, `squareVariationId`, `isbn`, and
 * `pricing.retailPrice`.
 *
 * Payload owns everything else on an edition -- `isbn10`, `publisher`, `publisherText`,
 * `datePublished`, `binding`, `edition`, `pages`, `language`, `dimensions`,
 * `stripePriceId`, `pricing.shippingWeight`, and the entire `inventory` group (including
 * `stockLevel`) -- and it is never touched here.
 *
 * `pricing` and `inventory` are nested groups, so they are merged field by field rather
 * than replaced wholesale; a naive top-level spread of an incoming `pricing` object would
 * clobber `shippingWeight` while setting `retailPrice`.
 *
 * An incoming field whose value is `undefined` never overwrites a populated existing
 * value -- a thin Square payload is missing data, not asserting emptiness.
 *
 * An existing edition with no `squareVariationId` was hand-entered and is not Square's to
 * modify -- it is left byte-identical, never matched, never removed.
 *
 * An existing Square-linked edition that is absent from the incoming array is NEVER
 * deleted -- deleting it would lose curated metadata and stock. It is kept with
 * `isAvailable: false` and every other field untouched.
 *
 * This function produces a correct merged array only. It does not make concurrent writes
 * safe -- two callers racing to update the same book's `editions[]` is a separate concern
 * (an exclusive job-queue key), out of scope here.
 */

export function mergeEditions(existing: any[], incoming: any[]): any[] {
  const existingByVariationId = new Map<string, any>();
  for (const row of existing ?? []) {
    if (row?.squareVariationId) existingByVariationId.set(row.squareVariationId, row);
  }

  const incomingVariationIds = new Set<string>();
  for (const row of incoming ?? []) {
    if (row?.squareVariationId) incomingVariationIds.add(row.squareVariationId);
  }

  const mergedFromIncoming = (incoming ?? []).map((inc) => {
    const match = inc?.squareVariationId ? existingByVariationId.get(inc.squareVariationId) : undefined;

    if (!match) {
      // Genuinely new in Square -- no curated row exists to protect.
      return inc;
    }

    return {
      ...match,
      squareVariationId: inc.squareVariationId ?? match.squareVariationId,
      isbn: inc.isbn !== undefined ? inc.isbn : match.isbn,
      pricing: {
        ...match.pricing,
        retailPrice:
          inc.pricing?.retailPrice !== undefined ? inc.pricing.retailPrice : match.pricing?.retailPrice,
      },
      isAvailable: true,
    };
  });

  // Present in Payload with a Square link, absent from this Square pull -- keep every
  // field, just flag it unavailable. Never delete.
  const missingFromIncoming = (existing ?? []).filter(
    (row) => row?.squareVariationId && !incomingVariationIds.has(row.squareVariationId),
  );
  const flaggedUnavailable = missingFromIncoming.map((row) => ({ ...row, isAvailable: false }));

  // Hand-entered rows with no Square link at all -- not Square's to touch, ever.
  const unlinked = (existing ?? []).filter((row) => !row?.squareVariationId);

  return [...mergedFromIncoming, ...flaggedUnavailable, ...unlinked];
}
