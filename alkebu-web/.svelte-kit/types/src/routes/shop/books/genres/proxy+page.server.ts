// @ts-nocheck
import { buildSEOData } from '$lib/seo';
import { PUBLIC_SITE_URL } from '$env/static/public';
import { bookGenres } from '$lib/data/catalog';
import type { PageServerLoad } from './$types';

export const load = async ({ setHeaders }: Parameters<PageServerLoad>[0]) => {
  try {
    // Get all book genres from configured options
    const genresData = bookGenres;

    // Set strong edge caching (12 hours) with long stale window (7 days)
    setHeaders({
      'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=604800, stale-if-error=43200',
      'Vary': 'Accept-Encoding',
      'x-key': 'book-genres-index'
    });

    // Build breadcrumbs
    const breadcrumbs = [
      { name: 'Home', url: `${PUBLIC_SITE_URL}/` },
      { name: 'Books', url: `${PUBLIC_SITE_URL}/shop/books` },
      { name: 'Genres', url: `${PUBLIC_SITE_URL}/shop/books/genres` }
    ];

    // Build SEO data
    const seoData = buildSEOData({
      title: 'Book Genres',
      description: 'Browse books by genre. Explore fiction, non-fiction, poetry, history, biographies, and more from African diaspora perspectives.',
      canonical: `${PUBLIC_SITE_URL}/shop/books/genres`,
      breadcrumbs
    });

    return {
      genres: genresData,
      seo: seoData
    };
  } catch (error) {
    console.error('Error loading genres:', error);
    
    setHeaders({
      'Cache-Control': 'public, s-maxage=300'
    });

    return {
      genres: [],
      seo: buildSEOData({
        title: 'Book Genres',
        description: 'Browse books by genre.',
        canonical: `${PUBLIC_SITE_URL}/shop/books/genres`
      })
    };
  }
};
