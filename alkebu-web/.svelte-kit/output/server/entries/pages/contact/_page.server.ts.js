import { p as payloadGet } from "../../../chunks/payload.js";
import { b as buildSEOData } from "../../../chunks/seo.js";
import { P as PUBLIC_SITE_URL } from "../../../chunks/public.js";
const load = async ({ setHeaders }) => {
  try {
    const contactPageData = await payloadGet("/api/globals/contactPage?depth=2");
    setHeaders({
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      "Vary": "Accept-Encoding",
      "x-key": "contact-page"
    });
    const seoData = buildSEOData({
      title: "Contact Us - Alkebulan Images",
      description: contactPageData?.description || "Get in touch with Alkebulan Images. Visit our Nashville location, call us, or send us a message. We'd love to hear from you!",
      canonical: `${PUBLIC_SITE_URL}/contact`
    });
    return {
      contact: contactPageData || {},
      seo: seoData
    };
  } catch (error) {
    console.error("Error loading contact page data:", error);
    return {
      contact: {},
      seo: buildSEOData({
        title: "Contact Us - Alkebulan Images",
        description: "Get in touch with Alkebulan Images.",
        canonical: `${PUBLIC_SITE_URL}/contact`
      })
    };
  }
};
export {
  load
};
