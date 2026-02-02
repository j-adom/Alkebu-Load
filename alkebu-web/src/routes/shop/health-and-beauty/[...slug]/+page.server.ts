import { getProductBySlug, payloadGet, getRelatedProducts } from '$lib/server/payload';
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

    try {
      product = await getProductBySlug(slug, 'wellness-lifestyle');
      productType = 'wellness-lifestyle';
    } catch (err) {
      // Try oils-incense collection for fragrance oils
      try {
        const searchResult = await payloadGet<any>(`/api/oils-incense?where[slug][equals]=${slug}&where[productType][in]=fragrance-oil&limit=1`);
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
    const categories = product.category ? [product.category] : (product.categories || []);
    const relatedProducts = await getRelatedProducts(product.id, productType, categories, 6);

    // Build breadcrumbs based on product type
    const categoryName = productType === 'wellness-lifestyle' ? 'Wellness & Lifestyle' : 'Essential Oils & Aromatherapy';
    const breadcrumbs = [
      { name: 'Home', url: `${PUBLIC_SITE_URL}/` },
      { name: 'Health & Beauty', url: `${PUBLIC_SITE_URL}/shop/health-and-beauty` },
      { name: categoryName, url: `${PUBLIC_SITE_URL}/shop/health-and-beauty?collection=${productType === 'wellness-lifestyle' ? 'wellness' : 'oils'}` },
      { name: product.title, url: `${PUBLIC_SITE_URL}/shop/health-and-beauty/${slug}` }
    ];

    // Set strong edge caching (24 hours) with long stale window (7 days)
    setHeaders({
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800, stale-if-error=86400',
      'Vary': 'Accept-Encoding',
      // Surrogate keys for targeted purge
      'x-key': `product:${product.id},collection:${productType}${product.brand ? `,brand:${product.brand.id}` : ''}${product.categories?.length ? `,categories:${product.categories.map((c: any) => c.id).join(',')}` : ''}`
    });

    // Build structured data
    const jsonLd = buildProductJsonLd(product, slug);

    // Build SEO data
    let description = product.seoDescription || product.description;
    if (!description) {
      if (productType === 'wellness-lifestyle') {
        description = `${product.title} - Wellness and lifestyle product promoting natural health and wellbeing.`;
      } else {
        description = `${product.title} - Premium essential oil featuring authentic scents for aromatherapy and therapeutic relaxation.`;
      }
    }

    const seoData = buildSEOData({
      title: product.titleLong || product.title,
      description,
      canonical: `${PUBLIC_SITE_URL}/shop/health-and-beauty/${slug}`,
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

    console.error('Error loading health & beauty product:', err);

    // Return error state
    setHeaders({
      'Cache-Control': 'public, s-maxage=300' // Short cache on error
    });

    throw error(500, 'Failed to load product');
  }
};