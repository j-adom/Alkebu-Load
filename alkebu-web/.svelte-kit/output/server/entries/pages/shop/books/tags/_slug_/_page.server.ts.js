import { p as payloadGet } from "../../../../../../chunks/payload.js";
import { b as buildSEOData } from "../../../../../../chunks/seo.js";
import { P as PUBLIC_SITE_URL } from "../../../../../../chunks/public.js";
import { error } from "@sveltejs/kit";
import { i as is404Error } from "../../../../../../chunks/errors.js";
const load = async ({ params, url, setHeaders }) => {
  const tagSlug = decodeURIComponent(params.slug);
  const page = parseInt(url.searchParams.get("p") || "1");
  const sort = url.searchParams.get("sort") || "-createdAt";
  const limit = 24;
  try {
    const tagsData = await payloadGet(`/api/tags?where[slug][equals]=${tagSlug}&limit=1`);
    const tag = tagsData.docs?.[0];
    if (!tag) {
      throw error(404, "Tag not found");
    }
    const booksParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      depth: "2",
      sort,
      "where[tags][in]": tag.id
    });
    const booksData = await payloadGet(`/api/books?${booksParams.toString()}`);
    const featuredBooksData = await payloadGet(`/api/books?where[tags][in]=${tag.id}&where[featured][equals]=true&limit=4&depth=1`);
    const breadcrumbs = [
      { name: "Home", url: `${PUBLIC_SITE_URL}/` },
      { name: "Books", url: `${PUBLIC_SITE_URL}/shop/books` },
      { name: "Tags", url: `${PUBLIC_SITE_URL}/shop/books/tags` },
      { name: tag.name, url: `${PUBLIC_SITE_URL}/shop/books/tags/${tagSlug}` }
    ];
    setHeaders({
      "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400, stale-if-error=86400",
      "Vary": "Accept-Encoding",
      "x-key": `tag:${tag.id},books-by-tag`
    });
    const seoData = buildSEOData({
      title: `Books Tagged: ${tag.name}`,
      description: `Discover books tagged with "${tag.name}". ${tag.description || `Browse our collection of books related to ${tag.name} themes and topics.`}`,
      canonical: `${PUBLIC_SITE_URL}/shop/books/tags/${tagSlug}`,
      breadcrumbs,
      noIndex: page > 1
    });
    return {
      tag,
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
    console.error("Error loading tag books:", err);
    setHeaders({
      "Cache-Control": "public, s-maxage=300"
    });
    throw error(500, "Failed to load tag");
  }
};
export {
  load
};
