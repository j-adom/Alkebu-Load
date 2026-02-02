import { payloadGet } from '$lib/server/payload';
import { buildSEOData } from '$lib/seo';
import { PUBLIC_SITE_URL } from '$env/static/public';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ setHeaders }) => {
  try {
    // Get all authors with at least one book
    const authorsData = await payloadGet<any>('/api/authors?limit=100&sort=name');

    // Set strong edge caching (12 hours) with long stale window (7 days)
    setHeaders({
      'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=604800, stale-if-error=43200',
      'Vary': 'Accept-Encoding',
      'x-key': 'book-authors-index'
    });

    // Build breadcrumbs
    const breadcrumbs = [
      { name: 'Home', url: `${PUBLIC_SITE_URL}/` },
      { name: 'Books', url: `${PUBLIC_SITE_URL}/shop/books` },
      { name: 'Authors', url: `${PUBLIC_SITE_URL}/shop/books/authors` }
    ];

    // Build SEO data
    const seoData = buildSEOData({
      title: 'Book Authors',
      description: 'Browse books by author. Discover works from talented African diaspora authors and voices celebrating culture, history, and literature.',
      canonical: `${PUBLIC_SITE_URL}/shop/books/authors`,
      breadcrumbs
    });

    return {
      authors: authorsData.docs || [],
      seo: seoData
    };
  } catch (error) {
    console.error('Error loading authors:', error);
    
    setHeaders({
      'Cache-Control': 'public, s-maxage=300'
    });

    return {
      authors: [],
      seo: buildSEOData({
        title: 'Book Authors',
        description: 'Browse books by author.',
        canonical: `${PUBLIC_SITE_URL}/shop/books/authors`
      })
    };
  }
};