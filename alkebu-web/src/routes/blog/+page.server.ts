import { PUBLIC_SITE_URL } from '$env/static/public';
import { payloadGet } from '$lib/server/payload';
import { buildSEOData } from '$lib/seo';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ setHeaders }) => {
  const seo = buildSEOData({
    title: 'News',
    description: 'News, articles, events, and community updates from Alkebu-Lan Images.',
    canonical: PUBLIC_SITE_URL + '/blog',
  });

  try {
    const posts = await payloadGet<any>(
      '/api/blogPosts?where[status][equals]=published&limit=12&depth=2&sort=-publishDate'
    );

    setHeaders({
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=21600',
      'Vary': 'Accept-Encoding',
    });

    return {
      posts: posts.docs || [],
      seo,
    };
  } catch (error) {
    console.error('Error loading blog posts:', error);

    setHeaders({
      'Cache-Control': 'public, s-maxage=300',
    });

    return {
      posts: [],
      seo,
    };
  }
};
