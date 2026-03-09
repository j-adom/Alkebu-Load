import { payloadGet } from '$lib/server/payload';
import { buildSEOData } from '$lib/seo';
import { PUBLIC_SITE_URL } from '$env/static/public';
import { is404Error } from '$lib/utils/errors';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, url, setHeaders }) => {
  const tagSlug = decodeURIComponent(params.slug);
  const page = parseInt(url.searchParams.get('p') || '1');
  const sort = url.searchParams.get('sort') || '-createdAt';
  const limit = 24;

  try {
    // Get tag information
    const tagsData = await payloadGet<any>(`/api/tags?where[slug][equals]=${tagSlug}&limit=1`);
    const tag = tagsData.docs?.[0];
    
    if (!tag) {
      throw error(404, 'Tag not found');
    }

    // Get products with this tag from both wellness-lifestyle and oils-incense (oils only)
    let allProducts = [];
    let totalDocs = 0;

    // Search wellness-lifestyle collection
    const wellnessParams = new URLSearchParams({
      page: page.toString(),
      limit: Math.ceil(limit / 2).toString(),
      depth: '2',
      sort: sort,
      'where[tags][in]': tag.id
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
      'where[tags][in]': tag.id,
      'where[productType][equals]': 'fragrance-oil'
    });

    const oilProducts = await payloadGet<any>(`/api/oils-incense?${oilsParams.toString()}`);
    allProducts = [...allProducts, ...(oilProducts.docs || [])];
    totalDocs += oilProducts.totalDocs || 0;

    // Build breadcrumbs
    const breadcrumbs = [
      { name: 'Home', url: `${PUBLIC_SITE_URL}/` },
      { name: 'Health & Beauty', url: `${PUBLIC_SITE_URL}/shop/health-and-beauty` },
      { name: 'Tags', url: `${PUBLIC_SITE_URL}/shop/health-and-beauty/tags` },
      { name: tag.name, url: `${PUBLIC_SITE_URL}/shop/health-and-beauty/tags/${tagSlug}` }
    ];

    // Set strong edge caching (6 hours) with long stale window (24 hours)
    setHeaders({
      'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400, stale-if-error=86400',
      'Vary': 'Accept-Encoding',
      'x-key': `tag:${tag.id},health-beauty-by-tag`
    });

    // Build SEO data
    const seoData = buildSEOData({
      title: `${tag.name} Health & Beauty Products`,
      description: `Shop health and beauty products tagged with "${tag.name}". ${tag.description || `Discover wellness products and essential oils related to ${tag.name}.`}`,
      canonical: `${PUBLIC_SITE_URL}/shop/health-and-beauty/tags/${tagSlug}`,
      breadcrumbs,
      noIndex: page > 1
    });

    return {
      tag,
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
  } catch (err: unknown) {
    if (is404Error(err)) {
      throw err;
    }
    
    console.error('Error loading health & beauty products by tag:', err);
    
    setHeaders({
      'Cache-Control': 'public, s-maxage=300'
    });

    throw error(500, 'Failed to load tag');
  }
};
