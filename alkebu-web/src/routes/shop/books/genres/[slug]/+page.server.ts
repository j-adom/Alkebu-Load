import { payloadGet } from '$lib/server/payload';
import { buildSEOData } from '$lib/seo';
import { PUBLIC_SITE_URL } from '$env/static/public';
import { bookGenres } from '$lib/data/catalog';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { is404Error } from '$lib/utils/errors';

export const load: PageServerLoad = async ({ params, url, setHeaders }) => {
  const genreSlug = params.slug;
  const page = parseInt(url.searchParams.get('p') || '1');
  const sortParam = url.searchParams.get('sort') || 'newest';
  const limitParam = url.searchParams.get('limit') || '12';
  const limit = [12, 25, 100].includes(parseInt(limitParam)) ? parseInt(limitParam) : 12;

  // Map sort parameter to Payload field
  const sortMap: Record<string, string> = {
    'title-asc': 'title',
    'title-desc': '-title',
    'newest': '-createdAt',
    'oldest': 'createdAt'
  };
  const sort = sortParam && sortMap[sortParam] ? sortMap[sortParam] : '-createdAt';

  try {
    // Get genre information from configured options
    const genre = bookGenres.find(g => g.slug === genreSlug);

    if (!genre) {
      throw error(404, 'Genre not found');
    }

    // Get books in this genre
    const booksParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      depth: '2',
      sort: sort,
      'where[categories][in]': genre.slug
    });

    const booksData = await payloadGet<any>(`/api/books?${booksParams.toString()}`);

    // Get featured books in this genre
    const featuredBooksData = await payloadGet<any>(`/api/books?where[categories][in]=${genre.slug}&where[isFeatured][equals]=true&limit=4&depth=1`);

    // Get site settings global
    const settings = await payloadGet<any>('/api/globals/siteSettings?depth=1');

    // Build breadcrumbs
    const breadcrumbs = [
      { name: 'Home', url: `${PUBLIC_SITE_URL}/` },
      { name: 'Books', url: `${PUBLIC_SITE_URL}/shop/books` },
      { name: 'Genres', url: `${PUBLIC_SITE_URL}/shop/books/genres` },
      { name: genre.name, url: `${PUBLIC_SITE_URL}/shop/books/genres/${genreSlug}` }
    ];

    // Set strong edge caching (6 hours) with long stale window (24 hours)
    setHeaders({
      'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400, stale-if-error=86400',
      'Vary': 'Accept-Encoding',
      'x-key': `genre:${genre.slug},books-by-genre`
    });

    // Build SEO data
    const seoData = buildSEOData({
      title: `${genre.name} Books`,
      description: `Explore our collection of ${genre.name.toLowerCase()} books. ${genre.description || `Discover compelling ${genre.name.toLowerCase()} literature celebrating African diaspora voices.`}`,
      canonical: `${PUBLIC_SITE_URL}/shop/books/genres/${genreSlug}`,
      breadcrumbs,
      noIndex: page > 1
    });

    return {
      genre,
      books: booksData.docs || [],
      pagination: {
        page: booksData.page || 1,
        totalPages: booksData.totalPages || 1,
        hasNextPage: booksData.hasNextPage || false,
        hasPrevPage: booksData.hasPrevPage || false,
        totalDocs: booksData.totalDocs || 0,
        limit
      },
      featuredBooks: featuredBooksData.docs || [],
      categories: bookGenres,
      currentSort: sortParam,
      settings: settings || {},
      seo: seoData
    };
  } catch (err: unknown) {
    if (is404Error(err)) {
      throw err;
    }
    
    console.error('Error loading genre books:', err);
    
    setHeaders({
      'Cache-Control': 'public, s-maxage=300'
    });

    throw error(500, 'Failed to load genre');
  }
};
