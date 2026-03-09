import { p as payloadGet } from "../../../../../../chunks/payload.js";
import { b as buildSEOData } from "../../../../../../chunks/seo.js";
import { P as PUBLIC_SITE_URL } from "../../../../../../chunks/public.js";
import { b as bookGenres } from "../../../../../../chunks/catalog.js";
import { error } from "@sveltejs/kit";
import { i as is404Error } from "../../../../../../chunks/errors.js";
const load = async ({ params, url, setHeaders }) => {
  const genreSlug = params.slug;
  const page = parseInt(url.searchParams.get("p") || "1");
  const sortParam = url.searchParams.get("sort") || "newest";
  const limitParam = url.searchParams.get("limit") || "12";
  const limit = [12, 25, 100].includes(parseInt(limitParam)) ? parseInt(limitParam) : 12;
  const sortMap = {
    "title-asc": "title",
    "title-desc": "-title",
    "newest": "-createdAt",
    "oldest": "createdAt"
  };
  const sort = sortMap[sortParam] ? sortMap[sortParam] : "-createdAt";
  try {
    const genre = bookGenres.find((g) => g.slug === genreSlug);
    if (!genre) {
      throw error(404, "Genre not found");
    }
    const booksParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      depth: "2",
      sort,
      "where[categories][in]": genre.slug
    });
    const booksData = await payloadGet(`/api/books?${booksParams.toString()}`);
    const featuredBooksData = await payloadGet(`/api/books?where[categories][in]=${genre.slug}&where[isFeatured][equals]=true&limit=4&depth=1`);
    const settings = await payloadGet("/api/globals/siteSettings?depth=1");
    const breadcrumbs = [
      { name: "Home", url: `${PUBLIC_SITE_URL}/` },
      { name: "Books", url: `${PUBLIC_SITE_URL}/shop/books` },
      { name: "Genres", url: `${PUBLIC_SITE_URL}/shop/books/genres` },
      { name: genre.name, url: `${PUBLIC_SITE_URL}/shop/books/genres/${genreSlug}` }
    ];
    setHeaders({
      "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400, stale-if-error=86400",
      "Vary": "Accept-Encoding",
      "x-key": `genre:${genre.slug},books-by-genre`
    });
    const seoData = buildSEOData({
      title: `${genre.name} Books`,
      description: `Explore our collection of ${genre.name.toLowerCase()} books. ${genre.description || `Discover compelling ${genre.name.toLowerCase()} literature celebrating African diaspora voices.`}`,
      canonical: `${PUBLIC_SITE_URL}/shop/books/genres/${genreSlug}`,
      breadcrumbs,
      noIndex: page > 1
    });
    return {
      genre,
      books: booksData.docs || [],
      pagination: {
        page: booksData.page || 1,
        totalPages: booksData.totalPages || 1,
        hasNextPage: booksData.hasNextPage || false,
        hasPrevPage: booksData.hasPrevPage || false,
        totalDocs: booksData.totalDocs || 0,
        limit
      },
      featuredBooks: featuredBooksData.docs || [],
      categories: bookGenres,
      currentSort: sortParam,
      settings: settings || {},
      seo: seoData
    };
  } catch (err) {
    if (is404Error(err)) {
      throw err;
    }
    console.error("Error loading genre books:", err);
    setHeaders({
      "Cache-Control": "public, s-maxage=300"
    });
    throw error(500, "Failed to load genre");
  }
};
export {
  load
};
