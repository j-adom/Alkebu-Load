// @ts-nocheck
import { payloadGet } from '$lib/server/payload';
import { buildSEOData } from '$lib/seo';
import { PUBLIC_SITE_URL } from '$env/static/public';
import type { PageServerLoad } from './$types';

export const load = async ({ setHeaders }: Parameters<PageServerLoad>[0]) => {
  try {
    // Get all book tags
    const tagsData = await payloadGet<any>('/api/tags?limit=200&sort=name');

    // Set strong edge caching (12 hours) with long stale window (7 days)
    setHeaders({
      'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=604800, stale-if-error=43200',
      'Vary': 'Accept-Encoding',
      'x-key': 'book-tags-index'
    });

    // Build breadcrumbs
    const breadcrumbs = [
      { name: 'Home', url: `${PUBLIC_SITE_URL}/` },
      { name: 'Books', url: `${PUBLIC_SITE_URL}/shop/books` },
      { name: 'Tags', url: `${PUBLIC_SITE_URL}/shop/books/tags` }
    ];

    // Build SEO data
    const seoData = buildSEOData({
      title: 'Book Tags',
      description: 'Browse books by tags and topics. Find books related to specific themes, subjects, and interests within African diaspora literature.',
      canonical: `${PUBLIC_SITE_URL}/shop/books/tags`,
      breadcrumbs
    });

    return {
      tags: tagsData.docs || [],
      seo: seoData
    };
  } catch (error) {
    console.error('Error loading tags:', error);
    
    setHeaders({
      'Cache-Control': 'public, s-maxage=300'
    });

    return {
      tags: [],
      seo: buildSEOData({
        title: 'Book Tags',
        description: 'Browse books by tags and topics.',
        canonical: `${PUBLIC_SITE_URL}/shop/books/tags`
      })
    };
  }
};