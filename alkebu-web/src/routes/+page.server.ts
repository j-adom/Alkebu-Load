import { buildBookStorefrontPath, payloadGet } from '$lib/server/payload';
import { buildHomepageShelves } from '$lib/utils/homepageShelves';
import { buildSEOData } from '$lib/seo';
import { PUBLIC_SITE_URL } from '$env/static/public';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ setHeaders }) => {
  try {
    // Get HomePage global from Payload
    const homePageData = await payloadGet<any>('/api/globals/homePage?depth=2');

    // Owner-curated shelf (books flagged `isFeatured` in Payload)
    const featuredBooks = await payloadGet<any>(
      buildBookStorefrontPath(
        new URLSearchParams({
          'where[isFeatured][equals]': 'true',
          limit: '8',
          depth: '2',
        }),
      ),
    );

    // Newest books. Some import batches lack covers (e.g. Mar 2026), so
    // over-fetch newest-first; buildHomepageShelves keeps the first 8 with an
    // image and drops anything already on the featured shelf.
    const newBooksRaw = await payloadGet<any>(
      buildBookStorefrontPath(
        new URLSearchParams({
          sort: '-createdAt',
          limit: '100',
          depth: '2',
        }),
      ),
    );
    const shelves = buildHomepageShelves({
      featured: featuredBooks.docs || [],
      fresh: newBooksRaw.docs || [],
      limit: 8,
    });

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

    return {
      // HomePage global data (banner, sections, etc.)
      banner: homePageData?.banner || {},
      section2: homePageData?.section2 || {},
      section3: homePageData?.section3 || {},
      section4: homePageData?.section4 || {},
      // Book data
      featured: shelves.featured,
      newBooks: shelves.newBooks,
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
