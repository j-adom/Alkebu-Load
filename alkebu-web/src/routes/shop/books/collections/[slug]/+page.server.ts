import { payloadGet } from '$lib/server/payload';
import { buildSEOData } from '$lib/seo';
import { PUBLIC_SITE_URL } from '$env/static/public';
import { bookCollections } from '$lib/data/catalog';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { is404Error } from '$lib/utils/errors';

export const load: PageServerLoad = async ({ params, url, setHeaders }) => {
  const collectionSlug = params.slug;
  const page = parseInt(url.searchParams.get('p') || '1');
  const sort = url.searchParams.get('sort') || '-createdAt';
  const limit = 24;

  try {
    // Get collection information from configured options
    const collection = bookCollections.find(c => c.slug === collectionSlug);
    
    if (!collection) {
      throw error(404, 'Collection not found');
    }

    // Get books in this collection
    const booksParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      depth: '2',
      sort: sort,
      'where[collections][in]': collection.slug
    });

    const booksData = await payloadGet<any>(`/api/books?${booksParams.toString()}`);
    
    // Get featured books in this collection
    const featuredBooksData = await payloadGet<any>(`/api/books?where[collections][in]=${collection.slug}&where[featured][equals]=true&limit=4&depth=1`);

    // Build breadcrumbs
    const breadcrumbs = [
      { name: 'Home', url: `${PUBLIC_SITE_URL}/` },
      { name: 'Books', url: `${PUBLIC_SITE_URL}/shop/books` },
      { name: 'Collections', url: `${PUBLIC_SITE_URL}/shop/books/collections` },
      { name: collection.name, url: `${PUBLIC_SITE_URL}/shop/books/collections/${collectionSlug}` }
    ];

    // Set strong edge caching (6 hours) with long stale window (24 hours)
    setHeaders({
      'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400, stale-if-error=86400',
      'Vary': 'Accept-Encoding',
      'x-key': `collection:${collection.slug},books-by-collection`
    });

    // Build SEO data
    const seoData = buildSEOData({
      title: `${collection.name} Collection`,
      description: `Browse the ${collection.name} book collection. ${collection.description || `Discover curated books in our ${collection.name} collection celebrating African diaspora literature.`}`,
      canonical: `${PUBLIC_SITE_URL}/shop/books/collections/${collectionSlug}`,
      breadcrumbs,
      noIndex: page > 1
    });

    return {
      collection,
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
    
    console.error('Error loading collection books:', err);
    
    throw error(500, 'Failed to load collection');
  }
};
