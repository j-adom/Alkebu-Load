import { p as payloadGet } from "../../../../../chunks/payload.js";
import { b as buildSEOData } from "../../../../../chunks/seo.js";
import { P as PUBLIC_SITE_URL } from "../../../../../chunks/public.js";
const load = async ({ setHeaders }) => {
  try {
    const tagsData = await payloadGet("/api/tags?limit=200&sort=name");
    setHeaders({
      "Cache-Control": "public, s-maxage=43200, stale-while-revalidate=604800, stale-if-error=43200",
      "Vary": "Accept-Encoding",
      "x-key": "book-tags-index"
    });
    const breadcrumbs = [
      { name: "Home", url: `${PUBLIC_SITE_URL}/` },
      { name: "Books", url: `${PUBLIC_SITE_URL}/shop/books` },
      { name: "Tags", url: `${PUBLIC_SITE_URL}/shop/books/tags` }
    ];
    const seoData = buildSEOData({
      title: "Book Tags",
      description: "Browse books by tags and topics. Find books related to specific themes, subjects, and interests within African diaspora literature.",
      canonical: `${PUBLIC_SITE_URL}/shop/books/tags`,
      breadcrumbs
    });
    return {
      tags: tagsData.docs || [],
      seo: seoData
    };
  } catch (error) {
    console.error("Error loading tags:", error);
    setHeaders({
      "Cache-Control": "public, s-maxage=300"
    });
    return {
      tags: [],
      seo: buildSEOData({
        title: "Book Tags",
        description: "Browse books by tags and topics.",
        canonical: `${PUBLIC_SITE_URL}/shop/books/tags`
      })
    };
  }
};
export {
  load
};
