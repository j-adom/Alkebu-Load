// @ts-nocheck
import { payloadGet } from '$lib/server/payload';
import { buildSEOData } from '$lib/seo';
import { PUBLIC_SITE_URL } from '$env/static/public';
import { wellnessCollections, oilCollections } from '$lib/data/catalog';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load = async ({ params, url, setHeaders }: Parameters<PageServerLoad>[0]) => {
  const collectionSlug = params.slug;
  const page = parseInt(url.searchParams.get('p') || '1');
  const sort = url.searchParams.get('sort') || '-createdAt';
  const limit = 24;

  try {
    // Look up collection from field options (no separate categories collection)
    const allCollections = [...wellnessCollections, ...oilCollections];
    const collection = allCollections.find(c => c.slug === collectionSlug);
    
    if (!collection) {
      throw error(404, 'Collection not found');
    }

    // Get products in this collection from both wellness-lifestyle and oils-incense
    let allProducts = [];
    let totalDocs = 0;

    // Search wellness-lifestyle collection
    const wellnessParams = new URLSearchParams({
      page: page.toString(),
      limit: Math.ceil(limit / 2).toString(),
      depth: '2',
      sort: sort,
      'where[collections][in]': collection.slug
    });

    const wellnessProducts = await payloadGet<any>(`/api/wellness-lifestyle?${wellnessParams.toString()}`);
    allProducts = [...(wellnessProducts.docs || [])];
    totalDocs += wellnessProducts.totalDocs || 0;

    // Search oils-incense collection (only oils, not incense)
    const oilsParams = new URLSearchParams({
      page: page.toString(),
      limit: Math.ceil(limit / 2).toString(),
      depth: '2',
      sort: sort,
      'where[collections][in]': collection.slug,
      'where[productType][equals]': 'fragrance-oil'
    });

    const oilProducts = await payloadGet<any>(`/api/oils-incense?${oilsParams.toString()}`);
    allProducts = [...allProducts, ...(oilProducts.docs || [])];
    totalDocs += oilProducts.totalDocs || 0;

    // Build breadcrumbs
    const breadcrumbs = [
      { name: 'Home', url: `${PUBLIC_SITE_URL}/` },
      { name: 'Health & Beauty', url: `${PUBLIC_SITE_URL}/shop/health-and-beauty` },
      { name: 'Collections', url: `${PUBLIC_SITE_URL}/shop/health-and-beauty/collections` },
      { name: collection.name, url: `${PUBLIC_SITE_URL}/shop/health-and-beauty/collections/${collectionSlug}` }
    ];

    // Set strong edge caching (6 hours) with long stale window (24 hours)
    setHeaders({
      'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400, stale-if-error=86400',
      'Vary': 'Accept-Encoding',
      'x-key': `collection:${collection.slug},health-beauty-by-collection`
    });

    // Build SEO data
    const seoData = buildSEOData({
      title: `${collection.name} Health & Beauty`,
      description: `Shop our ${collection.name.toLowerCase()} health and beauty collection. ${collection.description || `Discover wellness products and essential oils in our ${collection.name} collection.`}`,
      canonical: `${PUBLIC_SITE_URL}/shop/health-and-beauty/collections/${collectionSlug}`,
      breadcrumbs,
      noIndex: page > 1
    });

    return {
      collection,
      products: allProducts,
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
  } catch (err) {
    if (err?.status === 404) {
      throw err;
    }
    
    console.error('Error loading health & beauty collection:', err);
    
    setHeaders({
      'Cache-Control': 'public, s-maxage=300'
    });

    throw error(500, 'Failed to load collection');
  }
};
