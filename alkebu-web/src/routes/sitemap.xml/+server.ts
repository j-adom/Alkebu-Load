import type { RequestHandler } from './$types';
import {
  buildBookStorefrontPath,
  payloadGet,
  type PayloadCollectionResponse,
} from '$lib/server/payload';
import {
  SITEMAP_STATIC_PAGES,
  buildSitemapSelectParams,
  sitemapUrlElement,
} from '$lib/server/sitemapHelpers.js';
import { PUBLIC_SITE_URL } from '$env/static/public';

const collectionPath = (slug: string, where = '', extraSelect: string[] = []) => {
  const params = buildSitemapSelectParams();
  for (const field of extraSelect) {
    params.set(`select[${field}]`, 'true');
  }
  return `/api/${slug}?${where}${params.toString()}`;
};

export const GET: RequestHandler = async () => {
  try {
    const [books, posts, events, businesses, fashion, wellness, oils] = await Promise.all([
      payloadGet<PayloadCollectionResponse<any>>(
        buildBookStorefrontPath(buildSitemapSelectParams()),
      ),
      payloadGet<PayloadCollectionResponse<any>>(
        collectionPath('blogPosts', 'where[status][equals]=published&'),
      ),
      payloadGet<PayloadCollectionResponse<any>>(
        collectionPath('events', 'where[status][equals]=published&'),
      ),
      payloadGet<PayloadCollectionResponse<any>>(collectionPath('businesses')),
      payloadGet<PayloadCollectionResponse<any>>(collectionPath('fashion-jewelry')),
      payloadGet<PayloadCollectionResponse<any>>(collectionPath('wellness-lifestyle')),
      // `type` drives the oils-vs-incense URL split below.
      payloadGet<PayloadCollectionResponse<any>>(collectionPath('oils-incense', '', ['type'])),
    ]);

    const withSlug = (response: PayloadCollectionResponse<any>) =>
      response.docs.filter((doc: any) => typeof doc.slug === 'string' && doc.slug.length > 0);

    const staticUrlsXml = SITEMAP_STATIC_PAGES.map((page) =>
      sitemapUrlElement(`${PUBLIC_SITE_URL}${page.path}`, undefined, page.priority, page.changefreq),
    ).join('');

    const productUrls = withSlug(books)
      .map((product: any) =>
        sitemapUrlElement(
          `${PUBLIC_SITE_URL}/shop/books/${product.slug}`,
          product.updatedAt,
          '0.8',
          'weekly',
        ),
      )
      .join('');

    const blogUrls = withSlug(posts)
      .map((post: any) =>
        sitemapUrlElement(`${PUBLIC_SITE_URL}/blog/${post.slug}`, post.updatedAt, '0.7', 'monthly'),
      )
      .join('');

    const eventUrls = withSlug(events)
      .map((event: any) =>
        sitemapUrlElement(
          `${PUBLIC_SITE_URL}/events/${event.slug}`,
          event.updatedAt,
          '0.6',
          'monthly',
        ),
      )
      .join('');

    const businessUrls = withSlug(businesses)
      .map((business: any) =>
        sitemapUrlElement(
          `${PUBLIC_SITE_URL}/directory/${business.slug}`,
          business.updatedAt,
          '0.6',
          'monthly',
        ),
      )
      .join('');

    const fashionUrls = withSlug(fashion)
      .map((product: any) =>
        sitemapUrlElement(
          `${PUBLIC_SITE_URL}/shop/apparel/${product.slug}`,
          product.updatedAt,
          '0.8',
          'weekly',
        ),
      )
      .join('');

    const wellnessUrls = withSlug(wellness)
      .map((product: any) =>
        sitemapUrlElement(
          `${PUBLIC_SITE_URL}/shop/health-and-beauty/${product.slug}`,
          product.updatedAt,
          '0.8',
          'weekly',
        ),
      )
      .join('');

    const oilsUrls = withSlug(oils)
      .map((product: any) => {
        // Oils render under health-and-beauty, incense under home-goods.
        const baseUrl =
          product.type === 'incense'
            ? `${PUBLIC_SITE_URL}/shop/home-goods`
            : `${PUBLIC_SITE_URL}/shop/health-and-beauty`;
        return sitemapUrlElement(`${baseUrl}/${product.slug}`, product.updatedAt, '0.8', 'weekly');
      })
      .join('');

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
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
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
        'Cache-Control': 'public, s-maxage=300',
      },
    });
  }
};
