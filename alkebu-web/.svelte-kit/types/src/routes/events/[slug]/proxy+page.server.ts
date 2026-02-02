// @ts-nocheck
import { getEventBySlug, payloadGet } from '$lib/server/payload';
import { buildEventJsonLd, buildSEOData } from '$lib/seo';
import { PUBLIC_SITE_URL } from '$env/static/public';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { is404Error } from '$lib/utils/errors';

export const load = async ({ params, setHeaders }: Parameters<PageServerLoad>[0]) => {
  const { slug } = params;

  try {
    const event = await getEventBySlug(slug);
    
    if (!event) {
      throw error(404, 'Event not found');
    }

    // Get related events
    const relatedParams = new URLSearchParams({
      limit: '3',
      depth: '1',
      sort: 'startDate',
      'where[id][not_equals]': event.id
    });

    // Show upcoming events if this event is upcoming, otherwise show similar type
    const now = new Date().toISOString();
    if (new Date(event.startDate) >= new Date()) {
      relatedParams.append('where[startDate][greater_than_equal]', now);
    } else if (event.type) {
      relatedParams.append('where[type][equals]', event.type);
    }

    const relatedEvents = await payloadGet<any>(`/api/events?${relatedParams.toString()}`);

    // Build breadcrumbs
    const breadcrumbs = [
      { name: 'Home', url: `${PUBLIC_SITE_URL}/` },
      { name: 'Events', url: `${PUBLIC_SITE_URL}/events` },
      { name: event.title, url: `${PUBLIC_SITE_URL}/events/${slug}` }
    ];

    // Set caching based on event timing
    const eventDate = new Date(event.startDate);
    const isPastEvent = eventDate < new Date();
    const isWithin24Hours = Math.abs(eventDate.getTime() - Date.now()) < 24 * 60 * 60 * 1000;

    let cacheControl;
    if (isPastEvent) {
      // Past events: long cache (7 days)
      cacheControl = 'public, s-maxage=604800, stale-while-revalidate=2592000, stale-if-error=604800';
    } else if (isWithin24Hours) {
      // Events within 24 hours: short cache (5 minutes)
      cacheControl = 'public, s-maxage=300, stale-while-revalidate=1800, stale-if-error=300';
    } else {
      // Future events: medium cache (6 hours)
      cacheControl = 'public, s-maxage=21600, stale-while-revalidate=86400, stale-if-error=21600';
    }

    setHeaders({
      'Cache-Control': cacheControl,
      'Vary': 'Accept-Encoding',
      // Surrogate keys for targeted purge
      'x-key': `event:${event.id}${event.type ? `,event-type:${event.type}` : ''}${event.venue ? `,venue:${event.venue.id}` : ''}`
    });

    // Build structured data
    const jsonLd = buildEventJsonLd(event, slug);

    // Build SEO data
    const eventDateStr = new Date(event.startDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const seoData = buildSEOData({
      title: event.title,
      description: event.seoDescription || event.description || `Join us for ${event.title} on ${eventDateStr}. ${event.location || 'Location TBA'}.`,
      canonical: `${PUBLIC_SITE_URL}/events/${slug}`,
      image: event.featuredImage?.url,
      imageAlt: event.featuredImage?.alt || `Featured image for ${event.title}`,
      jsonLd,
      breadcrumbs,
      publishedTime: event.createdAt,
      modifiedTime: event.updatedAt
    });

    return {
      event,
      relatedEvents: relatedEvents.docs || [],
      isPastEvent,
      isWithin24Hours,
      seo: seoData
    };
  } catch (err: unknown) {
    if (is404Error(err)) {
      throw err;
    }
    
    console.error('Error loading event:', err);
    
    // Return error state
    setHeaders({
      'Cache-Control': 'public, s-maxage=300' // Short cache on error
    });

    throw error(500, 'Failed to load event');
  }
};