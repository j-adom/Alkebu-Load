import { getProductBySlug, getRelatedProducts } from '$lib/server/payload';
import { buildProductJsonLd, buildSEOData } from '$lib/seo';
import { PUBLIC_SITE_URL } from '$env/static/public';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { is404Error } from '$lib/utils/errors';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
  const slug = params.slug;

  try {
    const product = await getProductBySlug(slug, 'fashion-jewelry');

    if (!product) {
      throw error(404, 'Product not found');
    }

    // Use 'name' field from Payload (not 'title')
    const productName = product.name || product.title;
    const productDescription = product.shortDescription || product.description;

    // Fetch related products based on category
    const categories = product.category ? [product.category] : (product.categories || []);
    const relatedProducts = await getRelatedProducts(product.id, 'fashion-jewelry', categories, 6);

    // Build breadcrumbs
    const breadcrumbs = [
      { name: 'Home', url: `${PUBLIC_SITE_URL}/` },
      { name: 'Fashion & Jewelry', url: `${PUBLIC_SITE_URL}/shop/apparel` },
      { name: productName, url: `${PUBLIC_SITE_URL}/shop/apparel/${slug}` }
    ];

    // Set strong edge caching (24 hours) with long stale window (7 days)
    setHeaders({
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800, stale-if-error=86400',
      'Vary': 'Accept-Encoding',
      // Surrogate keys for targeted purge (brand is a string, categories are strings)
      'x-key': `product:${product.id}${product.brand ? `,brand:${product.brand}` : ''}${product.categories?.length ? `,categories:${product.categories.join(',')}` : ''}`
    });

    // Build structured data
    const jsonLd = buildProductJsonLd(product, slug);

    // Get first image from scrapedImageUrls or images
    const productImage = product.scrapedImageUrls?.[0]?.url || product.images?.[0]?.url;

    // Build SEO data
    const seoData = buildSEOData({
      title: productName,
      description: typeof productDescription === 'string' ? productDescription : `${productName} - Beautiful fashion and jewelry celebrating African culture and craftsmanship.`,
      canonical: `${PUBLIC_SITE_URL}/shop/apparel/${slug}`,
      image: productImage,
      imageAlt: `Image of ${productName}`,
      jsonLd,
      breadcrumbs
    });

    return {
      product,
      seo: seoData,
      relatedProducts,
    };
  } catch (err: unknown) {
    if (is404Error(err)) {
      throw err;
    }
    
    console.error('Error loading fashion product:', err);
    
    // Return error state
    throw error(500, 'Failed to load product');
  }
};