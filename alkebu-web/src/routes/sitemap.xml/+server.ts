import type { RequestHandler } from './$types';
import { payloadGet, type PayloadCollectionResponse } from '$lib/server/payload';
import { PUBLIC_SITE_URL } from '$env/static/public';

export const GET: RequestHandler = async () => {
  try {
    // Pull just slugs/updatedAt; keep it light
    const [books, posts, events, businesses, fashion, wellness, oils] = await Promise.all([
      payloadGet<PayloadCollectionResponse<any>>('/api/books?limit=5000&depth=0&select=slug,updatedAt'),
      payloadGet<PayloadCollectionResponse<any>>('/api/blogPosts?where[status][equals]=published&limit=5000&depth=0&select=slug,updatedAt'),
      payloadGet<PayloadCollectionResponse<any>>('/api/events?where[status][equals]=published&limit=5000&depth=0&select=slug,updatedAt'),
      payloadGet<PayloadCollectionResponse<any>>('/api/businesses?limit=5000&depth=0&select=slug,updatedAt'),
      payloadGet<PayloadCollectionResponse<any>>('/api/fashion-jewelry?limit=5000&depth=0&select=slug,updatedAt'),
      payloadGet<PayloadCollectionResponse<any>>('/api/wellness-lifestyle?limit=5000&depth=0&select=slug,updatedAt'),
      payloadGet<PayloadCollectionResponse<any>>('/api/oils-incense?limit=5000&depth=0&select=slug,updatedAt')
    ]);

    const staticUrls = [
      { url: `${PUBLIC_SITE_URL}/`, priority: '1.0', changefreq: 'daily' },
      { url: `${PUBLIC_SITE_URL}/shop`, priority: '0.95', changefreq: 'daily' },
      { url: `${PUBLIC_SITE_URL}/shop/books`, priority: '0.9', changefreq: 'daily' },
      { url: `${PUBLIC_SITE_URL}/shop/apparel`, priority: '0.9', changefreq: 'daily' },
      { url: `${PUBLIC_SITE_URL}/shop/health-and-beauty`, priority: '0.9', changefreq: 'daily' },
      { url: `${PUBLIC_SITE_URL}/shop/home-goods`, priority: '0.9', changefreq: 'daily' },
      { url: `${PUBLIC_SITE_URL}/blog`, priority: '0.8', changefreq: 'daily' },
      { url: `${PUBLIC_SITE_URL}/events`, priority: '0.8', changefreq: 'daily' },
      { url: `${PUBLIC_SITE_URL}/directory`, priority: '0.7', changefreq: 'weekly' },
      { url: `${PUBLIC_SITE_URL}/about`, priority: '0.6', changefreq: 'monthly' },
      { url: `${PUBLIC_SITE_URL}/contact`, priority: '0.6', changefreq: 'monthly' },
      { url: `${PUBLIC_SITE_URL}/shipping`, priority: '0.5', changefreq: 'monthly' },
      { url: `${PUBLIC_SITE_URL}/returns`, priority: '0.5', changefreq: 'monthly' },
      { url: `${PUBLIC_SITE_URL}/privacy`, priority: '0.4', changefreq: 'yearly' },
      { url: `${PUBLIC_SITE_URL}/terms`, priority: '0.4', changefreq: 'yearly' },
    ];

    const toUrlElement = (url: string, lastmod: string, priority: string = '0.7', changefreq: string = 'weekly') => `
  <url>
    <loc>${url}</loc>
    <lastmod>${new Date(lastmod).toISOString().split('T')[0]}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;

    const staticUrlsXml = staticUrls.map(item => toUrlElement(item.url, new Date().toISOString(), item.priority, item.changefreq)).join('');

    const productUrls = books.docs.map((product: any) => 
      toUrlElement(`${PUBLIC_SITE_URL}/shop/books/${product.slug}`, product.updatedAt, '0.8', 'weekly')
    ).join('');

    const blogUrls = posts.docs.map((post: any) => 
      toUrlElement(`${PUBLIC_SITE_URL}/blog/${post.slug}`, post.updatedAt, '0.7', 'monthly')
    ).join('');

    const eventUrls = events.docs.map((event: any) => 
      toUrlElement(`${PUBLIC_SITE_URL}/events/${event.slug}`, event.updatedAt, '0.6', 'monthly')
    ).join('');

    const businessUrls = businesses.docs.map((business: any) => 
      toUrlElement(`${PUBLIC_SITE_URL}/directory/${business.slug}`, business.updatedAt, '0.6', 'monthly')
    ).join('');

    const fashionUrls = fashion.docs.map((product: any) => 
      toUrlElement(`${PUBLIC_SITE_URL}/shop/apparel/${product.slug}`, product.updatedAt, '0.8', 'weekly')
    ).join('');

    const wellnessUrls = wellness.docs.map((product: any) => 
      toUrlElement(`${PUBLIC_SITE_URL}/shop/health-and-beauty/${product.slug}`, product.updatedAt, '0.8', 'weekly')
    ).join('');

    const oilsUrls = oils.docs.map((product: any) => {
      // Determine URL based on product type - oils go to health-and-beauty, incense goes to home-goods
      const baseUrl = product.type === 'incense' ? 
        `${PUBLIC_SITE_URL}/shop/home-goods` : 
        `${PUBLIC_SITE_URL}/shop/health-and-beauty`;
      return toUrlElement(`${baseUrl}/${product.slug}`, product.updatedAt, '0.8', 'weekly');
    }).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${staticUrlsXml}
  ${productUrls}
  ${fashionUrls}
  ${wellnessUrls}
  ${oilsUrls}
  ${blogUrls}
  ${eventUrls}
  ${businessUrls}
</urlset>`;

    return new Response(xml, { 
      headers: { 
        'Content-Type': 'application/xml', 
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      } 
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    
    // Return minimal sitemap on error
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${PUBLIC_SITE_URL}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

    return new Response(fallbackXml, { 
      headers: { 
        'Content-Type': 'application/xml', 
        'Cache-Control': 'public, s-maxage=300'
      } 
    });
  }
};