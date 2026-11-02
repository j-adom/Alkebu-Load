/**
 * A single row from a wellness-lifestyle / oils-incense product's
 * `variations[]` array. Two independent axes — `scent` and `variantName`
 * (Square's size label, e.g. "1 oz", "Roll-on") — combine to produce a
 * specific price and SKU; the backend (`cartProductDetails.ts`) resolves the
 * cart line's price by matching `customization.variationSku` back to
 * `variations[].sku`, so the picker and the cart payload must agree on the
 * exact `sku` string.
 */
export interface VariantOption {
  sku: string;
  scent?: string | null;
  variantName?: string | null;
  price: number; // cents — 1499 = $14.99
  stock?: number | null;
  weight?: number | null;
  squareVariationId?: string | null;
  isAvailable?: boolean | null;
  /** false when Square doesn't track this variation's stock; `stock` is then ignored. */
  trackInventory?: boolean | null;
}

export const norm = (value?: string | null): string => (typeof value === 'string' ? value.trim() : '');

/**
 * Purchasable = not switched off by staff, and either Square doesn't track
 * this variation's inventory (`trackInventory: false`, stock is meaningless)
 * or it has stock. Mirrors the backend's add-to-cart check
 * (`evaluateWellnessVariationStock` in alkebu-load cartOperations.ts).
 */
export const isInStock = (variation: VariantOption | null | undefined): boolean =>
  !!variation &&
  variation.isAvailable !== false &&
  (variation.trackInventory === false || (variation.stock ?? 0) > 0);

/**
 * The variation's size as a comparison key, or '' when it has no real size.
 * Square's variation name is often a copy of the scent ("Baby Powder") or the
 * placeholder "Regular" — the same rule the backend applies to order-line
 * labels (`cartProductDetails.ts`). Lower-cased so "Roll-On" and "Roll-on"
 * are one size.
 */
export function sizeKey(variation: VariantOption): string {
  const size = norm(variation.variantName).toLowerCase();
  return size === 'regular' || size === norm(variation.scent).toLowerCase() ? '' : size;
}

/** Distinct sizes, cheapest first, keyed by `sizeKey` with the first-seen spelling as the label. */
export function sizeOptions(variations: VariantOption[]): { key: string; label: string }[] {
  const labels = new Map<string, string>();
  for (const variation of variations) {
    const key = sizeKey(variation);
    if (key && !labels.has(key)) labels.set(key, norm(variation.variantName));
  }
  const minPriceFor = (key: string): number => {
    const prices = variations
      .filter((v) => sizeKey(v) === key)
      .map((v) => Number(v.price) || 0)
      .filter((p) => p > 0);
    return prices.length ? Math.min(...prices) : Number.POSITIVE_INFINITY;
  };
  return Array.from(labels, ([key, label]) => ({ key, label })).sort(
    (a, b) => minPriceFor(a.key) - minPriceFor(b.key) || a.key.localeCompare(b.key),
  );
}

/**
 * The size to select within one scent's variations: cheapest in stock, then
 * cheapest that exists. '' when none of the pool's rows has a real size, which
 * matches those rows by `sizeKey`.
 */
export function defaultSizeKey(sizeKeys: string[], pool: VariantOption[]): string {
  return (
    sizeKeys.find((key) => pool.some((v) => sizeKey(v) === key && isInStock(v))) ??
    sizeKeys.find((key) => pool.some((v) => sizeKey(v) === key)) ??
    ''
  );
}

/**
 * Picks the same "best" starting variation VariantPicker highlights by
 * default (cheapest in-stock size, of the first in-stock scent) — as a pure
 * function so a parent page can compute its initial price/state
 * synchronously, during SSR, instead of waiting on a post-mount effect from
 * the picker. Without this, the page's primary price display would render
 * $0.00 on the server (and briefly on first paint) before client-side JS
 * corrects it.
 */
export function resolveDefaultVariation(variations: VariantOption[]): VariantOption | null {
  if (!variations.length) return null;

  const scents = Array.from(new Set(variations.map((v) => norm(v.scent)).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b),
  );
  const hasScentAxis = scents.length > 0;

  const sizeKeys = sizeOptions(variations).map((size) => size.key);
  const hasSizeAxis = sizeKeys.length > 0;

  if (!hasScentAxis && !hasSizeAxis) return variations[0];

  const defaultScent = hasScentAxis
    ? (scents.find((s) => variations.some((v) => norm(v.scent) === s && isInStock(v))) ?? scents[0])
    : '';

  const pool = hasScentAxis ? variations.filter((v) => norm(v.scent) === defaultScent) : variations;

  if (!hasSizeAxis) {
    return pool.find(isInStock) ?? pool[0] ?? null;
  }

  const defaultSize = defaultSizeKey(sizeKeys, pool);
  return pool.find((v) => sizeKey(v) === defaultSize) ?? pool[0] ?? null;
}
