import { payloadGet } from '$lib/server/payload';
import { buildSEOData } from '$lib/seo';
import { PUBLIC_SITE_URL } from '$env/static/public';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { is404Error } from '$lib/utils/errors';

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

    // Get fashion/jewelry products with this tag
    const productsParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      depth: '2',
      sort: sort,
      'where[tags][in]': tag.id
    });

    const productsData = await payloadGet<any>(`/api/fashion-jewelry?${productsParams.toString()}`);
    
    // Get featured products with this tag
    const featuredProductsData = await payloadGet<any>(`/api/fashion-jewelry?where[tags][in]=${tag.id}&where[featured][equals]=true&limit=4&depth=1`);

    // Build breadcrumbs
    const breadcrumbs = [
      { name: 'Home', url: `${PUBLIC_SITE_URL}/` },
      { name: 'Fashion & Jewelry', url: `${PUBLIC_SITE_URL}/shop/apparel` },
      { name: 'Tags', url: `${PUBLIC_SITE_URL}/shop/apparel/tags` },
      { name: tag.name, url: `${PUBLIC_SITE_URL}/shop/apparel/tags/${tagSlug}` }
    ];

    // Set strong edge caching (6 hours) with long stale window (24 hours)
    setHeaders({
      'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400, stale-if-error=86400',
      'Vary': 'Accept-Encoding',
      'x-key': `tag:${tag.id},fashion-by-tag`
    });

    // Build SEO data
    const seoData = buildSEOData({
      title: `${tag.name} Fashion & Jewelry`,
      description: `Shop fashion and jewelry items tagged with "${tag.name}". ${tag.description || `Discover beautiful pieces related to ${tag.name} themes and styles.`}`,
      canonical: `${PUBLIC_SITE_URL}/shop/apparel/tags/${tagSlug}`,
      breadcrumbs,
      noIndex: page > 1
    });

    return {
      tag,
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
    
    console.error('Error loading fashion products by tag:', err);
    
    setHeaders({
      'Cache-Control': 'public, s-maxage=300'
    });

    throw error(500, 'Failed to load tag');
  }
};