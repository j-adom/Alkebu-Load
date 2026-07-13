/**
 * Pure helpers for the sitemap route, kept framework-free so they can be
 * unit-tested with `node --test`.
 */

/**
 * Static storefront pages advertised in the sitemap. Paths must correspond to
 * real routes — production 404s here waste crawl budget.
 */
export const SITEMAP_STATIC_PAGES = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/shop', priority: '0.95', changefreq: 'daily' },
  { path: '/shop/books', priority: '0.9', changefreq: 'daily' },
  { path: '/shop/apparel', priority: '0.9', changefreq: 'daily' },
  { path: '/shop/health-and-beauty', priority: '0.9', changefreq: 'daily' },
  { path: '/shop/home-goods', priority: '0.9', changefreq: 'daily' },
  { path: '/blog', priority: '0.8', changefreq: 'daily' },
  { path: '/events', priority: '0.8', changefreq: 'daily' },
  { path: '/directory', priority: '0.7', changefreq: 'weekly' },
  { path: '/about', priority: '0.6', changefreq: 'monthly' },
  { path: '/contact', priority: '0.6', changefreq: 'monthly' },
  { path: '/return-policy', priority: '0.5', changefreq: 'monthly' },
  { path: '/privacy', priority: '0.4', changefreq: 'yearly' },
  { path: '/terms-of-service', priority: '0.4', changefreq: 'yearly' },
];

/**
 * Payload's REST API selects fields with bracket syntax
 * (`select[slug]=true`); the comma form (`select=slug,updatedAt`) is ignored
 * and returns id-only docs, which broke the sitemap in production.
 *
 * @returns {URLSearchParams}
 */
export function buildSitemapSelectParams() {
  return new URLSearchParams({
    limit: '5000',
    depth: '0',
    'select[slug]': 'true',
    'select[updatedAt]': 'true',
  });
}

/**
 * OilsIncense.productType is one of: fragrance-oil | incense-pack |
 * sage-bundle | palo-santo. This collection has NO `type` field (a prior bug
 * read `product.type`, which is always undefined, and every oils-incense URL
 * silently fell back to /shop/health-and-beauty). Fragrance oils render under
 * health-and-beauty; the rest (incense-pack/sage-bundle/palo-santo) render
 * under home-goods — matches the routing in
 * src/routes/shop/health-and-beauty/+page.server.ts and
 * src/routes/shop/home-goods/+page.server.ts.
 *
 * @param {string | undefined} productType
 * @returns {'home-goods' | 'health-and-beauty'}
 */
export function resolveOilsIncenseShopSection(productType) {
  const INCENSE_LIKE_PRODUCT_TYPES = new Set(['incense-pack', 'sage-bundle', 'palo-santo']);
  return INCENSE_LIKE_PRODUCT_TYPES.has(productType) ? 'home-goods' : 'health-and-beauty';
}

/**
 * Render one `<url>` element. Tolerates a missing/invalid lastmod (Payload
 * docs can lack `updatedAt` when a query misbehaves) instead of throwing and
 * collapsing the whole sitemap to the fallback.
 *
 * @param {string} url
 * @param {string | undefined} lastmod
 * @param {string} [priority]
 * @param {string} [changefreq]
 * @returns {string}
 */
export function sitemapUrlElement(url, lastmod, priority = '0.7', changefreq = 'weekly') {
  const parsed = lastmod ? new Date(lastmod) : new Date();
  const safeDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;

  return `
  <url>
    <loc>${url}</loc>
    <lastmod>${safeDate.toISOString().split('T')[0]}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}
