// @ts-nocheck
import { buildSEOData } from '$lib/seo';
import { PUBLIC_SITE_URL } from '$env/static/public';
import { bookCollections } from '$lib/data/catalog';
import type { PageServerLoad } from './$types';

export const load = async ({ setHeaders }: Parameters<PageServerLoad>[0]) => {
  try {
    // Get all book collections from configured options
    const collectionsData = bookCollections;

    // Set strong edge caching (12 hours) with long stale window (7 days)
    setHeaders({
      'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=604800, stale-if-error=43200',
      'Vary': 'Accept-Encoding',
      'x-key': 'book-collections-index'
    });

    // Build breadcrumbs
    const breadcrumbs = [
      { name: 'Home', url: `${PUBLIC_SITE_URL}/` },
      { name: 'Books', url: `${PUBLIC_SITE_URL}/shop/books` },
      { name: 'Collections', url: `${PUBLIC_SITE_URL}/shop/books/collections` }
    ];

    // Build SEO data
    const seoData = buildSEOData({
      title: 'Book Collections',
      description: 'Browse our curated book collections. Discover themed selections celebrating African diaspora literature, culture, and voices.',
      canonical: `${PUBLIC_SITE_URL}/shop/books/collections`,
      breadcrumbs
    });

    return {
      collections: collectionsData,
      seo: seoData
    };
  } catch (error) {
    console.error('Error loading collections:', error);
    
    setHeaders({
      'Cache-Control': 'public, s-maxage=300'
    });

    return {
      collections: [],
      seo: buildSEOData({
        title: 'Book Collections',
        description: 'Browse our curated book collections.',
        canonical: `${PUBLIC_SITE_URL}/shop/books/collections`
      })
    };
  }
};
