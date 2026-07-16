/**
 * Storefront product-page URL builder for emails and notifications.
 *
 * The paths here MUST mirror the SvelteKit routes in
 * alkebu-web/src/routes/shop — there is no shared route manifest, so a
 * storefront route rename requires updating this mapping too.
 */

const getStorefrontBaseUrl = (): string => {
  const raw = process.env.PAYLOAD_PUBLIC_SITE_URL || 'https://alkebulanimages.com';
  return raw.replace(/\/+$/, '');
};

/**
 * Resolve the populated product document from a Payload polymorphic
 * relationship value ({ relationTo, value } | doc | id). Returns null when
 * the relation is unpopulated (a bare id) or missing.
 */
export function resolveRelatedProductDoc(relation: unknown): Record<string, unknown> | null {
  if (!relation || typeof relation !== 'object') return null;
  const rel = relation as Record<string, unknown>;
  const value = 'value' in rel ? rel.value : rel;
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

/**
 * Build the absolute storefront URL for a product, or undefined when the
 * product has no slug or the collection has no public detail page.
 */
export function buildProductPageUrl(
  collection: string | null | undefined,
  product: unknown,
): string | undefined {
  if (!product || typeof product !== 'object') return undefined;
  const doc = product as Record<string, unknown>;
  const slug = typeof doc.slug === 'string' && doc.slug ? doc.slug : null;
  if (!slug) return undefined;

  const encoded = encodeURIComponent(slug);
  let path: string | undefined;
  switch (collection) {
    case 'books':
      path = `/shop/books/${encoded}`;
      break;
    case 'wellness-lifestyle':
      path = `/shop/health-and-beauty/${encoded}`;
      break;
    case 'fashion-jewelry':
      path = `/shop/apparel/${encoded}`;
      break;
    case 'oils-incense':
      // Fragrance oils live under health-and-beauty; incense, sage and
      // palo santo under home-goods (see the storefront [...slug] loaders).
      path = doc.productType === 'fragrance-oil'
        ? `/shop/health-and-beauty/${encoded}`
        : `/shop/home-goods/${encoded}`;
      break;
    default:
      return undefined;
  }

  return `${getStorefrontBaseUrl()}${path}`;
}
