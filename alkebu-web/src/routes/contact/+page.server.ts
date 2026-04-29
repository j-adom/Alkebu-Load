import { fail } from '@sveltejs/kit';
import { payloadGet } from '$lib/server/payload';
import { getPayloadApiUrl, getPayloadAuthHeader } from '$lib/server/payloadEnv';
import { buildSEOData } from '$lib/seo';
import { PUBLIC_SITE_URL } from '$env/static/public';
import type { Actions, PageServerLoad } from './$types';

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

export const actions: Actions = {
  default: async ({ request, fetch }) => {
    const formData = await request.formData();

    const values = {
      name: String(formData.get('name') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      phone: String(formData.get('phone') || '').trim(),
      subject: String(formData.get('subject') || '').trim(),
      message: String(formData.get('message') || '').trim(),
      website: String(formData.get('website') || '').trim(),
    };

    // Cloudflare Turnstile injects this hidden field on widget success
    const turnstileToken = String(formData.get('cf-turnstile-response') || '').trim();

    if (!values.name || !values.email || !values.subject || !values.message) {
      return fail(400, {
        success: false,
        values,
        error: 'Please complete the required fields before sending your message.',
      });
    }

    if (!turnstileToken) {
      return fail(400, {
        success: false,
        values,
        error: 'Please complete the bot check before sending your message.',
      });
    }

    try {
      const response = await fetch(`${getPayloadApiUrl()}/api/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getPayloadAuthHeader(),
        },
        body: JSON.stringify({ ...values, turnstileToken }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return fail(response.status, {
          success: false,
          values,
          error:
            typeof data?.error === 'string'
              ? data.error
              : 'Unable to send your message right now.',
        });
      }

      return {
        success: true,
        message: 'Thanks for reaching out. Your message has been sent.',
        values: {
          name: '',
          email: '',
          phone: '',
          subject: '',
          message: '',
          website: '',
        },
      };
    } catch (error) {
      console.error('Contact form action failed:', error);
      return fail(500, {
        success: false,
        values,
        error: 'Unable to send your message right now. Please try again later.',
      });
    }
  },
};
