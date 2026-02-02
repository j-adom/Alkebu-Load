import { payloadGet } from '$lib/server/payload';
import { buildSEOData } from '$lib/seo';
import { PUBLIC_SITE_URL } from '$env/static/public';
import type { PageServerLoad } from './$types';

type SearchType = 'books' | 'apparel' | 'health' | 'home' | 'blog' | 'directory' | 'events';

const COLLECTIONS: Array<{
  type: SearchType;
  path: string;
  titleField?: string;
  descriptionField?: string;
  imageField?: string;
  url: (item: any) => string;
}> = [
  {
    type: 'books',
    path: '/api/books',
    titleField: 'title',
    descriptionField: 'description',
    imageField: 'images',
    url: (item) => `/shop/books/${item.slug}`,
  },
  {
    type: 'apparel',
    path: '/api/fashion-jewelry',
    titleField: 'name',
    descriptionField: 'description',
    imageField: 'images',
    url: (item) => `/shop/apparel/${item.slug}`,
  },
  {
    type: 'health',
    path: '/api/wellness-lifestyle',
    titleField: 'title',
    descriptionField: 'description',
    imageField: 'images',
    url: (item) => `/shop/health-and-beauty/${item.slug}`,
  },
  {
    type: 'home',
    path: '/api/oils-incense',
    titleField: 'title',
    descriptionField: 'description',
    imageField: 'images',
    url: (item) => `/shop/home-goods/${item.slug}`,
  },
  {
    type: 'blog',
    path: '/api/blogPosts',
    titleField: 'title',
    descriptionField: 'excerpt',
    imageField: 'featuredImage',
    url: (item) => `/blog/${item.slug}`,
  },
  {
    type: 'directory',
    path: '/api/businesses',
    titleField: 'name',
    descriptionField: 'description',
    imageField: 'logo',
    url: (item) => `/directory/${item.slug}`,
  },
  {
    type: 'events',
    path: '/api/events',
    titleField: 'title',
    descriptionField: 'description',
    imageField: 'featuredImage',
    url: (item) => `/events/${item.slug}`,
  },
];

const AVAILABLE_TYPES: Array<{ label: string; value: SearchType | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Books', value: 'books' },
  { label: 'Apparel', value: 'apparel' },
  { label: 'Health & Beauty', value: 'health' },
  { label: 'Home Goods', value: 'home' },
  { label: 'Blog', value: 'blog' },
  { label: 'Directory', value: 'directory' },
  { label: 'Events', value: 'events' },
];

export const load: PageServerLoad = async ({ url, setHeaders }) => {
  const searchQuery = (url.searchParams.get('q') || '').trim();
  const typeFilter = (url.searchParams.get('type') as SearchType) || 'all';
  const limitPerType = 6;

  try {
    let combinedResults: any[] = [];

    if (searchQuery) {
      const collectionsToSearch = COLLECTIONS.filter(
        (c) => typeFilter === 'all' || c.type === typeFilter
      );

      const paramsBase = (searchFields: string[]) => {
        const params = new URLSearchParams({
          page: '1',
          limit: limitPerType.toString(),
          depth: '2',
        });
        searchFields.forEach((field, idx) => {
          params.append(`where[or][${idx}][${field}][contains]`, searchQuery);
        });
        return params.toString();
      };

      const queries = collectionsToSearch.map(async (collection) => {
        const searchFields = [collection.titleField || 'title', collection.descriptionField || 'description'];
        const query = paramsBase(searchFields);
        try {
          const resp = await payloadGet<any>(`${collection.path}?${query}`);
          const docs = resp.docs || [];
          return docs.map((item: any) => ({
            type: collection.type,
            title: item[collection.titleField || 'title'],
            description: item[collection.descriptionField || 'description'],
            image: item[collection.imageField || 'image'] || item.images,
            url: collection.url(item),
            raw: item,
          }));
        } catch (err) {
          console.error(`Search failed for ${collection.type}:`, err);
          return [];
        }
      });

      const resultsByCollection = await Promise.all(queries);
      combinedResults = resultsByCollection.flat();
    }

    // Set moderate caching for search results (10 minutes)
    setHeaders({
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600',
      'Vary': 'Accept-Encoding',
      'x-key': `search:${encodeURIComponent(searchQuery)}:${typeFilter}`
    });

    const seoData = buildSEOData({
      title: searchQuery ? `Search results for "${searchQuery}"` : 'Search - Alkebulan Images',
      description: searchQuery 
        ? `Find books, products, and content related to "${searchQuery}" at Alkebulan Images.`
        : 'Search our collection of literature, wellness products, cultural items, events, and businesses.',
      canonical: `${PUBLIC_SITE_URL}/search${searchQuery ? `?q=${encodeURIComponent(searchQuery)}${typeFilter !== 'all' ? `&type=${typeFilter}` : ''}` : ''}`,
      noIndex: !!searchQuery
    });

    return {
      searchQuery,
      typeFilter,
      availableTypes: AVAILABLE_TYPES,
      results: combinedResults,
      pagination: {
        page: 1,
        totalPages: 1,
        totalDocs: combinedResults.length
      },
      seo: seoData
    };
  } catch (error) {
    console.error('Error performing search:', error);
    
    setHeaders({
      'Cache-Control': 'public, s-maxage=300'
    });

    return {
      searchQuery,
      typeFilter,
      availableTypes: AVAILABLE_TYPES,
      results: [],
      pagination: { page: 1, totalPages: 1, totalDocs: 0 },
      seo: buildSEOData({
        title: 'Search - Alkebulan Images',
        description: 'Search our collection of books and cultural items.',
        canonical: `${PUBLIC_SITE_URL}/search`
      })
    };
  }
};
