/**
 * Pure, framework-free (no `$lib/server` deps) so it can be imported from
 * both server code (load functions, the sitemap route) AND client-bundled
 * `.svelte` components. `$lib/server/*` modules cannot be imported from
 * client code -- SvelteKit's illegal-import guard rejects that at build time
 * -- so this logic lives here and `$lib/server/sitemapHelpers.js` re-exports
 * it for its existing server-only callers.
 *
 * OilsIncense.productType is one of: fragrance-oil | incense-pack |
 * sage-bundle | palo-santo. This collection has NO `type` field (a prior bug
 * read `product.type`, which is always undefined, and every oils-incense URL
 * silently fell back to /shop/health-and-beauty). Fragrance oils render under
 * health-and-beauty; the rest (incense-pack/sage-bundle/palo-santo) render
 * under home-goods -- matches the routing in
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
