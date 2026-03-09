import { payloadGet } from '$lib/server/payload';
import { buildSEOData } from '$lib/seo';
import { PUBLIC_SITE_URL } from '$env/static/public';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ setHeaders }) => {
  try {
    // Get HomePage global from Payload
    const homePageData = await payloadGet<any>('/api/globals/homePage?depth=2');

    // Get featured books for homepage
    const featuredBooks = await payloadGet<any>('/api/books?where[isFeatured][equals]=true&limit=8&depth=2');

    // Get new books (recently added)
    const newBooks = await payloadGet<any>('/api/books?sort=-createdAt&limit=8&depth=2');

    // Get recent blog posts
    const blogPosts = await payloadGet<any>('/api/blogPosts?sort=-publishedDate&limit=4&depth=2');

    // Get upcoming events
    const events = await payloadGet<any>('/api/events?where[startDate][greater_than_equal]=' + new Date().toISOString() + '&sort=startDate&limit=3&depth=1');

    // Set strong caching for homepage (2 hours)
    setHeaders({
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600, stale-if-error=300',
      'Vary': 'Accept-Encoding',
      'x-key': 'homepage'
    });

    // Build SEO data for homepage
    const seoData = buildSEOData({
      title: 'Alkebulan Images - African Diaspora Literature & Culture',
      description: 'Discover books, art, and cultural treasures celebrating African diaspora heritage. Nashville\'s premier destination for Black literature, wellness products, and community connection.',
      canonical: PUBLIC_SITE_URL
    });

    // Debug logging
    console.log('Section3 images:', JSON.stringify(homePageData?.section3?.images, null, 2));

    return {
      // HomePage global data (banner, sections, etc.)
      banner: homePageData?.banner || {},
      section2: homePageData?.section2 || {},
      section3: homePageData?.section3 || {},
      section4: homePageData?.section4 || {},
      // Book data
      featured: featuredBooks.docs || [],
      newBooks: newBooks.docs || [],
      // Content data
      blogPosts: blogPosts.docs || [],
      events: events.docs || [],
      seo: seoData
    };
  } catch (error) {
    console.error('Error loading homepage data:', error);

    setHeaders({
      'Cache-Control': 'public, s-maxage=300'
    });

    return {
      banner: {},
      section2: {},
      section3: {},
      section4: {},
      featured: [],
      newBooks: [],
      blogPosts: [],
      events: [],
      seo: buildSEOData({
        title: 'Alkebulan Images - African Diaspora Literature & Culture',
        description: 'Nashville\'s premier destination for Black literature and culture.',
        canonical: PUBLIC_SITE_URL
      })
    };
  }
};