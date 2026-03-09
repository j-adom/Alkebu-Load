import { p as payloadGet } from "../../../../chunks/payload.js";
import { b as bookGenres } from "../../../../chunks/catalog.js";
const load = async ({ url, setHeaders }) => {
  const pageParam = url.searchParams.get("p") || url.searchParams.get("page") || "1";
  const page = parseInt(pageParam) || 1;
  const category = url.searchParams.get("category") || void 0;
  const sortParam = url.searchParams.get("sort") || "title-asc";
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
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      depth: "2",
      sort
    });
    if (category) {
      params.append("where[categories][in]", category);
    }
    const products = await payloadGet(`/api/books?${params.toString()}`);
    const settings = await payloadGet("/api/globals/siteSettings?depth=1");
    setHeaders({
      "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400, stale-if-error=86400",
      "Vary": "Accept-Encoding",
      // Surrogate key for targeted purge
      "x-key": `books${category ? `,category:${category}` : ""},page:${page},sort:${sort}`
    });
    const response = {
      settings: settings || {},
      products: products.docs || [],
      pagination: {
        page: products.page || 1,
        totalPages: products.totalPages || 1,
        hasNextPage: products.hasNextPage || false,
        hasPrevPage: products.hasPrevPage || false,
        totalDocs: products.totalDocs || 0,
        limit
      },
      categories: bookGenres,
      currentCategory: category,
      sort: sortParam || "newest",
      seo: {
        title: category ? `${category} Books` : "Books",
        description: category ? `Explore our collection of ${category.toLowerCase()} books featuring African diaspora authors and themes.` : "Discover our curated collection of books celebrating African diaspora literature, culture, and history.",
        canonical: `https://alkebulanimages.com/shop/books${category ? `?category=${encodeURIComponent(category)}` : ""}`,
        noIndex: page > 1
        // Don't index pagination pages
      }
    };
    return response;
  } catch (error) {
    console.error("Error loading books:", error);
    setHeaders({
      "Cache-Control": "public, s-maxage=300"
      // Short cache on error
    });
    return {
      settings: {},
      products: [],
      pagination: {
        page: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
        totalDocs: 0,
        limit
      },
      categories: bookGenres,
      currentCategory: category,
      sort: sortParam || "newest",
      seo: {
        title: "Books",
        description: "Discover our curated collection of books celebrating African diaspora literature.",
        canonical: "https://alkebulanimages.com/shop/books",
        noIndex: false
      }
    };
  }
};
export {
  load
};
