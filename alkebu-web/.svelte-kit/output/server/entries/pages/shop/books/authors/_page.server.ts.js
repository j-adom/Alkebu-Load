import { p as payloadGet } from "../../../../../chunks/payload.js";
import { b as buildSEOData } from "../../../../../chunks/seo.js";
import { P as PUBLIC_SITE_URL } from "../../../../../chunks/public.js";
const load = async ({ setHeaders }) => {
  try {
    const authorsData = await payloadGet("/api/authors?limit=100&sort=name");
    setHeaders({
      "Cache-Control": "public, s-maxage=43200, stale-while-revalidate=604800, stale-if-error=43200",
      "Vary": "Accept-Encoding",
      "x-key": "book-authors-index"
    });
    const breadcrumbs = [
      { name: "Home", url: `${PUBLIC_SITE_URL}/` },
      { name: "Books", url: `${PUBLIC_SITE_URL}/shop/books` },
      { name: "Authors", url: `${PUBLIC_SITE_URL}/shop/books/authors` }
    ];
    const seoData = buildSEOData({
      title: "Book Authors",
      description: "Browse books by author. Discover works from talented African diaspora authors and voices celebrating culture, history, and literature.",
      canonical: `${PUBLIC_SITE_URL}/shop/books/authors`,
      breadcrumbs
    });
    return {
      authors: authorsData.docs || [],
      seo: seoData
    };
  } catch (error) {
    console.error("Error loading authors:", error);
    setHeaders({
      "Cache-Control": "public, s-maxage=300"
    });
    return {
      authors: [],
      seo: buildSEOData({
        title: "Book Authors",
        description: "Browse books by author.",
        canonical: `${PUBLIC_SITE_URL}/shop/books/authors`
      })
    };
  }
};
export {
  load
};
