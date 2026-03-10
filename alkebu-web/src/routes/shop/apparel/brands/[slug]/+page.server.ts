import { payloadGet } from '$lib/server/payload';
import { buildSEOData } from '$lib/seo';
import { PUBLIC_SITE_URL } from '$env/static/public';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { is404Error } from '$lib/utils/errors';

export const load: PageServerLoad = async ({ params, url, setHeaders }) => {
  const brandSlug = params.slug;
  const page = parseInt(url.searchParams.get('p') || '1');
  const sort = url.searchParams.get('sort') || '-createdAt';
  const limit = 24;

  try {
    // Brand is stored as a string in FashionJewelry, not a relationship
    // Convert slug to brand name (e.g., "dw-appeal" -> "DW Appeal")
    const brandName = brandSlug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    // Get fashion/jewelry products from this brand
    const productsParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      depth: '1',
      sort: sort,
      'where[brand][equals]': brandName
    });

    const productsData = await payloadGet<any>(`/api/fashion-jewelry?${productsParams.toString()}`);

    if (!productsData.docs || productsData.docs.length === 0) {
      throw error(404, 'Brand not found');
    }

    // Get featured products from this brand
    const featuredProductsData = await payloadGet<any>(`/api/fashion-jewelry?where[brand][equals]=${brandName}&where[isFeatured][equals]=true&limit=4&depth=1`);

    // Create a simple brand object from the data we have
    const brand = {
      name: brandName,
      slug: brandSlug,
      description: null // We don't have a brands collection yet
    };

    // Build breadcrumbs
    const breadcrumbs = [
      { name: 'Home', url: `${PUBLIC_SITE_URL}/` },
      { name: 'Fashion & Jewelry', url: `${PUBLIC_SITE_URL}/shop/apparel` },
      { name: 'Brands', url: `${PUBLIC_SITE_URL}/shop/apparel/brands` },
      { name: brand.name, url: `${PUBLIC_SITE_URL}/shop/apparel/brands/${brandSlug}` }
    ];

    // Set strong edge caching (6 hours) with long stale window (24 hours)
    setHeaders({
      'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400, stale-if-error=86400',
      'Vary': 'Accept-Encoding',
      'x-key': `brand:${brandSlug},fashion-by-brand`
    });

    // Build SEO data
    const seoData = buildSEOData({
      title: `${brand.name} Fashion & Jewelry`,
      description: `Shop fashion and jewelry from ${brand.name}. ${brand.description || `Discover beautiful pieces from the ${brand.name} collection celebrating African culture and craftsmanship.`}`,
      canonical: `${PUBLIC_SITE_URL}/shop/apparel/brands/${brandSlug}`,
      breadcrumbs,
      noIndex: page > 1
    });

    return {
      brand,
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
    
    console.error('Error loading brand products:', err);
    
    throw error(500, 'Failed to load brand');
  }
};