import { payloadGet } from '$lib/server/payload';
import { buildSEOData } from '$lib/seo';
import { PUBLIC_SITE_URL } from '$env/static/public';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ setHeaders }) => {
  try {
    // Get ContactPage global from Payload
    const contactPageData = await payloadGet<any>('/api/globals/contactPage?depth=2');

    // Set static content caching (24 hours)
    setHeaders({
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      'Vary': 'Accept-Encoding',
      'x-key': 'contact-page'
    });

    // Build SEO data for contact page
    const seoData = buildSEOData({
      title: 'Contact Us - Alkebulan Images',
      description: contactPageData?.description || 'Get in touch with Alkebulan Images. Visit our Nashville location, call us, or send us a message. We\'d love to hear from you!',
      canonical: `${PUBLIC_SITE_URL}/contact`
    });

    return {
      contact: contactPageData || {},
      seo: seoData
    };
  } catch (error) {
    console.error('Error loading contact page data:', error);

    return {
      contact: {},
      seo: buildSEOData({
        title: 'Contact Us - Alkebulan Images',
        description: 'Get in touch with Alkebulan Images.',
        canonical: `${PUBLIC_SITE_URL}/contact`
      })
    };
  }
};
