/**
 * Poured-to-order oils (Scented Oil): any scent goes into any bottle, so a variation is
 * sellable when its scent is in stock AND its bottle size is in stock. Staff keep two
 * short lists on the product (out-of-stock scents, out-of-stock sizes) instead of
 * toggling hundreds of scent x size rows. Pure.
 *
 * Every variation is derived and marked untracked: a poured size can't run out on its
 * own, so a tracking flag in Square (with its stock count) is a data-entry slip. Marking
 * it untracked here keeps the cart's stock check from refusing an in-stock scent.
 */

type Variation = {
  scent?: string | null;
  variantName?: string | null;
  trackInventory?: boolean | null;
  isAvailable?: boolean | null;
};

const key = (value?: string | null) => (value ?? '').trim().toLowerCase();

/**
 * The bottle size, or '' when the row has none. Square names that repeat the scent or say
 * "Regular" aren't sizes: the same rule as the storefront picker (alkebu-web variant.ts).
 */
export function pouredSizeKey(variation: Variation): string {
  const size = key(variation.variantName);
  return size === 'regular' || size === key(variation.scent) ? '' : size;
}

export type PouredLists = {
  unavailableScents?: Array<{ scent?: string | null }> | null;
  unavailableSizes?: Array<{ size?: string | null }> | null;
};

export function applyPouredAvailability<T extends Variation>(variations: T[], lists: PouredLists): T[] {
  const scentsOut = new Set((lists.unavailableScents ?? []).map((row) => key(row.scent)).filter(Boolean));
  const sizesOut = new Set((lists.unavailableSizes ?? []).map((row) => key(row.size)).filter(Boolean));
  return variations.map((variation) => {
    const size = pouredSizeKey(variation);
    // A row without a real size (a stray import) can't be poured, so it never sells.
    const isAvailable = size !== '' && !scentsOut.has(key(variation.scent)) && !sizesOut.has(size);
    return { ...variation, trackInventory: false, isAvailable };
  });
}

/** List entries that match no scent / no size on the product: typos staff should fix. */
export function unknownPouredNames(variations: Variation[], lists: PouredLists): { scents: string[]; sizes: string[] } {
  const scents = new Set(variations.map((v) => key(v.scent)).filter(Boolean));
  const sizes = new Set(variations.map(pouredSizeKey).filter(Boolean));
  return {
    scents: (lists.unavailableScents ?? []).map((row) => row.scent ?? '').filter((s) => s.trim() && !scents.has(key(s))),
    sizes: (lists.unavailableSizes ?? []).map((row) => row.size ?? '').filter((s) => s.trim() && !sizes.has(key(s))),
  };
}
