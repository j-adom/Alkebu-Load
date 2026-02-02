import { payloadGet } from '$lib/server/payload';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  try {
    // Get site settings global
    const settings = await payloadGet<any>('/api/globals/siteSettings?depth=1');

    // Get featured books
    const featuredBooks = await payloadGet<any>('/api/books?where[isFeatured][equals]=true&limit=10&depth=2');

    // Get new books (recent releases)
    const newBooks = await payloadGet<any>('/api/books?sort=-createdAt&limit=10&depth=2');

    // Note: Cache headers are set at page level to avoid conflicts
    return {
      settings: settings || {},
      featured: featuredBooks.docs || [],
      newBooks: newBooks.docs || [],
      user: locals.user ?? null
    };
  } catch (error) {
    console.error('Error loading layout data:', error);

    return {
      settings: {},
      featured: [],
      newBooks: [],
      user: locals.user ?? null
    };
  }
};
