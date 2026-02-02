// @ts-nocheck
import { payloadGet } from '$lib/server/payload'
import { buildSEOData } from '$lib/seo'
import { PUBLIC_SITE_URL } from '$env/static/public'
import type { PageServerLoad } from './$types'

export const load = async ({ setHeaders }: Parameters<PageServerLoad>[0]) => {
  try {
    const about = await payloadGet<any>('/api/globals/aboutPage?depth=2')

    setHeaders({
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      Vary: 'Accept-Encoding',
      'x-key': 'about-page',
    })

    return {
      about: about ?? {},
      seo: buildSEOData({
        title: 'About Us - Alkebulan Images',
        description:
          "Learn about Alkebulan Images, Nashville's premier Black-owned bookstore celebrating African diaspora literature, culture, and community since our founding.",
        canonical: `${PUBLIC_SITE_URL}/about`,
      }),
    }
  } catch (error) {
    console.error('Error loading about page global:', error)

    setHeaders({
      'Cache-Control': 'public, s-maxage=300',
    })

    return {
      about: {},
      seo: buildSEOData({
        title: 'About Us - Alkebulan Images',
        description:
          "Learn about Alkebulan Images, Nashville's premier Black-owned bookstore celebrating African diaspora literature, culture, and community since our founding.",
        canonical: `${PUBLIC_SITE_URL}/about`,
        noIndex: true,
      }),
    }
  }
}
