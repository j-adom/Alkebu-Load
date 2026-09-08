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

function compactSearchDescription(value: string, author?: string): string {
  let description = value.replace(/\s+/g, ' ').trim();

  if (author) {
    const authorPrefix = author.trim();
    if (authorPrefix && description.toLocaleLowerCase().startsWith(authorPrefix.toLocaleLowerCase())) {
      description = description.slice(authorPrefix.length).replace(/^\s*[-:|–—]\s*/, '').trim();
    }
  }

  if (description.length <= 180) return description;
  return `${description.slice(0, 177).replace(/\s+\S*$/, '')}…`;
}

type DisplayType = 'books' | 'apparel' | 'health' | 'home' | 'blog' | 'directory' | 'events';
type SearchType = DisplayType | 'all';

const PAGE_SIZE = 24;
const MAX_PAGE = 10;

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
  // FlexSearch indexes book slugs as "slug/isbn"; keep only the canonical slug.
  books: (slug) => `/shop/books/${slug.split('/')[0]}`,
  fashionJewelry: (slug) => `/shop/apparel/${slug}`,
  wellnessLifestyle: (slug) => `/shop/health-and-beauty/${slug}`,
  // OilsIncense spans two storefront sections; productType selects the route.
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
  metadata?: Record<string, any> & { productType?: string };
}

interface FlexSearchResponse {
  internal: FlexSearchResult[];
  external: any[];
  totalResults: number;
  searchTime: number;
  suggestions?: string[];
  facets?: Record<string, Array<{ value: string; count: number }>>;
  hasMore?: boolean;
}

export const load: PageServerLoad = async ({ url, setHeaders }) => {
  const searchQuery = (url.searchParams.get('q') || '').trim();
  const rawTypeFilter = url.searchParams.get('type');
  const typeFilter: SearchType = isDisplayType(rawTypeFilter) ? rawTypeFilter : 'all';
  const rawPage = Number.parseInt(url.searchParams.get('page') || '1', 10);
  const page = Number.isFinite(rawPage) ? Math.min(Math.max(rawPage, 1), MAX_PAGE) : 1;
  const visibleLimit = page * PAGE_SIZE;
  const requestLimit = Math.min(visibleLimit + 1, (MAX_PAGE * PAGE_SIZE) + 1);

  try {
    let combinedResults: any[] = [];
    let searchTime = 0;
    let hasMore = false;
    let searchStatus: 'idle' | 'success' | 'error' = searchQuery ? 'success' : 'idle';

    if (searchQuery) {
      // Build FlexSearch API query
      const params = new URLSearchParams({
        q: searchQuery,
        limit: String(requestLimit),
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
        const mappedResults = searchResponse.internal.map((result) => {
          const displayType = FLEXSEARCH_TO_DISPLAY[result.type] || result.type;
          const urlBuilder = TYPE_URL_PREFIX[result.type];
          const resultUrl = urlBuilder && result.slug ? urlBuilder(result.slug, result) : '#';

          return {
            type: displayType,
            title: result.title,
            description: compactSearchDescription(stripHtml(result.excerpt), result.author),
            image: result.imageUrl,
            url: resultUrl,
            author: result.author,
            price: result.price,
            score: result.score,
            metadata: result.metadata || {},
          };
        });
        searchStatus = 'success';
        hasMore = page < MAX_PAGE && (Boolean(searchResponse.hasMore) || mappedResults.length > visibleLimit);
        combinedResults = mappedResults.slice(0, visibleLimit);
      } catch (searchErr) {
        // Fallback: query Payload REST API directly if FlexSearch is unavailable
        console.warn('FlexSearch API unavailable, falling back to Payload REST:', searchErr);
        const fallbackResponse = await fallbackSearch(searchQuery, typeFilter, visibleLimit, requestLimit);
        combinedResults = fallbackResponse.results;
        hasMore = page < MAX_PAGE && fallbackResponse.hasMore;
        searchStatus = 'success';
      }
    }

    setHeaders({
      'Cache-Control': 'no-store',
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
      searchStatus,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        hasMore,
        totalDocs: hasMore ? null : combinedResults.length,
      },
      seo: seoData,
    };
  } catch (error) {
    console.error('Error performing search:', error);

    setHeaders({
      'Cache-Control': 'no-store',
    });

    return {
      searchQuery,
      typeFilter,
      availableTypes: AVAILABLE_TYPES,
      results: [],
      searchTime: 0,
      searchStatus: searchQuery ? 'error' : 'idle',
      pagination: { page, pageSize: PAGE_SIZE, hasMore: false, totalDocs: 0 },
      seo: buildSEOData({
        title: 'Search - Alkebulan Images',
        description: 'Search our collection of books and cultural items.',
        canonical: `${PUBLIC_SITE_URL}/search`,
      }),
    };
  }
};

// Fallback: direct Payload REST queries when FlexSearch isn't available
async function fallbackSearch(query: string, typeFilter: SearchType, visibleLimit: number, requestLimit: number) {
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
    const params = new URLSearchParams({ page: '1', limit: String(requestLimit), depth: '2' });
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
      return { ok: true, hasMore: Boolean(resp.hasNextPage), results: (resp.docs || []).map((item: any) => ({
        type: col.type,
        title: item[col.titleField],
        description: compactSearchDescription(stripHtml(item[col.descField]), item.author),
        image: item[col.imgField]?.[0]?.url || item[col.imgField]?.url || item.scrapedImageUrls?.[0]?.url || item.images?.[0]?.url || null,
        url: col.urlFn(item),
      })) };
    } catch {
      return { ok: false, hasMore: false, results: [] };
    }
  });

  const responses = await Promise.all(queries);
  if (responses.length > 0 && responses.every((response) => !response.ok)) {
    throw new Error('Search is temporarily unavailable');
  }
  const results = responses.flatMap((response) => response.results);
  return {
    results: results.slice(0, visibleLimit),
    hasMore: responses.some((response) => response.hasMore) || results.length > visibleLimit,
  };
}
