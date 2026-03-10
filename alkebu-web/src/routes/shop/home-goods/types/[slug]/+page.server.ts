import { payloadGet } from '$lib/server/payload';
import { buildSEOData } from '$lib/seo';
import { PUBLIC_SITE_URL } from '$env/static/public';
import { is404Error } from '$lib/utils/errors';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, url, setHeaders }) => {
  const typeSlug = params.slug;
  const page = parseInt(url.searchParams.get('p') || '1');
  const sort = url.searchParams.get('sort') || '-createdAt';
  const limit = 24;

  try {
    let products = [];
    let totalDocs = 0;
    let typeName = '';
    let typeDescription = '';

    if (typeSlug === 'incense') {
      // Get incense products from oils-incense collection
      const incenseParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        depth: '2',
        sort: sort,
        'where[productType][in]': 'incense-pack,sage-bundle,palo-santo'
      });

      const incenseData = await payloadGet<any>(`/api/oils-incense?${incenseParams.toString()}`);
      products = incenseData.docs || [];
      totalDocs = incenseData.totalDocs || 0;
      typeName = 'Incense & Aromatherapy';
      typeDescription = 'Premium incense for creating peaceful and aromatic atmospheres in your home.';

    } else if (typeSlug === 'art') {
      // Placeholder for art products - will be implemented when art collection is added
      typeName = 'African Art & Decor';
      typeDescription = 'Authentic African art pieces, sculptures, and decorative items celebrating cultural heritage.';
      products = [];
      totalDocs = 0;

    } else if (typeSlug === 'imports') {
      // Placeholder for import products - will be implemented when imports collection is added
      typeName = 'Cultural Imports';
      typeDescription = 'Unique cultural imports and traditional items from across the African diaspora.';
      products = [];
      totalDocs = 0;

    } else if (typeSlug === 'home') {
      // Placeholder for home decor products - will be implemented when home goods collection is added
      typeName = 'Home Decor';
      typeDescription = 'Beautiful home decor items and accessories celebrating African culture.';
      products = [];
      totalDocs = 0;

    } else {
      throw error(404, 'Product type not found');
    }

    // Build breadcrumbs
    const breadcrumbs = [
      { name: 'Home', url: `${PUBLIC_SITE_URL}/` },
      { name: 'Home Goods', url: `${PUBLIC_SITE_URL}/shop/home-goods` },
      { name: 'Types', url: `${PUBLIC_SITE_URL}/shop/home-goods/types` },
      { name: typeName, url: `${PUBLIC_SITE_URL}/shop/home-goods/types/${typeSlug}` }
    ];

    // Set strong edge caching (6 hours) with long stale window (24 hours)
    setHeaders({
      'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400, stale-if-error=86400',
      'Vary': 'Accept-Encoding',
      'x-key': `home-goods-type:${typeSlug}`
    });

    // Build SEO data
    const seoData = buildSEOData({
      title: `${typeName} Products`,
      description: typeDescription,
      canonical: `${PUBLIC_SITE_URL}/shop/home-goods/types/${typeSlug}`,
      breadcrumbs,
      noIndex: page > 1
    });

    return {
      type: {
        name: typeName,
        slug: typeSlug,
        description: typeDescription
      },
      products: products,
      pagination: {
        page: page,
        totalPages: Math.ceil(totalDocs / limit),
        hasNextPage: page < Math.ceil(totalDocs / limit),
        hasPrevPage: page > 1,
        totalDocs: totalDocs
      },
      currentSort: sort,
      seo: seoData
    };
  } catch (err: unknown) {
    if (is404Error(err)) {
      throw err;
    }
    
    console.error('Error loading home goods products by type:', err);
    
    throw error(500, 'Failed to load product type');
  }
};
