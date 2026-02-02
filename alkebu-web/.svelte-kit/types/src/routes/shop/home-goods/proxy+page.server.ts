// @ts-nocheck
import { payloadGet } from '$lib/server/payload';
import { buildSEOData } from '$lib/seo';
import { PUBLIC_SITE_URL } from '$env/static/public';
import { homeGoodsCategories } from '$lib/data/catalog';
import type { PageServerLoad } from './$types';

export const load = async ({ url, setHeaders }: Parameters<PageServerLoad>[0]) => {
  const page = parseInt(url.searchParams.get('page') || '1');
  const category = url.searchParams.get('category') || undefined;
  const collection = url.searchParams.get('collection') || undefined;
  const sort = url.searchParams.get('sort') || '-createdAt';
  const limit = 24;

  try {
    // Home goods includes incense from oils-incense collection plus other home categories
    let allProducts = [];
    let totalDocs = 0;

    // Get incense products from oils-incense collection
    const incenseParams = new URLSearchParams({
      page: page.toString(),
      limit: Math.ceil(limit / 2).toString(),
      depth: '2',
      sort: sort,
      'where[productType][in]': 'incense-pack,sage-bundle,palo-santo' // Filter for all incense types
    });

    if (category && category !== 'art' && category !== 'imports') {
      incenseParams.append('where[categories][in]', category);
    }

    // Get incense products
    const incenseProducts = await payloadGet<any>(`/api/oils-incense?${incenseParams.toString()}`);
    allProducts = [...(incenseProducts.docs || [])];
    totalDocs += incenseProducts.totalDocs || 0;

    // TODO: Add dedicated collections for art, imports, and home goods when available
    // For now, we'll prepare the structure for these collections
    
    // Set strong edge caching (6 hours) with long stale window (24 hours)
    setHeaders({
      'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400, stale-if-error=86400',
      'Vary': 'Accept-Encoding',
      // Surrogate key for targeted purge
      'x-key': `home-goods${category ? `,category:${category}` : ''}${collection ? `,collection:${collection}` : ''}`
    });

    // Build SEO data
    let title = 'Home Goods';
    let description = 'Transform your space with our home goods collection featuring incense, African art, cultural imports, and decorative items.';
    
    if (category === 'incense') {
      title = 'Incense & Aromatherapy';
      description = 'Create a peaceful atmosphere with our collection of premium incense and aromatherapy products.';
    } else if (category === 'art') {
      title = 'African Art & Decor';
      description = 'Discover authentic African art pieces, sculptures, and decorative items celebrating cultural heritage.';
    } else if (category === 'imports') {
      title = 'Cultural Imports';
      description = 'Explore unique cultural imports and traditional items from across the African diaspora.';
    } else if (category) {
      title = `${category} Home Goods`;
      description = `Browse our ${category.toLowerCase()} collection for your home and living space.`;
    }

    const seoData = buildSEOData({
      title,
      description,
      canonical: `${PUBLIC_SITE_URL}/shop/home-goods${category ? `?category=${encodeURIComponent(category)}` : ''}${collection ? `${category ? '&' : '?'}collection=${collection}` : ''}`,
      noIndex: page > 1 // Don't index pagination pages
    });

    return {
      products: allProducts,
      pagination: {
        page: page,
        totalPages: Math.ceil(totalDocs / limit),
        hasNextPage: page < Math.ceil(totalDocs / limit),
        hasPrevPage: page > 1,
        totalDocs: totalDocs
      },
      categories: homeGoodsCategories,
      collections: [
        { value: 'incense', label: 'Incense & Aromatherapy' },
        { value: 'art', label: 'African Art & Decor' },
        { value: 'imports', label: 'Cultural Imports' },
        { value: 'home', label: 'Home Decor' }
      ],
      currentCategory: category,
      currentCollection: collection,
      currentSort: sort,
      seo: seoData
    };
  } catch (error) {
    console.error('Error loading home goods:', error);
    
    // Return fallback data on error
    setHeaders({
      'Cache-Control': 'public, s-maxage=300' // Short cache on error
    });

    return {
      products: [],
      pagination: {
        page: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
        totalDocs: 0
      },
      categories: [],
      collections: [],
      currentCategory: category,
      currentCollection: collection,
      currentSort: sort,
      seo: buildSEOData({
        title: 'Home Goods',
        description: 'Transform your space with our home goods collection.',
        canonical: `${PUBLIC_SITE_URL}/shop/home-goods`,
        noIndex: false
      })
    };
  }
};
