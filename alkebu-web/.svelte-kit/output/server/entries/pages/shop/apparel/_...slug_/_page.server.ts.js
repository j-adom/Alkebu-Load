import { b as getProductBySlug, c as getRelatedProducts } from "../../../../../chunks/payload.js";
import { d as buildProductJsonLd, b as buildSEOData } from "../../../../../chunks/seo.js";
import { P as PUBLIC_SITE_URL } from "../../../../../chunks/public.js";
import { error } from "@sveltejs/kit";
import { i as is404Error } from "../../../../../chunks/errors.js";
const load = async ({ params, setHeaders }) => {
  const slug = params.slug;
  try {
    const product = await getProductBySlug(slug, "fashion-jewelry");
    if (!product) {
      throw error(404, "Product not found");
    }
    const productName = product.name || product.title;
    const productDescription = product.shortDescription || product.description;
    const categories = product.category ? [product.category] : product.categories || [];
    const relatedProducts = await getRelatedProducts(product.id, "fashion-jewelry", categories, 6);
    const breadcrumbs = [
      { name: "Home", url: `${PUBLIC_SITE_URL}/` },
      { name: "Fashion & Jewelry", url: `${PUBLIC_SITE_URL}/shop/apparel` },
      { name: productName, url: `${PUBLIC_SITE_URL}/shop/apparel/${slug}` }
    ];
    setHeaders({
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800, stale-if-error=86400",
      "Vary": "Accept-Encoding",
      // Surrogate keys for targeted purge (brand is a string, categories are strings)
      "x-key": `product:${product.id}${product.brand ? `,brand:${product.brand}` : ""}${product.categories?.length ? `,categories:${product.categories.join(",")}` : ""}`
    });
    const jsonLd = buildProductJsonLd(product, slug);
    const productImage = product.scrapedImageUrls?.[0]?.url || product.images?.[0]?.url;
    const seoData = buildSEOData({
      title: productName,
      description: typeof productDescription === "string" ? productDescription : `${productName} - Beautiful fashion and jewelry celebrating African culture and craftsmanship.`,
      canonical: `${PUBLIC_SITE_URL}/shop/apparel/${slug}`,
      image: productImage,
      imageAlt: `Image of ${productName}`,
      jsonLd,
      breadcrumbs
    });
    return {
      product,
      seo: seoData,
      relatedProducts
    };
  } catch (err) {
    if (is404Error(err)) {
      throw err;
    }
    console.error("Error loading fashion product:", err);
    setHeaders({
      "Cache-Control": "public, s-maxage=300"
      // Short cache on error
    });
    throw error(500, "Failed to load product");
  }
};
export {
  load
};
