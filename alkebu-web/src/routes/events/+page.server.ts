import { payloadGet } from '$lib/server/payload';
import { buildSEOData } from '$lib/seo';
import { PUBLIC_SITE_URL } from '$env/static/public';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, setHeaders }) => {
  const page = parseInt(url.searchParams.get('page') || '1');
  const type = url.searchParams.get('type') || undefined;
  const upcoming = url.searchParams.get('upcoming') !== 'false';
  const limit = 12;

  try {
    // Build query parameters
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      depth: '2',
      sort: upcoming ? 'startDate' : '-startDate'
    });

    // Filter by upcoming events by default
    if (upcoming) {
      params.append('where[startDate][greater_than_equal]', new Date().toISOString());
    }

    if (type) {
      params.append('where[type][equals]', type);
    }

    const events = await payloadGet<any>(`/api/events?${params.toString()}`);
    
    // Get event types for filter
    const eventTypes = [
      { value: 'book-signing', label: 'Book Signings' },
      { value: 'workshop', label: 'Workshops' },
      { value: 'reading', label: 'Readings' },
      { value: 'discussion', label: 'Discussions' },
      { value: 'community', label: 'Community Events' }
    ];

    // Set strong edge caching (1 hour) with medium stale window (6 hours)
    // Shorter cache for events due to time-sensitive nature
    setHeaders({
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=21600, stale-if-error=3600',
      'Vary': 'Accept-Encoding',
      // Surrogate key for targeted purge
      'x-key': `events${type ? `,type:${type}` : ''}${upcoming ? ',upcoming' : ',past'}`
    });

    // Build SEO data
    const seoData = buildSEOData({
      title: type ? `${type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')} Events` : 'Events',
      description: upcoming
        ? 'Join us for upcoming literary events, book signings, workshops, and community gatherings celebrating African diaspora culture.'
        : 'Browse our past events including book signings, workshops, and community gatherings.',
      canonical: `${PUBLIC_SITE_URL}/events${type ? `?type=${encodeURIComponent(type)}` : ''}${!upcoming ? '&upcoming=false' : ''}`,
      noIndex: page > 1 // Don't index pagination pages
    });

    return {
      events: events.docs || [],
      pagination: {
        page: events.page || 1,
        totalPages: events.totalPages || 1,
        hasNextPage: events.hasNextPage || false,
        hasPrevPage: events.hasPrevPage || false,
        totalDocs: events.totalDocs || 0
      },
      eventTypes,
      currentType: type,
      upcoming,
      seo: seoData
    };
  } catch (error) {
    console.error('Error loading events:', error);
    
    // Return fallback data on error
    setHeaders({
      'Cache-Control': 'public, s-maxage=300' // Short cache on error
    });

    return {
      events: [],
      pagination: {
        page: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
        totalDocs: 0
      },
      eventTypes: [],
      currentType: type,
      upcoming,
      seo: buildSEOData({
        title: 'Events',
        description: 'Join us for literary events celebrating African diaspora culture.',
        canonical: `${PUBLIC_SITE_URL}/events`,
        noIndex: false
      })
    };
  }
};