import { formatCurrency } from '$lib/utils/currency';

export type ProductType = 'books' | 'wellness-lifestyle' | 'fashion-jewelry' | 'oils-incense';

/**
 * Common shape every product card renders, regardless of underlying collection.
 * Adding a new product type = adding one branch to `normalizeProduct`, not a new
 * card component. Type-specific richness (sizes, scents, editions) lives on the
 * detail page, not the grid card.
 */
export interface NormalizedProduct {
  productId: string | undefined;
  name: string;
  href: string;
  imageSource: any;
  priceLabel: string;
  comparePriceLabel: string | null;
  subtitle: string;
  badge: string | null;
  /** true → show the quick add-to-cart button; false → "Select options" (variants). */
  canAddDirectly: boolean;
  inStock: boolean;
  /** Tailwind aspect-ratio class for the cover frame. */
  aspectClass: string;
}

function defaultBasePath(productType: ProductType): string {
  switch (productType) {
    case 'books':
      return '/shop/books';
    case 'wellness-lifestyle':
      return '/shop/health-and-beauty';
    case 'fashion-jewelry':
      return '/shop/apparel';
    case 'oils-incense':
      return '/shop/home-goods';
  }
}

function resolveSlug(product: any): string {
  if (!product?.slug) return '';
  return typeof product.slug === 'string' ? product.slug : product.slug?.current || '';
}

function resolveImage(product: any): any {
  return (
    product?.heroImage ||
    product?.images?.[0]?.image ||
    product?.images?.[0] ||
    (product?.scrapedImageUrls?.[0]?.url ? { url: product.scrapedImageUrls[0].url } : null)
  );
}

export function normalizeProduct(
  product: any,
  productType: ProductType,
  basePath?: string
): NormalizedProduct {
  const slug = resolveSlug(product);
  const base = basePath || defaultBasePath(productType);
  let inStock = product?.inventory?.inStock !== false;

  let name = product?.title || product?.name || 'Untitled';
  let subtitle = '';
  const badge: string | null = null;
  let priceLabel = '';
  let priceCents = 0;
  let compareCents = 0;
  const href = slug ? `${base}/${slug}` : base;
  let aspectClass = 'aspect-[3/4]';
  // Apparel/jewelry pick a size/variant on the detail page, so the grid card
  // sends shoppers there ("Select options") rather than quick-adding.
  let canAddDirectly = inStock && productType !== 'fashion-jewelry';

  if (productType === 'books') {
    const primaryEdition =
      product?.editions?.find((e: any) => e?.isPrimary) || product?.editions?.[0] || {};
    const binding = (primaryEdition?.binding || product?.binding || '').toString();
    if (binding) name = `${name} (${binding})`;
    if (product?.authors?.length) {
      subtitle = 'by ' + product.authors.map((a: any) => a?.name || a).join(', ');
    }
    priceCents = product?.pricing?.retailPrice ?? primaryEdition?.pricing?.retailPrice ?? 0;
    compareCents = product?.pricing?.comparePrice ?? primaryEdition?.pricing?.comparePrice ?? 0;
    priceLabel = formatCurrency((priceCents || 0) / 100);

    // Link the canonical slug URL (not /slug/isbn) so all internal links and
    // the sitemap agree on one URL shape per book.
    aspectClass = 'aspect-[2/3]';
  } else if (productType === 'fashion-jewelry') {
    subtitle = (product?.brand?.name || product?.brand || product?.category || '').toString();
    const variations = Array.isArray(product?.variations) ? product.variations : [];
    if (variations.length > 0) {
      const prices = variations.map((v: any) => Number(v?.price) || 0).filter((p: number) => p > 0);
      const min = prices.length ? Math.min(...prices) : 0;
      priceLabel = (variations.length > 1 ? 'From ' : '') + formatCurrency(min);
    } else {
      priceCents = product?.pricing?.retailPrice ?? 0;
      priceLabel = formatCurrency((priceCents || 0) / 100);
    }
    compareCents = product?.pricing?.comparePrice ?? 0;
  } else {
    // wellness-lifestyle, oils-incense: price and stock live per-variation
    // (scent x size), not on the product itself — a scented oil's variations
    // span $5 (1/4 oz) to $25 (2 oz), so a single top-level price is wrong.
    name = product?.name || product?.title || 'Untitled';
    subtitle = Array.isArray(product?.categories) ? (product.categories[0] || '') : (product?.category || '');

    const variations = Array.isArray(product?.variations) ? product.variations : [];
    if (variations.length > 0) {
      const prices = variations
        .map((v: any) => Number(v?.price) || 0)
        .filter((p: number) => p > 0);
      const minCents = prices.length ? Math.min(...prices) : 0;
      priceCents = minCents;
      // Variation prices are in CENTS; formatCurrency expects dollars.
      priceLabel = (variations.length > 1 ? 'From ' : '') + formatCurrency(minCents / 100);

      inStock = variations.some((v: any) => (v?.stock ?? 0) > 0 && v?.isAvailable !== false);
      // A multi-variation product needs the picker on the detail page — the
      // grid card can't resolve which scent/size to add, so it must not
      // quick-add (that would add with no variationSku and the backend
      // throws rather than silently pricing at $0.00).
      canAddDirectly = inStock && variations.length === 1;
    } else {
      priceCents = product?.pricing?.retailPrice ?? product?.price ?? 0;
      priceLabel = formatCurrency((priceCents || 0) / 100);
    }

    compareCents = product?.pricing?.comparePrice ?? 0;
  }

  const comparePriceLabel =
    compareCents && compareCents > priceCents ? formatCurrency(compareCents / 100) : null;

  return {
    productId: product?.id || product?._id,
    name,
    href,
    imageSource: resolveImage(product),
    priceLabel,
    comparePriceLabel,
    subtitle,
    badge,
    canAddDirectly,
    inStock,
    aspectClass,
  };
}
