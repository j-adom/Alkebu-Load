import { p as payloadGet } from "../../../../../../chunks/payload.js";
import { f as fashionCategories } from "../../../../../../chunks/catalog.js";
import { b as buildSEOData } from "../../../../../../chunks/seo.js";
import { P as PUBLIC_SITE_URL } from "../../../../../../chunks/public.js";
import { error } from "@sveltejs/kit";
import { i as is404Error } from "../../../../../../chunks/errors.js";
const load = async ({ params, url, setHeaders }) => {
  const categorySlug = params.slug;
  const page = parseInt(url.searchParams.get("p") || "1");
  const sort = url.searchParams.get("sort") || "-createdAt";
  const limit = 24;
  try {
    const category = fashionCategories.find((c) => c.slug === categorySlug);
    if (!category) {
      throw error(404, "Category not found");
    }
    const productsParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      depth: "2",
      sort,
      "where[categories][in]": category.slug
    });
    const productsData = await payloadGet(`/api/fashion-jewelry?${productsParams.toString()}`);
    const featuredProductsData = await payloadGet(`/api/fashion-jewelry?where[categories][in]=${category.slug}&where[featured][equals]=true&limit=4&depth=1`);
    const breadcrumbs = [
      { name: "Home", url: `${PUBLIC_SITE_URL}/` },
      { name: "Fashion & Jewelry", url: `${PUBLIC_SITE_URL}/shop/apparel` },
      { name: "Categories", url: `${PUBLIC_SITE_URL}/shop/apparel/categories` },
      { name: category.name, url: `${PUBLIC_SITE_URL}/shop/apparel/categories/${categorySlug}` }
    ];
    setHeaders({
      "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400, stale-if-error=86400",
      "Vary": "Accept-Encoding",
      "x-key": `category:${category.slug},fashion-by-category`
    });
    const seoData = buildSEOData({
      title: `${category.name} Fashion & Jewelry`,
      description: `Shop ${category.name.toLowerCase()} fashion and jewelry. ${category.description || `Discover beautiful ${category.name.toLowerCase()} pieces celebrating African culture and style.`}`,
      canonical: `${PUBLIC_SITE_URL}/shop/apparel/categories/${categorySlug}`,
      breadcrumbs,
      noIndex: page > 1
    });
    return {
      category,
      products: productsData.docs || [],
      pagination: {
        page: productsData.page || 1,
        totalPages: productsData.totalPages || 1,
        hasNextPage: productsData.hasNextPage || false,
        hasPrevPage: productsData.hasPrevPage || false,
        totalDocs: productsData.totalDocs || 0
      },
      featuredProducts: featuredProductsData.docs || [],
      currentSort: sort,
      seo: seoData
    };
  } catch (err) {
    if (is404Error(err)) {
      throw err;
    }
    console.error("Error loading category products:", err);
    setHeaders({
      "Cache-Control": "public, s-maxage=300"
    });
    throw error(500, "Failed to load category");
  }
};
export {
  load
};
