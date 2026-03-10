import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { searchEngine } from '@/app/utils/searchEngine';

const ALL_TYPES = ['books', 'blogPosts', 'events', 'businesses', 'wellnessLifestyle', 'fashionJewelry', 'oilsIncense'];

function bestEditionSlug(doc: any): { slug: string; price: number } {
  const editions: any[] = doc.editions || [];
  const inStock = editions.find((e: any) => (e.inventory?.stockLevel ?? 0) > 0);
  const mostRecent = editions
    .filter((e: any) => e.datePublished)
    .sort((a: any, b: any) => new Date(b.datePublished).getTime() - new Date(a.datePublished).getTime())[0];
  const best = inStock || mostRecent || editions[0];
  const isbn = best?.isbn || best?.isbn10 || '';
  return {
    slug: isbn ? `${doc.slug || doc.id}/${isbn}` : (doc.slug || doc.id),
    price: best?.pricing?.retailPrice || 0,
  };
}

// Fallback: query Payload Local API directly when FlexSearch index is still initializing
async function payloadSearch(payload: any, query: string, types: string[], limit: number): Promise<any[]> {
  const perType = Math.max(5, Math.ceil(limit / types.length));

  const searches = types.map(async (type) => {
    try {
      if (type === 'books') {
        const res = await payload.find({
          collection: 'books',
          limit: perType,
          depth: 1,
          where: { or: [{ title: { contains: query } }, { description: { contains: query } }, { 'editions.isbn': { contains: query } }, { 'editions.isbn10': { contains: query } }] },
        });
        return res.docs.map((doc: any) => {
          const { slug, price } = bestEditionSlug(doc);
          return {
            id: doc.id,
            title: doc.title,
            type: 'books',
            excerpt: doc.description?.substring(0, 200),
            author: doc.authors?.map((a: any) => (typeof a === 'object' ? a.name : a)).join(', '),
            imageUrl: doc.images?.[0]?.image?.url || doc.images?.[0]?.url || '',
            slug,
            price,
            score: 1.0,
          };
        });
      }

      if (type === 'blogPosts') {
        const res = await payload.find({
          collection: 'blogPosts',
          limit: perType,
          depth: 1,
          where: {
            and: [
              { status: { equals: 'published' } },
              { or: [{ title: { contains: query } }, { excerpt: { contains: query } }] },
            ],
          },
        });
        return res.docs.map((doc: any) => ({
          id: doc.id, title: doc.title, type: 'blogPosts',
          excerpt: doc.excerpt?.substring(0, 200),
          imageUrl: doc.featuredImage?.url || '',
          slug: doc.slug, score: 0.8,
        }));
      }

      if (type === 'events') {
        const res = await payload.find({
          collection: 'events',
          limit: perType,
          depth: 1,
          where: {
            and: [
              { status: { equals: 'published' } },
              { or: [{ title: { contains: query } }, { description: { contains: query } }] },
            ],
          },
        });
        return res.docs.map((doc: any) => ({
          id: doc.id, title: doc.title, type: 'events',
          excerpt: doc.description?.substring(0, 200),
          imageUrl: doc.featuredImage?.url || '',
          slug: doc.slug, score: 0.9,
          metadata: { startDate: doc.startDate },
        }));
      }

      if (type === 'businesses') {
        const res = await payload.find({
          collection: 'businesses',
          limit: perType,
          depth: 1,
          where: { or: [{ name: { contains: query } }, { description: { contains: query } }] },
        });
        return res.docs.map((doc: any) => ({
          id: doc.id, title: doc.name, type: 'businesses',
          excerpt: doc.description?.substring(0, 200),
          imageUrl: doc.logo?.url || doc.images?.[0]?.url || '',
          slug: doc.slug, score: 0.7,
        }));
      }

      const productCollections: Record<string, string> = {
        wellnessLifestyle: 'wellness-lifestyle',
        fashionJewelry: 'fashion-jewelry',
        oilsIncense: 'oils-incense',
      };
      if (productCollections[type]) {
        const res = await payload.find({
          collection: productCollections[type],
          limit: perType,
          depth: 1,
          where: { or: [{ name: { contains: query } }, { description: { contains: query } }] },
        });
        return res.docs.map((doc: any) => ({
          id: doc.id, title: doc.name, type,
          excerpt: doc.description?.substring(0, 200),
          imageUrl: doc.images?.[0]?.image?.url || doc.images?.[0]?.url || '',
          slug: doc.slug,
          price: doc.variants?.[0]?.price || doc.variations?.[0]?.price,
          score: 0.6,
        }));
      }
    } catch (err) {
      console.error(`Payload search error for ${type}:`, err);
    }
    return [];
  });

  const all = await Promise.all(searches);
  return all.flat().sort((a, b) => b.score - a.score).slice(0, limit);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const typesParam = searchParams.get('types');
    const types = typesParam ? typesParam.split(',') : ALL_TYPES;
    const limit = parseInt(searchParams.get('limit') || '20');
    const includeExternal = searchParams.get('external') === 'true';
    const sessionId = searchParams.get('sessionId');
    const userId = searchParams.get('userId');

    if (!query) {
      return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
    }

    const payload = await getPayload({ config });
    const startTime = Date.now();

    // Try FlexSearch first (fast, in-memory, populated on startup)
    const flexResults = await searchEngine.search(query, { types, limit, includeExternal });
    let internalResults = flexResults.internal;
    let source = 'flexsearch';

    // FlexSearch index not yet populated — fall back to Payload Local API
    if (internalResults.length === 0) {
      internalResults = await payloadSearch(payload, query, types, limit);
      source = 'payload-local';
    }

    const searchTime = Date.now() - startTime;
    const totalResults = internalResults.length + flexResults.external.length;

    const response = {
      internal: internalResults,
      external: flexResults.external,
      totalResults,
      searchTime,
      suggestions: flexResults.suggestions || [],
      facets: flexResults.facets || {},
    };

    // Log analytics non-blocking
    payload.create({
      collection: 'searchAnalytics',
      data: {
        query,
        normalizedQuery: query.toLowerCase().trim(),
        queryType: types.length === 1 ? types[0] : 'general',
        searchSource: source,
        userType: userId ? 'registered' : 'guest',
        userId: userId || undefined,
        resultCount: totalResults,
        internalResultCount: internalResults.length,
        externalResultCount: flexResults.external.length,
        searchTime,
        clickthrough: false,
        conversion: false,
        searchDate: new Date().toISOString(),
        sessionId,
        searchEngine: source,
        cacheHit: false,
        zeroResultsQuery: totalResults === 0,
        deviceType: request.headers.get('user-agent')?.includes('Mobile') ? 'mobile' : 'desktop',
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      } as any,
    }).catch((err: unknown) => console.error('Search analytics error:', err));

    return NextResponse.json(response);

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      query,
      types = ALL_TYPES,
      limit = 20,
      filters = {},
      includeExternal = false,
      sessionId,
      userId,
      searchSource = 'api',
    } = body;

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const payload = await getPayload({ config });
    const startTime = Date.now();

    const flexResults = await searchEngine.search(query, { types, limit, filters, includeExternal });
    let internalResults = flexResults.internal;
    let source = searchSource;

    if (internalResults.length === 0) {
      internalResults = await payloadSearch(payload, query, types, limit);
      source = 'payload-local';
    }

    const searchTime = Date.now() - startTime;
    const totalResults = internalResults.length + flexResults.external.length;

    const response = {
      internal: internalResults,
      external: flexResults.external,
      totalResults,
      searchTime,
      suggestions: flexResults.suggestions || [],
      facets: flexResults.facets || {},
    };

    payload.create({
      collection: 'searchAnalytics',
      data: {
        query,
        normalizedQuery: query.toLowerCase().trim(),
        queryType: types.length === 1 ? types[0] : 'general',
        searchSource: source,
        userType: userId ? 'registered' : 'guest',
        userId: userId || undefined,
        resultCount: totalResults,
        internalResultCount: internalResults.length,
        externalResultCount: flexResults.external.length,
        searchTime,
        clickthrough: false,
        conversion: false,
        searchDate: new Date().toISOString(),
        sessionId,
        searchEngine: source,
        cacheHit: false,
        zeroResultsQuery: totalResults === 0,
        filtersUsed: Object.entries(filters).map(([filterType, filterValue]) => ({
          filterType,
          filterValue: Array.isArray(filterValue) ? filterValue.join(',') : String(filterValue),
        })),
        deviceType: request.headers.get('user-agent')?.includes('Mobile') ? 'mobile' : 'desktop',
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      } as any,
    }).catch((err: unknown) => console.error('Search analytics error:', err));

    return NextResponse.json(response);

  } catch (error) {
    console.error('Advanced search API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
