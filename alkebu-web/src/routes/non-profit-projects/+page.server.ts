import { PUBLIC_SITE_URL } from '$env/static/public';
import { partnershipPages } from '$lib/data/partnershipPages';
import { buildSEOData, buildPartnershipJsonLd } from '$lib/seo';
import { handlePartnershipInquiryAction } from '$lib/server/partnershipInquiry';
import type { Actions, PageServerLoad } from './$types';

const page = partnershipPages.nonprofit;
const relatedPages = Object.values(partnershipPages).filter((item) => item.path !== page.path);

export const load: PageServerLoad = async ({ setHeaders }) => {
  setHeaders({
    'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    Vary: 'Accept-Encoding',
    'x-key': 'partnership-nonprofit',
  });

  return {
    page,
    relatedPages,
    seo: buildSEOData({
      title: page.seo.title,
      description: page.seo.description,
      canonical: `${PUBLIC_SITE_URL}${page.path}`,
      image: page.hero.image,
      jsonLd: buildPartnershipJsonLd(page),
    }),
  };
};

export const actions: Actions = {
  default: async ({ request, fetch }) => handlePartnershipInquiryAction({ request, fetch, page }),
};
