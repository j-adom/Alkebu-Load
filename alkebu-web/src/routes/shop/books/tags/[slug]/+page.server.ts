import { appendBookStorefrontFilters, payloadGet } from '$lib/server/payload';
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

    // Get books with this tag
    const booksParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      depth: '2',
      sort: sort,
      'where[tags.tag][equals]': tagName
    });

    const booksData = await payloadGet<any>(
      `/api/books?${appendBookStorefrontFilters(booksParams).toString()}`,
    );
    
    if (!booksData.totalDocs) {
      throw error(404, 'Tag not found');
    }

    // Featured books with this tag. Decorative, so a failure leaves the section empty
    // rather than failing the page.
    const featuredBooksData = await payloadGet<any>(
      `/api/books?${appendBookStorefrontFilters(new URLSearchParams({
        'where[tags.tag][equals]': tagName,
        'where[isFeatured][equals]': 'true',
        limit: '4',
        depth: '1',
      })).toString()}`,
    ).catch(() => ({ docs: [] }));

    // Build breadcrumbs
    const breadcrumbs = [
      { name: 'Home', url: `${PUBLIC_SITE_URL}/` },
      { name: 'Books', url: `${PUBLIC_SITE_URL}/shop/books` },
      { name: 'Tags', url: `${PUBLIC_SITE_URL}/shop/books/tags` },
      { name: tag.name, url: `${PUBLIC_SITE_URL}/shop/books/tags/${encodeURIComponent(tagName)}` }
    ];

    // Set strong edge caching (6 hours) with long stale window (24 hours)
    setHeaders({
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600, stale-if-error=86400',
      'Vary': 'Accept-Encoding',
      'x-key': `tag:${encodeURIComponent(tagName)},books-by-tag`
    });

    // Build SEO data
    const seoData = buildSEOData({
      title: `Books Tagged: ${tag.name}`,
      description: `Discover books tagged with "${tag.name}". Browse our collection of books related to ${tag.name} themes and topics.`,
      canonical: `${PUBLIC_SITE_URL}/shop/books/tags/${encodeURIComponent(tagName)}`,
      breadcrumbs,
      noIndex: page > 1
    });

    return {
      tag,
      books: booksData.docs || [],
      pagination: {
        page: booksData.page || 1,
        totalPages: booksData.totalPages || 1,
        hasNextPage: booksData.hasNextPage || false,
        hasPrevPage: booksData.hasPrevPage || false,
        totalDocs: booksData.totalDocs || 0
      },
      featuredBooks: featuredBooksData.docs || [],
      currentSort: sort,
      seo: seoData
    };
  } catch (err: unknown) {
    if (is404Error(err)) {
      throw err;
    }
    
    console.error('Error loading tag books:', err);
    
    throw error(500, 'Failed to load tag');
  }
};
