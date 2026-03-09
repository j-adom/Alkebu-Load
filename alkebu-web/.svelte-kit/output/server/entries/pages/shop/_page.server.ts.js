import { p as payloadGet } from "../../../chunks/payload.js";
import { b as buildSEOData } from "../../../chunks/seo.js";
import { P as PUBLIC_SITE_URL } from "../../../chunks/public.js";
const load = async ({ setHeaders }) => {
  try {
    const shop = await payloadGet("/api/globals/shopPage?depth=2");
    setHeaders({
      "Cache-Control": "public, s-maxage=10800, stale-while-revalidate=86400",
      Vary: "Accept-Encoding",
      "x-key": "shop-page"
    });
    return {
      shop: shop ?? {},
      seo: buildSEOData({
        title: "Shop - Alkebulan Images",
        description: "Browse Alkebulan Images departments: Books, Apparel, Health & Beauty, and African art imports.",
        canonical: `${PUBLIC_SITE_URL}/shop`
      })
    };
  } catch (error) {
    console.error("Error loading shop page:", error);
    setHeaders({
      "Cache-Control": "public, s-maxage=300"
    });
    return {
      shop: {},
      seo: buildSEOData({
        title: "Shop - Alkebulan Images",
        description: "Browse Alkebulan Images departments: Books, Apparel, Health & Beauty, and African art imports.",
        canonical: `${PUBLIC_SITE_URL}/shop`,
        noIndex: true
      })
    };
  }
};
export {
  load
};
