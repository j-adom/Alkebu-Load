import { payloadGet } from '$lib/server/payload';
import { fashionCategories } from '$lib/data/catalog';
import { buildSEOData } from '$lib/seo';
import { PUBLIC_SITE_URL } from '$env/static/public';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { is404Error } from '$lib/utils/errors';

export const load: PageServerLoad = async ({ params, url, setHeaders }) => {
  const categorySlug = params.slug;
  const page = parseInt(url.searchParams.get('p') || '1');
  const sort = url.searchParams.get('sort') || '-createdAt';
  const limit = 24;

  try {
    // Look up category from static options (Payload does not have a categories collection)
    const category = fashionCategories.find(c => c.slug === categorySlug);
    
    if (!category) {
      throw error(404, 'Category not found');
    }

    // Get fashion/jewelry products in this category
    const productsParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      depth: '2',
      sort: sort,
      'where[categories][in]': category.slug
    });

    const productsData = await payloadGet<any>(`/api/fashion-jewelry?${productsParams.toString()}`);
    
    // Get featured products in this category
    const featuredProductsData = await payloadGet<any>(`/api/fashion-jewelry?where[categories][in]=${category.slug}&where[featured][equals]=true&limit=4&depth=1`);

    // Build breadcrumbs
    const breadcrumbs = [
      { name: 'Home', url: `${PUBLIC_SITE_URL}/` },
      { name: 'Fashion & Jewelry', url: `${PUBLIC_SITE_URL}/shop/apparel` },
      { name: 'Categories', url: `${PUBLIC_SITE_URL}/shop/apparel/categories` },
      { name: category.name, url: `${PUBLIC_SITE_URL}/shop/apparel/categories/${categorySlug}` }
    ];

    // Set strong edge caching (6 hours) with long stale window (24 hours)
    setHeaders({
      'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400, stale-if-error=86400',
      'Vary': 'Accept-Encoding',
      'x-key': `category:${category.slug},fashion-by-category`
    });

    // Build SEO data
    const seoData = buildSEOData({
      title: `${category.name} Fashion & Jewelry`,
      description: `Shop ${category.name.toLowerCase()} fashion and jewelry. ${category.description || `Discover beautiful ${category.name.toLowerCase()} pieces celebrating African culture and style.`}`,
      canonical: `${PUBLIC_SITE_URL}/shop/apparel/categories/${categorySlug}`,
      breadcrumbs,
      noIndex: page > 1
    });

    return {
      category,
      products: productsData.docs || [],
      pagination: {
        page: productsData.page || 1,
        totalPages: productsData.totalPages || 1,
        hasNextPage: productsData.hasNextPage || false,
        hasPrevPage: productsData.hasPrevPage || false,
        totalDocs: productsData.totalDocs || 0
      },
      featuredProducts: featuredProductsData.docs || [],
      currentSort: sort,
      seo: seoData
    };
  } catch (err: unknown) {
    if (is404Error(err)) {
      throw err;
    }
    
    console.error('Error loading category products:', err);
    
    throw error(500, 'Failed to load category');
  }
};
