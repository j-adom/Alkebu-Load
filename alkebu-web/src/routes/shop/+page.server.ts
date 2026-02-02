import { payloadGet } from '$lib/server/payload'
import { buildSEOData } from '$lib/seo'
import { PUBLIC_SITE_URL } from '$env/static/public'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ setHeaders }) => {
  try {
    const shop = await payloadGet<any>('/api/globals/shopPage?depth=2')

    setHeaders({
      'Cache-Control': 'public, s-maxage=10800, stale-while-revalidate=86400',
      Vary: 'Accept-Encoding',
      'x-key': 'shop-page',
    })

    return {
      shop: shop ?? {},
      seo: buildSEOData({
        title: 'Shop - Alkebulan Images',
        description:
          'Browse Alkebulan Images departments: Books, Apparel, Health & Beauty, and African art imports.',
        canonical: `${PUBLIC_SITE_URL}/shop`,
      }),
    }
  } catch (error) {
    console.error('Error loading shop page:', error)

    setHeaders({
      'Cache-Control': 'public, s-maxage=300',
    })

    return {
      shop: {},
      seo: buildSEOData({
        title: 'Shop - Alkebulan Images',
        description:
          'Browse Alkebulan Images departments: Books, Apparel, Health & Beauty, and African art imports.',
        canonical: `${PUBLIC_SITE_URL}/shop`,
        noIndex: true,
      }),
    }
  }
}
