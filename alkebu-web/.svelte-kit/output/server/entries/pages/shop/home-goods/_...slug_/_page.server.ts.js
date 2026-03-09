import { p as payloadGet, b as getProductBySlug, c as getRelatedProducts } from "../../../../../chunks/payload.js";
import { d as buildProductJsonLd, b as buildSEOData } from "../../../../../chunks/seo.js";
import { P as PUBLIC_SITE_URL } from "../../../../../chunks/public.js";
import { error } from "@sveltejs/kit";
import { i as is404Error } from "../../../../../chunks/errors.js";
const load = async ({ params, setHeaders }) => {
  const slug = params.slug;
  try {
    let product = null;
    let productType = "oils-incense";
    try {
      const searchResult = await payloadGet(`/api/oils-incense?where[slug][equals]=${slug}&where[productType][in]=incense-pack,sage-bundle,palo-santo&limit=1`);
      if (searchResult.docs?.length > 0) {
        product = searchResult.docs[0];
        productType = "oils-incense";
      }
    } catch (err) {
    }
    if (!product) {
      try {
        product = await getProductBySlug(slug, "fashion-jewelry");
        if (product) {
          productType = "fashion-jewelry";
        }
      } catch (err) {
      }
    }
    if (!product) {
      throw error(404, "Home goods item not found");
    }
    const categories = product.category ? [product.category] : product.categories || [];
    const relatedProducts = await getRelatedProducts(product.id, productType, categories, 6);
    const breadcrumbs = [
      { name: "Home", url: `${PUBLIC_SITE_URL}/` },
      { name: "Home Goods", url: `${PUBLIC_SITE_URL}/shop/home-goods` },
      { name: product.title, url: `${PUBLIC_SITE_URL}/shop/home-goods/${slug}` }
    ];
    setHeaders({
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800, stale-if-error=86400",
      "Vary": "Accept-Encoding",
      // Surrogate keys for targeted purge
      "x-key": `product:${product.id},home-goods,${productType}${product.categories?.length ? `,categories:${product.categories.map((c) => c.id).join(",")}` : ""}`
    });
    const jsonLd = buildProductJsonLd(product, slug);
    let description = product.seoDescription || product.description;
    if (!description) {
      if (productType === "oils-incense") {
        description = `${product.title} - Premium incense for creating a peaceful and aromatic atmosphere in your home.`;
      } else {
        description = `${product.title} - Beautiful home goods celebrating African culture and craftsmanship.`;
      }
    }
    const seoData = buildSEOData({
      title: product.titleLong || product.title,
      description,
      canonical: `${PUBLIC_SITE_URL}/shop/home-goods/${slug}`,
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
    console.error("Error loading home goods product:", err);
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
