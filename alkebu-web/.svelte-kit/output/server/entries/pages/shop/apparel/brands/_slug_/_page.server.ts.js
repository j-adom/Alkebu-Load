import { p as payloadGet } from "../../../../../../chunks/payload.js";
import { b as buildSEOData } from "../../../../../../chunks/seo.js";
import { P as PUBLIC_SITE_URL } from "../../../../../../chunks/public.js";
import { error } from "@sveltejs/kit";
import { i as is404Error } from "../../../../../../chunks/errors.js";
const load = async ({ params, url, setHeaders }) => {
  const brandSlug = params.slug;
  const page = parseInt(url.searchParams.get("p") || "1");
  const sort = url.searchParams.get("sort") || "-createdAt";
  const limit = 24;
  try {
    const brandName = brandSlug.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
    const productsParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      depth: "1",
      sort,
      "where[brand][equals]": brandName
    });
    const productsData = await payloadGet(`/api/fashion-jewelry?${productsParams.toString()}`);
    if (!productsData.docs || productsData.docs.length === 0) {
      throw error(404, "Brand not found");
    }
    const featuredProductsData = await payloadGet(`/api/fashion-jewelry?where[brand][equals]=${brandName}&where[isFeatured][equals]=true&limit=4&depth=1`);
    const brand = {
      name: brandName,
      slug: brandSlug,
      description: null
      // We don't have a brands collection yet
    };
    const breadcrumbs = [
      { name: "Home", url: `${PUBLIC_SITE_URL}/` },
      { name: "Fashion & Jewelry", url: `${PUBLIC_SITE_URL}/shop/apparel` },
      { name: "Brands", url: `${PUBLIC_SITE_URL}/shop/apparel/brands` },
      { name: brand.name, url: `${PUBLIC_SITE_URL}/shop/apparel/brands/${brandSlug}` }
    ];
    setHeaders({
      "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400, stale-if-error=86400",
      "Vary": "Accept-Encoding",
      "x-key": `brand:${brandSlug},fashion-by-brand`
    });
    const seoData = buildSEOData({
      title: `${brand.name} Fashion & Jewelry`,
      description: `Shop fashion and jewelry from ${brand.name}. ${brand.description || `Discover beautiful pieces from the ${brand.name} collection celebrating African culture and craftsmanship.`}`,
      canonical: `${PUBLIC_SITE_URL}/shop/apparel/brands/${brandSlug}`,
      breadcrumbs,
      noIndex: page > 1
    });
    return {
      brand,
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
    console.error("Error loading brand products:", err);
    setHeaders({
      "Cache-Control": "public, s-maxage=300"
    });
    throw error(500, "Failed to load brand");
  }
};
export {
  load
};
