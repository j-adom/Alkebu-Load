import { appendBookStorefrontFilters, payloadGet } from '$lib/server/payload';
import { buildSEOData } from '$lib/seo';
import { resolveOilsIncenseShopSection } from '$lib/server/sitemapHelpers.js';
import { PUBLIC_SITE_URL } from '$env/static/public';
import type { PageServerLoad } from './$types';

function stripHtml(str: string | null | undefined): string {
  if (!str) return '';
  return str.replace(/<[^>]*>/g, '').replace(/&[a-z#0-9]+;/gi, (e) => {
    const entities: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ', '&ldquo;': '\u201c', '&rdquo;': '\u201d', '&lsquo;': '\u2018', '&rsquo;': '\u2019', '&mdash;': '\u2014', '&ndash;': '\u2013' };
    return entities[e] ?? e;
  }).trim();
}

type DisplayType = 'books' | 'apparel' | 'health' | 'home' | 'blog' | 'directory' | 'events';
type SearchType = DisplayType | 'all';

function isDisplayType(value: string | null): value is DisplayType {
  return value === 'books'
    || value === 'apparel'
    || value === 'health'
    || value === 'home'
    || value === 'blog'
    || value === 'directory'
    || value === 'events';
}

// Map frontend filter types to FlexSearch internal type names
const DISPLAY_TO_FLEXSEARCH: Record<DisplayType, string> = {
  books: 'books',
  apparel: 'fashionJewelry',
  health: 'wellnessLifestyle',
  home: 'oilsIncense',
  blog: 'blogPosts',
  directory: 'businesses',
  events: 'events',
};

// Map FlexSearch types back to display types
const FLEXSEARCH_TO_DISPLAY: Record<string, DisplayType> = {
  books: 'books',
  fashionJewelry: 'apparel',
  wellnessLifestyle: 'health',
  oilsIncense: 'home',
  blogPosts: 'blog',
  businesses: 'directory',
  events: 'events',
};

// Map types to URL patterns
const TYPE_URL_PREFIX: Partial<Record<string, (slug: string, result?: FlexSearchResult) => string>> = {
  // FlexSearch indexes book slugs as "slug/isbn"; keep only the canonical slug
  books: (slug) => `/shop/books/${slug.split('/')[0]}`,
  fashionJewelry: (slug) => `/shop/apparel/${slug}`,
  wellnessLifestyle: (slug) => `/shop/health-and-beauty/${slug}`,
  // OilsIncense spans two storefront sections: fragrance oils live under
  // health-and-beauty, incense/sage/palo-santo under home-goods. FlexSearch's
  // product index doesn't currently carry productType in its metadata (only
  // the collection-level 'oilsIncense' tag), so resolveOilsIncenseShopSection
  // falls back to health-and-beauty when it's absent -- this branch mainly
  // matters once tier-1 indexing carries productType; the tier-2 fallback
  // below always has the full doc and resolves it correctly per item.
  oilsIncense: (slug, result) =>
    `/shop/${resolveOilsIncenseShopSection(result?.metadata?.productType)}/${slug}`,
  blogPosts: (slug) => `/blog/${slug}`,
  businesses: (slug) => `/directory/${slug}`,
  events: (slug) => `/events/${slug}`,
};

const AVAILABLE_TYPES: Array<{ label: string; value: SearchType }> = [
  { label: 'All', value: 'all' },
  { label: 'Books', value: 'books' },
  { label: 'Apparel', value: 'apparel' },
  { label: 'Health & Beauty', value: 'health' },
  { label: 'Home Goods', value: 'home' },
  { label: 'Blog', value: 'blog' },
  { label: 'Directory', value: 'directory' },
  { label: 'Events', value: 'events' },
];

interface FlexSearchResult {
  id: string;
  title: string;
  type: string;
  excerpt?: string;
  author?: string;
  imageUrl?: string;
  price?: number;
  slug?: string;
  score: number;
  // `productType` isn't populated by the current FlexSearch index (see
  // TYPE_URL_PREFIX.oilsIncense above) but is typed here so the URL-mapping
  // logic keeps working once it is.
  metadata?: Record<string, any> & { productType?: string };
}

interface FlexSearchResponse {
  internal: FlexSearchResult[];
  external: any[];
  totalResults: number;
  searchTime: number;
  suggestions?: string[];
  facets?: Record<string, Array<{ value: string; count: number }>>;
}

