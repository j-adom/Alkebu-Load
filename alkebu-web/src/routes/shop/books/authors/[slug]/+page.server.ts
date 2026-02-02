import { payloadGet } from '$lib/server/payload';
import { buildSEOData } from '$lib/seo';
import { PUBLIC_SITE_URL } from '$env/static/public';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { is404Error } from '$lib/utils/errors';

export const load: PageServerLoad = async ({ params, url, setHeaders }) => {
  const authorSlug = params.slug;
  const page = parseInt(url.searchParams.get('p') || '1');
  const sortParam = url.searchParams.get('sort') || 'newest';
  const sortMap: Record<string, string> = {
    'title-asc': 'title',
    'title-desc': '-title',
    'newest': '-createdAt',
    'oldest': 'createdAt'
  };
  const sort = sortMap[sortParam] || '-createdAt';
  const limit = 24;

  try {
    // Get author information
    const authorsData = await payloadGet<any>(`/api/authors?where[slug][equals]=${authorSlug}&limit=1`);
    const author = authorsData.docs?.[0];
    
    if (!author) {
      throw error(404, 'Author not found');
    }

    // Get books by this author
    const booksParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      depth: '2',
      sort: sort,
      'where[authors][in]': author.id
    });

    const booksData = await payloadGet<any>(`/api/books?${booksParams.toString()}`);
    
    // Build breadcrumbs
    const breadcrumbs = [
      { name: 'Home', url: `${PUBLIC_SITE_URL}/` },
      { name: 'Books', url: `${PUBLIC_SITE_URL}/shop/books` },
      { name: 'Authors', url: `${PUBLIC_SITE_URL}/shop/books/authors` },
      { name: author.name, url: `${PUBLIC_SITE_URL}/shop/books/authors/${authorSlug}` }
    ];

    // Set strong edge caching (6 hours) with long stale window (24 hours)
    setHeaders({
      'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400, stale-if-error=86400',
      'Vary': 'Accept-Encoding',
      'x-key': `author:${author.id},books-by-author`
    });

    // Build SEO data
    const seoData = buildSEOData({
      title: `Books by ${author.name}`,
      description: `Discover books by ${author.name}. ${author.bio || `Explore the literary works of ${author.name} celebrating African diaspora voices and culture.`}`,
      canonical: `${PUBLIC_SITE_URL}/shop/books/authors/${authorSlug}`,
      breadcrumbs,
      noIndex: page > 1
    });

    return {
      author,
      books: booksData.docs || [],
      pagination: {
        page: booksData.page || 1,
        totalPages: booksData.totalPages || 1,
        hasNextPage: booksData.hasNextPage || false,
        hasPrevPage: booksData.hasPrevPage || false,
        totalDocs: booksData.totalDocs || 0,
        limit
      },
      currentSort: sortParam,
      seo: seoData
    };
  } catch (err: unknown) {
    if (is404Error(err)) {
      throw err;
    }
    
    console.error('Error loading author books:', err);
    
    setHeaders({
      'Cache-Control': 'public, s-maxage=300'
    });

    throw error(500, 'Failed to load author');
  }
};
