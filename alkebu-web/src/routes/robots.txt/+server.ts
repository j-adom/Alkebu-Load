import { PUBLIC_SITE_URL } from '$env/static/public';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  const body = [
    'User-agent: *',
    'Disallow: /cart',
    'Disallow: /checkout',
    'Disallow: /account',
    'Disallow: /auth',
    'Disallow: /api',
    '',
    'Allow: /',
    '',
    `Sitemap: ${PUBLIC_SITE_URL}/sitemap.xml`
  ].join('\n');

  return new Response(body, { 
    headers: { 
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, s-maxage=3600'
    } 
  });
};