export const load: PageServerLoad = async ({ url, setHeaders }) => {
  const searchQuery = (url.searchParams.get('q') || '').trim();
  const rawTypeFilter = url.searchParams.get('type');
  const typeFilter: SearchType = isDisplayType(rawTypeFilter) ? rawTypeFilter : 'all';

  try {
    let combinedResults: any[] = [];
    let searchTime = 0;

    if (searchQuery) {
      // Build FlexSearch API query
      const params = new URLSearchParams({
        q: searchQuery,
        limit: '30',
      });

      // Map frontend type filter to FlexSearch types
      if (typeFilter !== 'all') {
        const flexType = DISPLAY_TO_FLEXSEARCH[typeFilter];
        if (flexType) {
          params.set('types', flexType);
        }
      }

      try {
        const searchResponse = await payloadGet<FlexSearchResponse>(`/api/search?${params}`);

        searchTime = searchResponse.searchTime || 0;

        // Transform FlexSearch results to frontend format
        combinedResults = searchResponse.internal.map((result) => {
          const displayType = FLEXSEARCH_TO_DISPLAY[result.type] || result.type;
          const urlBuilder = TYPE_URL_PREFIX[result.type];
          const resultUrl = urlBuilder && result.slug ? urlBuilder(result.slug, result) : '#';

          return {
            type: displayType,
            title: result.title,
            description: stripHtml(result.excerpt),
            image: result.imageUrl,
            url: resultUrl,
            author: result.author,
            price: result.price,
            score: result.score,
          };
        });
      } catch (searchErr) {
        // Fallback: query Payload REST API directly if FlexSearch is unavailable
        console.warn('FlexSearch API unavailable, falling back to Payload REST:', searchErr);
        combinedResults = await fallbackSearch(searchQuery, typeFilter);
      }
    }

    setHeaders({
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600',
      'Vary': 'Accept-Encoding',
    });

    const seoData = buildSEOData({
      title: searchQuery ? `Search results for "${searchQuery}"` : 'Search - Alkebulan Images',
      description: searchQuery
        ? `Find books, products, and content related to "${searchQuery}" at Alkebulan Images.`
        : 'Search our collection of literature, wellness products, cultural items, events, and businesses.',
      canonical: `${PUBLIC_SITE_URL}/search${searchQuery ? `?q=${encodeURIComponent(searchQuery)}${typeFilter !== 'all' ? `&type=${typeFilter}` : ''}` : ''}`,
      noIndex: !!searchQuery,
    });

    return {
      searchQuery,
      typeFilter,
      availableTypes: AVAILABLE_TYPES,
      results: combinedResults,
      searchTime,
      pagination: {
        page: 1,
        totalPages: 1,
        totalDocs: combinedResults.length,
      },
      seo: seoData,
    };
  } catch (error) {
    console.error('Error performing search:', error);

    setHeaders({
      'Cache-Control': 'public, s-maxage=300',
    });

    return {
      searchQuery,
      typeFilter,
      availableTypes: AVAILABLE_TYPES,
      results: [],
      searchTime: 0,
      pagination: { page: 1, totalPages: 1, totalDocs: 0 },
      seo: buildSEOData({
        title: 'Search - Alkebulan Images',
        description: 'Search our collection of books and cultural items.',
        canonical: `${PUBLIC_SITE_URL}/search`,
      }),
    };
  }
};

// Fallback: direct Payload REST queries when FlexSearch isn't available
async function fallbackSearch(query: string, typeFilter: SearchType) {
  const collections = [
    // Canonical slug-only book URLs; the detail page picks the best edition itself.
    { type: 'books' as DisplayType, path: '/api/books', titleField: 'title', descField: 'description', imgField: 'images', urlFn: (i: any) => `/shop/books/${i.slug}` },
    { type: 'apparel' as DisplayType, path: '/api/fashion-jewelry', titleField: 'name', descField: 'description', imgField: 'images', urlFn: (i: any) => `/shop/apparel/${i.slug}` },
    // wellness-lifestyle/oils-incense have no `title` or rich-text-JSON-only
    // `description` field usable in a plain-text query -- only `name` and
    // `shortDescription` exist (see CLAUDE.md search gotchas).
    { type: 'health' as DisplayType, path: '/api/wellness-lifestyle', titleField: 'name', descField: 'shortDescription', imgField: 'images', urlFn: (i: any) => `/shop/health-and-beauty/${i.slug}` },
    // OilsIncense spans two storefront sections -- resolve per item's
    // productType instead of hardcoding home-goods for every hit (fragrance
    // oils live under health-and-beauty).
    { type: 'home' as DisplayType, path: '/api/oils-incense', titleField: 'name', descField: 'shortDescription', imgField: 'images', urlFn: (i: any) => `/shop/${resolveOilsIncenseShopSection(i.productType)}/${i.slug}` },
    { type: 'blog' as DisplayType, path: '/api/blogPosts', titleField: 'title', descField: 'excerpt', imgField: 'featuredImage', urlFn: (i: any) => `/blog/${i.slug}` },
    { type: 'directory' as DisplayType, path: '/api/businesses', titleField: 'name', descField: 'description', imgField: 'logo', urlFn: (i: any) => `/directory/${i.slug}` },
    { type: 'events' as DisplayType, path: '/api/events', titleField: 'title', descField: 'description', imgField: 'featuredImage', urlFn: (i: any) => `/events/${i.slug}` },
  ].filter((c) => typeFilter === 'all' || c.type === typeFilter);

  const queries = collections.map(async (col) => {
    const params = new URLSearchParams({ page: '1', limit: '6', depth: '2' });
    params.append(`where[or][0][${col.titleField}][contains]`, query);
    params.append(`where[or][1][${col.descField}][contains]`, query);
    if (col.type === 'books') {
      params.append('where[or][2][editions.isbn][contains]', query);
      params.append('where[or][3][editions.isbn10][contains]', query);
      appendBookStorefrontFilters(params);
    }
    if (col.type === 'health' || col.type === 'home') {
      // Curation gate: wellness-lifestyle/oils-incense carry unreviewed Square
      // imports (bulk supply SKUs, miscategorized items, disease-claim SKUs)
      // that must stay invisible until a human ticks publishOnline. Sibling
      // top-level `where` keys are implicitly ANDed by Payload, same pattern
      // as appendBookStorefrontFilters above.
      params.set('where[publishOnline][equals]', 'true');
    }
    try {
      const resp = await payloadGet<any>(`${col.path}?${params}`);
      return (resp.docs || []).map((item: any) => ({
        type: col.type,
        title: item[col.titleField],
        description: stripHtml(item[col.descField]),
        image: item[col.imgField]?.[0]?.url || item[col.imgField]?.url || item.scrapedImageUrls?.[0]?.url || item.images?.[0]?.url || null,
        url: col.urlFn(item),
      }));
    } catch {
      return [];
    }
  });

  return (await Promise.all(queries)).flat();
}
