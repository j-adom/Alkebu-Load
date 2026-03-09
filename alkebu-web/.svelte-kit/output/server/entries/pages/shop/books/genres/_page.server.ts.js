import { b as buildSEOData } from "../../../../../chunks/seo.js";
import { P as PUBLIC_SITE_URL } from "../../../../../chunks/public.js";
import { b as bookGenres } from "../../../../../chunks/catalog.js";
const load = async ({ setHeaders }) => {
  try {
    const genresData = bookGenres;
    setHeaders({
      "Cache-Control": "public, s-maxage=43200, stale-while-revalidate=604800, stale-if-error=43200",
      "Vary": "Accept-Encoding",
      "x-key": "book-genres-index"
    });
    const breadcrumbs = [
      { name: "Home", url: `${PUBLIC_SITE_URL}/` },
      { name: "Books", url: `${PUBLIC_SITE_URL}/shop/books` },
      { name: "Genres", url: `${PUBLIC_SITE_URL}/shop/books/genres` }
    ];
    const seoData = buildSEOData({
      title: "Book Genres",
      description: "Browse books by genre. Explore fiction, non-fiction, poetry, history, biographies, and more from African diaspora perspectives.",
      canonical: `${PUBLIC_SITE_URL}/shop/books/genres`,
      breadcrumbs
    });
    return {
      genres: genresData,
      seo: seoData
    };
  } catch (error) {
    console.error("Error loading genres:", error);
    setHeaders({
      "Cache-Control": "public, s-maxage=300"
    });
    return {
      genres: [],
      seo: buildSEOData({
        title: "Book Genres",
        description: "Browse books by genre.",
        canonical: `${PUBLIC_SITE_URL}/shop/books/genres`
      })
    };
  }
};
export {
  load
};
