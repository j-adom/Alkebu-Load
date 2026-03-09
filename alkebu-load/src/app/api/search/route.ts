import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { searchEngine } from '@/app/utils/searchEngine';
import { externalBookAPI } from '@/app/utils/externalBookAPI';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const types = searchParams.get('types')?.split(',') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20');
    const includeExternal = searchParams.get('external') === 'true';
    const sessionId = searchParams.get('sessionId');
    const userId = searchParams.get('userId');

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    const payload = await getPayload({ config });
    const startTime = Date.now();

    // Perform the search
    const searchResults = await searchEngine.search(query, {
      types,
      limit,
      includeExternal
    });

    const searchTime = Date.now() - startTime;

    // Log search analytics
    try {
      const searchAnalytics = await payload.create({
        collection: 'searchAnalytics',
        data: {
          query,
          normalizedQuery: query.toLowerCase().trim(),
          queryType: types?.length === 1 ? types[0] : 'general',
          searchSource: 'api',
          userType: userId ? 'registered' : 'guest',
          userId: userId || undefined,
          resultCount: searchResults.totalResults,
          internalResultCount: searchResults.internal.length,
          externalResultCount: searchResults.external.length,
          searchTime,
          clickthrough: false,
          conversion: false,
          searchDate: new Date().toISOString(),
          sessionId,
          searchEngine: 'combined',
          cacheHit: false,
          zeroResultsQuery: searchResults.totalResults === 0,
          deviceType: request.headers.get('user-agent')?.includes('Mobile') ? 'mobile' : 'desktop',
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        } as any
      });

      // Include search analytics ID in response for potential quote requests
      (searchResults as any).searchAnalyticsId = searchAnalytics.id;
    } catch (analyticsError) {
      console.error('Error logging search analytics:', analyticsError);
    }

    return NextResponse.json(searchResults);

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      query,
      types,
      limit = 20,
      filters = {},
      includeExternal = false,
      sessionId,
      userId,
      searchSource = 'api'
    } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    const payload = await getPayload({ config });
    const startTime = Date.now();

    // Perform advanced search with filters
    const searchResults = await searchEngine.search(query, {
      types,
      limit,
      filters,
      includeExternal
    });

    const searchTime = Date.now() - startTime;

    // Log detailed search analytics
    try {
      const searchAnalytics = await payload.create({
        collection: 'searchAnalytics',
        data: {
          query,
          normalizedQuery: query.toLowerCase().trim(),
          queryType: types?.length === 1 ? types[0] : 'general',
          searchSource,
          userType: userId ? 'registered' : 'guest',
          userId: userId || undefined,
          resultCount: searchResults.totalResults,
          internalResultCount: searchResults.internal.length,
          externalResultCount: searchResults.external.length,
          searchTime,
          clickthrough: false,
          conversion: false,
          searchDate: new Date().toISOString(),
          sessionId,
          searchEngine: 'combined',
          cacheHit: false,
          zeroResultsQuery: searchResults.totalResults === 0,
          filtersUsed: Object.entries(filters).map(([filterType, filterValue]) => ({
            filterType,
            filterValue: Array.isArray(filterValue) ? filterValue.join(',') : String(filterValue)
          })),
          deviceType: request.headers.get('user-agent')?.includes('Mobile') ? 'mobile' : 'desktop',
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          externalBookSearch: searchResults.external.length > 0 ? {
            isbndbUsed: searchResults.external.some(book => book.source === 'isbndb'),
            googleBooksUsed: searchResults.external.some(book => book.source === 'google-books'),
            openLibraryUsed: searchResults.external.some(book => book.source === 'open-library'),
            bookshopChecked: searchResults.external.some(book => book.source === 'bookshop'),
            quoteRequested: false
          } : undefined
        } as any
      });

      (searchResults as any).searchAnalyticsId = searchAnalytics.id;
    } catch (analyticsError) {
      console.error('Error logging search analytics:', analyticsError);
    }

    return NextResponse.json(searchResults);

  } catch (error) {
    console.error('Advanced search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}