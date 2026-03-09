import { b as buildSEOData } from "../../../../../chunks/seo.js";
import { P as PUBLIC_SITE_URL } from "../../../../../chunks/public.js";
import { a as bookCollections } from "../../../../../chunks/catalog.js";
const load = async ({ setHeaders }) => {
  try {
    const collectionsData = bookCollections;
    setHeaders({
      "Cache-Control": "public, s-maxage=43200, stale-while-revalidate=604800, stale-if-error=43200",
      "Vary": "Accept-Encoding",
      "x-key": "book-collections-index"
    });
    const breadcrumbs = [
      { name: "Home", url: `${PUBLIC_SITE_URL}/` },
      { name: "Books", url: `${PUBLIC_SITE_URL}/shop/books` },
      { name: "Collections", url: `${PUBLIC_SITE_URL}/shop/books/collections` }
    ];
    const seoData = buildSEOData({
      title: "Book Collections",
      description: "Browse our curated book collections. Discover themed selections celebrating African diaspora literature, culture, and voices.",
      canonical: `${PUBLIC_SITE_URL}/shop/books/collections`,
      breadcrumbs
    });
    return {
      collections: collectionsData,
      seo: seoData
    };
  } catch (error) {
    console.error("Error loading collections:", error);
    setHeaders({
      "Cache-Control": "public, s-maxage=300"
    });
    return {
      collections: [],
      seo: buildSEOData({
        title: "Book Collections",
        description: "Browse our curated book collections.",
        canonical: `${PUBLIC_SITE_URL}/shop/books/collections`
      })
    };
  }
};
export {
  load
};
