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
  isAvailable?: boolean;
}

const norm = (value?: string | null): string => (typeof value === 'string' ? value.trim() : '');

const isInStock = (variation: VariantOption): boolean =>
  (variation?.stock ?? 0) > 0 && variation?.isAvailable !== false;

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

  const sizes = Array.from(new Set(variations.map((v) => norm(v.variantName)).filter(Boolean)));
  const hasSizeAxis = sizes.length > 0;

  if (!hasScentAxis && !hasSizeAxis) return variations[0];

  const defaultScent = hasScentAxis
    ? (scents.find((s) => variations.some((v) => norm(v.scent) === s && isInStock(v))) ?? scents[0])
    : '';

  const pool = hasScentAxis ? variations.filter((v) => norm(v.scent) === defaultScent) : variations;

  if (!hasSizeAxis) {
    return pool.find(isInStock) ?? pool[0] ?? null;
  }

  const minPriceFor = (size: string): number => {
    const prices = variations
      .filter((v) => norm(v.variantName) === size)
      .map((v) => Number(v.price) || 0)
      .filter((p) => p > 0);
    return prices.length ? Math.min(...prices) : Number.POSITIVE_INFINITY;
  };
  const sizesByPrice = [...sizes].sort((a, b) => minPriceFor(a) - minPriceFor(b) || a.localeCompare(b));

  const defaultSize =
    sizesByPrice.find((sz) => pool.some((v) => norm(v.variantName) === sz && isInStock(v))) ??
    sizesByPrice.find((sz) => pool.some((v) => norm(v.variantName) === sz)) ??
    sizesByPrice[0];

  return pool.find((v) => norm(v.variantName) === defaultSize) ?? pool[0] ?? null;
}
