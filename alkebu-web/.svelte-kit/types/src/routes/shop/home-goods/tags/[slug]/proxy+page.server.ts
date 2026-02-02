// @ts-nocheck
import { payloadGet } from '$lib/server/payload';
import { buildSEOData } from '$lib/seo';
import { PUBLIC_SITE_URL } from '$env/static/public';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load = async ({ params, url, setHeaders }: Parameters<PageServerLoad>[0]) => {
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

    // Get incense products with this tag from oils-incense collection
    const incenseParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      depth: '2',
      sort: sort,
      'where[tags][in]': tag.id,
      'where[productType][in]': 'incense-pack,sage-bundle,palo-santo'
    });

    const incenseProducts = await payloadGet<any>(`/api/oils-incense?${incenseParams.toString()}`);
    
    // TODO: When art, imports, and home decor collections are added, 
    // include them in the search here as well

    // Build breadcrumbs
    const breadcrumbs = [
      { name: 'Home', url: `${PUBLIC_SITE_URL}/` },
      { name: 'Home Goods', url: `${PUBLIC_SITE_URL}/shop/home-goods` },
      { name: 'Tags', url: `${PUBLIC_SITE_URL}/shop/home-goods/tags` },
      { name: tag.name, url: `${PUBLIC_SITE_URL}/shop/home-goods/tags/${tagSlug}` }
    ];

    // Set strong edge caching (6 hours) with long stale window (24 hours)
    setHeaders({
      'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400, stale-if-error=86400',
      'Vary': 'Accept-Encoding',
      'x-key': `tag:${tag.id},home-goods-by-tag`
    });

    // Build SEO data
    const seoData = buildSEOData({
      title: `${tag.name} Home Goods`,
      description: `Shop home goods tagged with "${tag.name}". ${tag.description || `Discover incense, art, and home decor items related to ${tag.name}.`}`,
      canonical: `${PUBLIC_SITE_URL}/shop/home-goods/tags/${tagSlug}`,
      breadcrumbs,
      noIndex: page > 1
    });

    return {
      tag,
      products: incenseProducts.docs || [],
      pagination: {
        page: incenseProducts.page || 1,
        totalPages: incenseProducts.totalPages || 1,
        hasNextPage: incenseProducts.hasNextPage || false,
        hasPrevPage: incenseProducts.hasPrevPage || false,
        totalDocs: incenseProducts.totalDocs || 0
      },
      currentSort: sort,
      seo: seoData
    };
  } catch (err) {
    if (err?.status === 404) {
      throw err;
    }
    
    console.error('Error loading home goods products by tag:', err);
    
    setHeaders({
      'Cache-Control': 'public, s-maxage=300'
    });

    throw error(500, 'Failed to load tag');
  }
};