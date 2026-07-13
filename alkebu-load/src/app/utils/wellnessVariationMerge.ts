/**
 * Merges Square-sourced wellness/oils variation data onto an EXISTING Payload
 * `variations[]` array, keyed on `squareVariationId`.
 *
 * Payload array fields do NOT row-reconcile on update -- when `variations` is present
 * in an update's `data`, the ENTIRE stored array is replaced. Rebuilding it fresh from
 * Square on every run (the importer's original behavior) silently resets `stock` (kept
 * live by the Square inventory webhook), drops `weight` (Shippo mis-rates shipping
 * without it), and wipes any staff-set `isAvailable` toggle. This function exists to
 * stop that: it starts from the EXISTING row for every variation Square still carries,
 * and overwrites only the fields Square actually owns.
 *
 * Square is the source of truth for: `price`, `sku`, `scent`, and `squareItemId` (where
 * the field exists on the collection -- OilsIncense.variations[] has no such field, and
 * the merge respects that by only touching it when the incoming row carries the key).
 *
 * Preserved from the existing row, NEVER overwritten: `stock`, `weight`, `isAvailable`,
 * `size`, `packaging`, `concentration`, `color`, `id` -- and anything else already on the
 * row that this importer does not own.
 *
 * A variation with no existing match is genuinely new in Square -- it is inserted as-is
 * (the caller is responsible for defaulting `stock: 0` and omitting `weight` on these,
 * matching CREATE-path behavior).
 *
 * A variation that exists in Payload but is no longer present in the incoming Square set
 * is NEVER deleted here -- it could be a staff-curated or manually-added row, and only a
 * human should decide to remove it. It is kept in `merged` (so it survives the write) and
 * also returned separately in `orphaned` so the caller can flag it for review (e.g.
 * "possibly discontinued").
 */

export interface MergeableVariation {
  sku: string;
  price: number;
  scent?: string | null;
  squareVariationId?: string | null;
  squareItemId?: string | null;
  stock?: number | null;
  weight?: number | null;
  isAvailable?: boolean | null;
  id?: string | null;
}

export interface MergeVariationsResult<T extends MergeableVariation> {
  merged: T[];
  added: number;
  updated: number;
  orphaned: T[];
}

export function mergeVariations<T extends MergeableVariation>(
  existing: T[],
  incoming: T[],
): MergeVariationsResult<T> {
  const existingByKey = new Map<string, T>();
  for (const row of existing) {
    if (row.squareVariationId) existingByKey.set(row.squareVariationId, row);
  }

  const incomingKeys = new Set<string>();
  for (const row of incoming) {
    if (row.squareVariationId) incomingKeys.add(row.squareVariationId);
  }

  let added = 0;
  let updated = 0;

  const mergedFromIncoming = incoming.map((inc): T => {
    const match = inc.squareVariationId ? existingByKey.get(inc.squareVariationId) : undefined;

    if (!match) {
      added += 1;
      return inc;
    }

    updated += 1;

    // Start from the EXISTING row (preserving stock/weight/isAvailable/size/packaging/
    // concentration/color/id) and overwrite only what Square owns.
    const overrides: Partial<MergeableVariation> = {
      price: inc.price,
      sku: inc.sku,
      scent: inc.scent,
      squareVariationId: inc.squareVariationId,
    };
    if ('squareItemId' in inc) {
      overrides.squareItemId = inc.squareItemId;
    }

    return { ...match, ...overrides };
  });

  // Present in Payload, absent from this Square pull -- keep the row, just flag it.
  const orphaned = existing.filter(
    (row) => !row.squareVariationId || !incomingKeys.has(row.squareVariationId),
  );

  return {
    merged: [...mergedFromIncoming, ...orphaned],
    added,
    updated,
    orphaned,
  };
}
