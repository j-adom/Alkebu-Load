import { b as getProductBySlug, p as payloadGet, c as getRelatedProducts } from "../../../../../chunks/payload.js";
import { d as buildProductJsonLd, b as buildSEOData } from "../../../../../chunks/seo.js";
import { P as PUBLIC_SITE_URL } from "../../../../../chunks/public.js";
import { error } from "@sveltejs/kit";
import { i as is404Error } from "../../../../../chunks/errors.js";
const load = async ({ params, setHeaders }) => {
  const slug = params.slug;
  try {
    let product = null;
    let productType = "wellness-lifestyle";
    try {
      product = await getProductBySlug(slug, "wellness-lifestyle");
      productType = "wellness-lifestyle";
    } catch (err) {
      try {
        const searchResult = await payloadGet(`/api/oils-incense?where[slug][equals]=${slug}&where[productType][in]=fragrance-oil&limit=1`);
        if (searchResult.docs?.length > 0) {
          product = searchResult.docs[0];
          productType = "oils-incense";
        }
      } catch (err2) {
      }
    }
    if (!product) {
      throw error(404, "Product not found");
    }
    const categories = product.category ? [product.category] : product.categories || [];
    const relatedProducts = await getRelatedProducts(product.id, productType, categories, 6);
    const categoryName = productType === "wellness-lifestyle" ? "Wellness & Lifestyle" : "Essential Oils & Aromatherapy";
    const breadcrumbs = [
      { name: "Home", url: `${PUBLIC_SITE_URL}/` },
      { name: "Health & Beauty", url: `${PUBLIC_SITE_URL}/shop/health-and-beauty` },
      { name: categoryName, url: `${PUBLIC_SITE_URL}/shop/health-and-beauty?collection=${productType === "wellness-lifestyle" ? "wellness" : "oils"}` },
      { name: product.title, url: `${PUBLIC_SITE_URL}/shop/health-and-beauty/${slug}` }
    ];
    setHeaders({
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800, stale-if-error=86400",
      "Vary": "Accept-Encoding",
      // Surrogate keys for targeted purge
      "x-key": `product:${product.id},collection:${productType}${product.brand ? `,brand:${product.brand.id}` : ""}${product.categories?.length ? `,categories:${product.categories.map((c) => c.id).join(",")}` : ""}`
    });
    const jsonLd = buildProductJsonLd(product, slug);
    let description = product.seoDescription || product.description;
    if (!description) {
      if (productType === "wellness-lifestyle") {
        description = `${product.title} - Wellness and lifestyle product promoting natural health and wellbeing.`;
      } else {
        description = `${product.title} - Premium essential oil featuring authentic scents for aromatherapy and therapeutic relaxation.`;
      }
    }
    const seoData = buildSEOData({
      title: product.titleLong || product.title,
      description,
      canonical: `${PUBLIC_SITE_URL}/shop/health-and-beauty/${slug}`,
      image: product.images?.[0]?.url,
      imageAlt: `Image of ${product.title}`,
      jsonLd,
      breadcrumbs
    });
    return {
      product,
      productType,
      seo: seoData,
      relatedProducts
    };
  } catch (err) {
    if (is404Error(err)) {
      throw err;
    }
    console.error("Error loading health & beauty product:", err);
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
