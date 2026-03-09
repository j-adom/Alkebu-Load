import { p as payloadGet } from "../../../../../../chunks/payload.js";
import { b as buildSEOData } from "../../../../../../chunks/seo.js";
import { P as PUBLIC_SITE_URL } from "../../../../../../chunks/public.js";
import { a as bookCollections } from "../../../../../../chunks/catalog.js";
import { error } from "@sveltejs/kit";
import { i as is404Error } from "../../../../../../chunks/errors.js";
const load = async ({ params, url, setHeaders }) => {
  const collectionSlug = params.slug;
  const page = parseInt(url.searchParams.get("p") || "1");
  const sort = url.searchParams.get("sort") || "-createdAt";
  const limit = 24;
  try {
    const collection = bookCollections.find((c) => c.slug === collectionSlug);
    if (!collection) {
      throw error(404, "Collection not found");
    }
    const booksParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      depth: "2",
      sort,
      "where[collections][in]": collection.slug
    });
    const booksData = await payloadGet(`/api/books?${booksParams.toString()}`);
    const featuredBooksData = await payloadGet(`/api/books?where[collections][in]=${collection.slug}&where[featured][equals]=true&limit=4&depth=1`);
    const breadcrumbs = [
      { name: "Home", url: `${PUBLIC_SITE_URL}/` },
      { name: "Books", url: `${PUBLIC_SITE_URL}/shop/books` },
      { name: "Collections", url: `${PUBLIC_SITE_URL}/shop/books/collections` },
      { name: collection.name, url: `${PUBLIC_SITE_URL}/shop/books/collections/${collectionSlug}` }
    ];
    setHeaders({
      "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400, stale-if-error=86400",
      "Vary": "Accept-Encoding",
      "x-key": `collection:${collection.slug},books-by-collection`
    });
    const seoData = buildSEOData({
      title: `${collection.name} Collection`,
      description: `Browse the ${collection.name} book collection. ${collection.description || `Discover curated books in our ${collection.name} collection celebrating African diaspora literature.`}`,
      canonical: `${PUBLIC_SITE_URL}/shop/books/collections/${collectionSlug}`,
      breadcrumbs,
      noIndex: page > 1
    });
    return {
      collection,
      books: booksData.docs || [],
      pagination: {
        page: booksData.page || 1,
        totalPages: booksData.totalPages || 1,
        hasNextPage: booksData.hasNextPage || false,
        hasPrevPage: booksData.hasPrevPage || false,
        totalDocs: booksData.totalDocs || 0
      },
      featuredBooks: featuredBooksData.docs || [],
      currentSort: sort,
      seo: seoData
    };
  } catch (err) {
    if (is404Error(err)) {
      throw err;
    }
    console.error("Error loading collection books:", err);
    setHeaders({
      "Cache-Control": "public, s-maxage=300"
    });
    throw error(500, "Failed to load collection");
  }
};
export {
  load
};
