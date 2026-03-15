import { payloadGet, getProducts } from '$lib/server/payload';
import { bookGenres } from '$lib/data/catalog';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, setHeaders }) => {
  const pageParam = url.searchParams.get('p') || url.searchParams.get('page') || '1';
  const page = parseInt(pageParam) || 1;
  const requestedCategory = url.searchParams.get('category');
  const category = bookGenres.some((genre) => genre.slug === requestedCategory)
    ? requestedCategory || undefined
    : undefined;
  const sortParam = url.searchParams.get('sort') || 'title-asc';
  const limitParam = url.searchParams.get('limit') || '12';
  const limit = [12, 25, 100].includes(parseInt(limitParam)) ? parseInt(limitParam) : 12;

  // Whitelist sorts to avoid invalid queries
  const sortMap: Record<string, string> = {
    'title-asc': 'title',
    'title-desc': '-title',
    'newest': '-createdAt',
    'oldest': 'createdAt'
  };
  const sort = sortParam && sortMap[sortParam] ? sortMap[sortParam] : '-createdAt';

  try {
    // Build query parameters
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      depth: '2',
      sort
    });

    if (category) {
      params.append('where[categories][in]', category);
    }

    const products = await payloadGet<any>(`/api/books?${params.toString()}`);

    // Get site settings global
    const settings = await payloadGet<any>('/api/globals/siteSettings?depth=1');

    // Set strong edge caching (6 hours) with long stale window (24 hours)
    setHeaders({
      'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400, stale-if-error=86400',
      'Vary': 'Accept-Encoding',
      // Surrogate key for targeted purge
      'x-key': `books${category ? `,category:${category}` : ''},page:${page},sort:${sort}`
    });

    const response = {
      settings: settings || {},
      products: products.docs || [],
      pagination: {
        page: products.page || 1,
        totalPages: products.totalPages || 1,
        hasNextPage: products.hasNextPage || false,
        hasPrevPage: products.hasPrevPage || false,
        totalDocs: products.totalDocs || 0,
        limit
      },
      categories: bookGenres,
      currentCategory: category,
      sort: sortParam || 'newest',
      seo: {
        title: category ? `${category} Books` : 'Books',
        description: category
          ? `Explore our collection of ${category.toLowerCase()} books featuring African diaspora authors and themes.`
          : 'Discover our curated collection of books celebrating African diaspora literature, culture, and history.',
        canonical: `https://alkebulanimages.com/shop/books${category ? `?category=${encodeURIComponent(category)}` : ''}`,
        noIndex: page > 1 // Don't index pagination pages
      }
    };

    return response;
  } catch (error) {
    console.error('Error loading books:', error);
    
    // Return fallback data on error
    setHeaders({
      'Cache-Control': 'public, s-maxage=300' // Short cache on error
    });

    return {
      settings: {},
      products: [],
      pagination: {
        page: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
        totalDocs: 0,
        limit
      },
      categories: bookGenres,
      currentCategory: category,
      sort: sortParam || 'newest',
      seo: {
        title: 'Books',
        description: 'Discover our curated collection of books celebrating African diaspora literature.',
        canonical: 'https://alkebulanimages.com/shop/books',
        noIndex: false
      }
    };
  }
};
