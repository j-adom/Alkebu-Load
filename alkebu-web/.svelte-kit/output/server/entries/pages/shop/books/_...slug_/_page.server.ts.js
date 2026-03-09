import { b as getProductBySlug, p as payloadGet, d as getBooksByAuthor, e as getRelatedBooks } from "../../../../../chunks/payload.js";
import { d as buildProductJsonLd, b as buildSEOData } from "../../../../../chunks/seo.js";
import { P as PUBLIC_SITE_URL } from "../../../../../chunks/public.js";
import { error } from "@sveltejs/kit";
import { i as is404Error } from "../../../../../chunks/errors.js";
const load = async ({ params, setHeaders }) => {
  const slug = params.slug;
  try {
    const product = await getProductBySlug(slug, "books");
    const settings = await payloadGet("/api/globals/siteSettings?depth=1");
    if (!product) {
      throw error(404, "Book not found");
    }
    const authorIds = product.authors?.map((a) => typeof a === "string" ? a : a.id) || [];
    const booksByAuthor = await getBooksByAuthor(product.id, authorIds, 6);
    const booksByAuthorIds = booksByAuthor.map((b) => b.id);
    const relatedBooks = await getRelatedBooks(
      product.id,
      product.categories || [],
      product.collections || [],
      booksByAuthorIds,
      6
    );
    const breadcrumbs = [
      { name: "Home", url: `${PUBLIC_SITE_URL}/` },
      { name: "Books", url: `${PUBLIC_SITE_URL}/shop/books` },
      { name: product.title, url: `${PUBLIC_SITE_URL}/shop/books/${slug}` }
    ];
    setHeaders({
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800, stale-if-error=86400",
      "Vary": "Accept-Encoding",
      // Surrogate keys for targeted purge
      "x-key": `product:${product.id}${product.authors?.length ? `,authors:${product.authors.map((a) => a.id).join(",")}` : ""}${product.publisher ? `,publisher:${product.publisher.id}` : ""}`
    });
    const jsonLd = buildProductJsonLd(product, slug);
    const fallbackDesc = `${product.title} by ${product.authors?.map((a) => a.name).join(", ") || "Various Authors"}`;
    const rawDescription = product.seoDescription || product.description || product.synopsis || fallbackDesc;
    const description = typeof rawDescription === "string" ? rawDescription : fallbackDesc;
    const image = product.images?.[0]?.image?.url || product.images?.[0]?.url || product.scrapedImageUrls?.[0]?.url;
    const seoData = buildSEOData({
      title: product.titleLong || product.title,
      description,
      canonical: `${PUBLIC_SITE_URL}/shop/books/${slug}`,
      image,
      imageAlt: `Cover of ${product.title}`,
      jsonLd,
      breadcrumbs
    });
    return {
      book: product,
      settings: settings || {},
      seo: seoData,
      booksByAuthor,
      relatedBooks
    };
  } catch (err) {
    if (is404Error(err)) {
      throw err;
    }
    console.error("Error loading book:", err);
    throw error(500, "Failed to load book");
  }
};
export {
  load
};
