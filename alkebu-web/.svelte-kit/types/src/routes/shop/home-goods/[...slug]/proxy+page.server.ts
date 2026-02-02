// @ts-nocheck
import { getProductBySlug, payloadGet, getRelatedProducts } from '$lib/server/payload';
import { buildProductJsonLd, buildSEOData } from '$lib/seo';
import { PUBLIC_SITE_URL } from '$env/static/public';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { is404Error } from '$lib/utils/errors';

export const load = async ({ params, setHeaders }: Parameters<PageServerLoad>[0]) => {
  const slug = params.slug;

  try {
    // Try to find product in oils-incense collection (for incense, sage, palo santo)
    let product = null;
    let productType: 'oils-incense' | 'fashion-jewelry' = 'oils-incense';

    // Primary: oils-incense collection for incense items
    try {
      const searchResult = await payloadGet<any>(`/api/oils-incense?where[slug][equals]=${slug}&where[productType][in]=incense-pack,sage-bundle,palo-santo&limit=1`);
      if (searchResult.docs?.length > 0) {
        product = searchResult.docs[0];
        productType = 'oils-incense';
      }
    } catch (err) {
      // Continue to search other collections
    }

    // If not found, try fashion-jewelry for decorative home items
    if (!product) {
      try {
        product = await getProductBySlug(slug, 'fashion-jewelry');
        if (product) {
          productType = 'fashion-jewelry';
        }
      } catch (err) {
        // Product not found
      }
    }

    if (!product) {
      throw error(404, 'Home goods item not found');
    }

    // Fetch related products based on category
    const categories = product.category ? [product.category] : (product.categories || []);
    const relatedProducts = await getRelatedProducts(product.id, productType, categories, 6);

    // Build breadcrumbs
    const breadcrumbs = [
      { name: 'Home', url: `${PUBLIC_SITE_URL}/` },
      { name: 'Home Goods', url: `${PUBLIC_SITE_URL}/shop/home-goods` },
      { name: product.title, url: `${PUBLIC_SITE_URL}/shop/home-goods/${slug}` }
    ];

    // Set strong edge caching (24 hours) with long stale window (7 days)
    setHeaders({
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800, stale-if-error=86400',
      'Vary': 'Accept-Encoding',
      // Surrogate keys for targeted purge
      'x-key': `product:${product.id},home-goods,${productType}${product.categories?.length ? `,categories:${product.categories.map((c: any) => c.id).join(',')}` : ''}`
    });

    // Build structured data
    const jsonLd = buildProductJsonLd(product, slug);

    // Build SEO data
    let description = product.seoDescription || product.description;
    if (!description) {
      if (productType === 'oils-incense') {
        description = `${product.title} - Premium incense for creating a peaceful and aromatic atmosphere in your home.`;
      } else {
        description = `${product.title} - Beautiful home goods celebrating African culture and craftsmanship.`;
      }
    }

    const seoData = buildSEOData({
      title: product.titleLong || product.title,
      description,
      canonical: `${PUBLIC_SITE_URL}/shop/home-goods/${slug}`,
      image: product.images?.[0]?.url,
      imageAlt: `Image of ${product.title}`,
      jsonLd,
      breadcrumbs
    });

    return {
      product,
      productType,
      seo: seoData,
      relatedProducts,
    };
  } catch (err: unknown) {
    if (is404Error(err)) {
      throw err;
    }

    console.error('Error loading home goods product:', err);

    // Return error state
    setHeaders({
      'Cache-Control': 'public, s-maxage=300' // Short cache on error
    });

    throw error(500, 'Failed to load product');
  }
};