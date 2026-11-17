import { payloadGet } from '$lib/server/payload';
import { buildSEOData } from '$lib/seo';
import { PUBLIC_SITE_URL } from '$env/static/public';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { is404Error } from '$lib/utils/errors';

export const load: PageServerLoad = async ({ params, url, setHeaders }) => {
  // SvelteKit has already decoded the param; it is the tag text itself.
  const tagName = params.slug;
  const page = parseInt(url.searchParams.get('p') || '1');
  const sort = url.searchParams.get('sort') || '-createdAt';
  const limit = 24;

  try {
    // Tags are free text on each product (`tags[].tag`); there is no tags collection.
    const tag = { name: tagName, description: '' };

    // Get fashion/jewelry products with this tag
    const productsParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      depth: '2',
      sort: sort,
      'where[tags.tag][equals]': tagName
    });

    const productsData = await payloadGet<any>(`/api/fashion-jewelry?${productsParams.toString()}`);
    
    if (!productsData.totalDocs) {
      throw error(404, 'Tag not found');
    }

    // Featured products with this tag. Decorative, so a failure leaves the section empty
    // rather than failing the page.
    const featuredProductsData = await payloadGet<any>(
      `/api/fashion-jewelry?${new URLSearchParams({
        'where[tags.tag][equals]': tagName,
        'where[isFeatured][equals]': 'true',
        limit: '4',
        depth: '1',
      }).toString()}`,
    ).catch(() => ({ docs: [] }));

    // Build breadcrumbs
    const breadcrumbs = [
      { name: 'Home', url: `${PUBLIC_SITE_URL}/` },
      { name: 'Fashion & Jewelry', url: `${PUBLIC_SITE_URL}/shop/apparel` },
      { name: 'Tags', url: `${PUBLIC_SITE_URL}/shop/apparel/tags` },
      { name: tag.name, url: `${PUBLIC_SITE_URL}/shop/apparel/tags/${encodeURIComponent(tagName)}` }
    ];

    // Set strong edge caching (6 hours) with long stale window (24 hours)
    setHeaders({
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600, stale-if-error=86400',
      'Vary': 'Accept-Encoding',
      'x-key': `tag:${encodeURIComponent(tagName)},fashion-by-tag`
    });

    // Build SEO data
    const seoData = buildSEOData({
      title: `${tag.name} Fashion & Jewelry`,
      description: `Shop fashion and jewelry items tagged with "${tag.name}". Discover beautiful pieces related to ${tag.name} themes and styles.`,
      canonical: `${PUBLIC_SITE_URL}/shop/apparel/tags/${encodeURIComponent(tagName)}`,
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
    
    throw error(500, 'Failed to load tag');
  }
};