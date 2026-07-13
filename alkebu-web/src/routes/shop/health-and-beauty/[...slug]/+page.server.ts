import { payloadGet, getRelatedProducts } from '$lib/server/payload';
import { buildProductJsonLd, buildSEOData } from '$lib/seo';
import { PUBLIC_SITE_URL } from '$env/static/public';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { is404Error } from '$lib/utils/errors';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
  const slug = params.slug;

  try {
    // Try to find product in wellness-lifestyle collection (primary)
    let product = null;
    let productType: 'wellness-lifestyle' | 'oils-incense' = 'wellness-lifestyle';

    // Curation gate: publishOnline must be true, or the product must be
    // unreachable — including by direct slug URL. Square carries bulk supply
    // SKUs and miscategorized items, so nothing reaches customers without a
    // human ticking the box in the admin.
    try {
      const wellnessResult = await payloadGet<any>(
        `/api/wellness-lifestyle?where[slug][equals]=${encodeURIComponent(slug)}&where[publishOnline][equals]=true&limit=1&depth=2`
      );
      if (wellnessResult.docs?.length > 0) {
        product = wellnessResult.docs[0];
        productType = 'wellness-lifestyle';
      }
    } catch (err) {
      // Product not found in wellness-lifestyle; fall through to oils-incense
    }

    if (!product) {
      // Try oils-incense collection for fragrance oils
      try {
        const searchResult = await payloadGet<any>(
          `/api/oils-incense?where[slug][equals]=${encodeURIComponent(slug)}&where[productType][in]=fragrance-oil&where[publishOnline][equals]=true&limit=1&depth=2`
        );
        if (searchResult.docs?.length > 0) {
          product = searchResult.docs[0];
          productType = 'oils-incense';
        }
      } catch (err2) {
        // Product not found in either collection
      }
    }

    if (!product) {
      throw error(404, 'Product not found');
    }

    // Fetch related products based on category
    const categories = product.categories || [];
    const relatedProducts = await getRelatedProducts(product.id, productType, categories, 6);

    const productName = product.name || product.title || 'Product';

    // Build breadcrumbs based on product type
    const categoryName = productType === 'wellness-lifestyle' ? 'Wellness & Lifestyle' : 'Essential Oils & Aromatherapy';
    const breadcrumbs = [
      { name: 'Home', url: `${PUBLIC_SITE_URL}/` },
      { name: 'Health & Beauty', url: `${PUBLIC_SITE_URL}/shop/health-and-beauty` },
      { name: categoryName, url: `${PUBLIC_SITE_URL}/shop/health-and-beauty?collection=${productType === 'wellness-lifestyle' ? 'wellness' : 'oils'}` },
      { name: productName, url: `${PUBLIC_SITE_URL}/shop/health-and-beauty/${slug}` }
    ];

    // Set strong edge caching (24 hours) with long stale window (7 days)
    setHeaders({
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800, stale-if-error=86400',
      'Vary': 'Accept-Encoding',
      // Surrogate keys for targeted purge
      'x-key': `product:${product.id},collection:${productType}${product.brand ? `,brand:${product.brand}` : ''}${product.categories?.length ? `,categories:${product.categories.join(',')}` : ''}`
    });

    // Build structured data
    const jsonLd = buildProductJsonLd(product, slug);

    // Build SEO data
    let description = product.seo?.description || product.shortDescription;
    if (!description) {
      if (productType === 'wellness-lifestyle') {
        description = `${productName} - Wellness and lifestyle product promoting natural health and wellbeing.`;
      } else {
        description = `${productName} - Premium essential oil featuring authentic scents for aromatherapy and therapeutic relaxation.`;
      }
    }

    const seoData = buildSEOData({
      title: product.seo?.title || productName,
      description,
      canonical: `${PUBLIC_SITE_URL}/shop/health-and-beauty/${slug}`,
      image: product.heroImage?.url || product.images?.[0]?.image?.url,
      imageAlt: `Image of ${productName}`,
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

    console.error('Error loading health & beauty product:', err);

    // Return error state
    throw error(500, 'Failed to load product');
  }
};