import { b as getProductBySlug, p as payloadGet } from "../../../../../../chunks/payload.js";
import { d as buildProductJsonLd, b as buildSEOData } from "../../../../../../chunks/seo.js";
import { P as PUBLIC_SITE_URL } from "../../../../../../chunks/public.js";
import { error } from "@sveltejs/kit";
import { i as is404Error } from "../../../../../../chunks/errors.js";
const load = async ({ params, setHeaders }) => {
  const { slug, isbn } = params;
  try {
    const product = await getProductBySlug(slug, "books");
    const settings = await payloadGet("/api/globals/siteSettings?depth=1");
    if (!product) {
      throw error(404, "Book not found");
    }
    const matchingEdition = product.editions?.find(
      (edition) => edition.isbn === isbn || edition.isbn10 === isbn
    );
    if (!matchingEdition) {
      throw error(404, "ISBN not found for this book");
    }
    const breadcrumbs = [
      { name: "Home", url: `${PUBLIC_SITE_URL}/` },
      { name: "Books", url: `${PUBLIC_SITE_URL}/shop/books` },
      { name: product.title, url: `${PUBLIC_SITE_URL}/shop/books/${slug}/${isbn}` }
    ];
    setHeaders({
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800, stale-if-error=86400",
      "Vary": "Accept-Encoding",
      // Surrogate keys for targeted purge
      "x-key": `product:${product.id}${product.authors?.length ? `,authors:${product.authors.map((a) => a.id).join(",")}` : ""}${product.publisher ? `,publisher:${product.publisher.id}` : ""}`
    });
    const jsonLd = buildProductJsonLd(product, `${slug}/${isbn}`);
    const authorNames = product.authors?.map((a) => a.name).join(", ") || "Various Authors";
    const descriptionFallback = `${product.title} by ${authorNames}`;
    const seoData = buildSEOData({
      title: product.titleLong || product.title,
      description: product.seoDescription || product.synopsis || product.description || descriptionFallback,
      canonical: `${PUBLIC_SITE_URL}/shop/books/${slug}/${isbn}`,
      image: product.images?.[0]?.image?.url || product.images?.[0]?.url,
      imageAlt: `Cover of ${product.title}`,
      jsonLd,
      breadcrumbs
    });
    let relatedBooks = [];
    if (product.authors?.length > 0) {
      try {
        const authorIds = product.authors.map((a) => a.id || a);
        const allRelatedBooks = /* @__PURE__ */ new Map();
        for (const authorId of authorIds) {
          try {
            const booksResult = await payloadGet(
              `/api/books?where[authors][contains]=${authorId}&limit=20&depth=1`
            );
            booksResult?.docs?.forEach((book) => {
              if (book.id !== product.id && book.slug && book.editions?.length > 0) {
                allRelatedBooks.set(book.id, book);
              }
            });
          } catch (err) {
            console.warn(`Failed to fetch books for author ${authorId}:`, err);
          }
        }
        relatedBooks = Array.from(allRelatedBooks.values()).slice(0, 12);
      } catch (err) {
        console.error("Error fetching related books:", err);
      }
    }
    return {
      book: product,
      // Return as 'book' to match Svelte component expectations
      settings: settings || {},
      seo: seoData,
      relatedBooks
    };
  } catch (err) {
    if (is404Error(err)) {
      throw err;
    }
    console.error("Error loading book:", err);
    setHeaders({
      "Cache-Control": "public, s-maxage=300"
      // Short cache on error
    });
    throw error(500, "Failed to load book");
  }
};
export {
  load
};
