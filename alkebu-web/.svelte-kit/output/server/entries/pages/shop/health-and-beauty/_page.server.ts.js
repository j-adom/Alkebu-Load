import { p as payloadGet } from "../../../../chunks/payload.js";
import { b as buildSEOData } from "../../../../chunks/seo.js";
import { P as PUBLIC_SITE_URL } from "../../../../chunks/public.js";
import { w as wellnessCategories, o as oilCategories } from "../../../../chunks/catalog.js";
const load = async ({ url, setHeaders }) => {
  const page = parseInt(url.searchParams.get("page") || "1");
  const category = url.searchParams.get("category") || void 0;
  const collection = url.searchParams.get("collection") || void 0;
  const sort = url.searchParams.get("sort") || "-createdAt";
  const limit = 24;
  try {
    let allProducts = [];
    let totalDocs = 0;
    const wellnessParams = new URLSearchParams({
      page: page.toString(),
      limit: Math.ceil(limit / 2).toString(),
      depth: "2",
      sort
    });
    if (category && category !== "oils") {
      wellnessParams.append("where[categories][in]", category);
    }
    const wellnessProducts = await payloadGet(`/api/wellness-lifestyle?${wellnessParams.toString()}`);
    allProducts = [...wellnessProducts.docs || []];
    totalDocs += wellnessProducts.totalDocs || 0;
    const oilsParams = new URLSearchParams({
      page: page.toString(),
      limit: Math.ceil(limit / 2).toString(),
      depth: "2",
      sort,
      "where[productType][equals]": "fragrance-oil"
      // Only get fragrance oils
    });
    if (category === "oils" || category && category !== "wellness") {
      oilsParams.append("where[categories][in]", category);
    }
    const oilProducts = await payloadGet(`/api/oils-incense?${oilsParams.toString()}`);
    allProducts = [...allProducts, ...oilProducts.docs || []];
    totalDocs += oilProducts.totalDocs || 0;
    const categories = Array.from(new Map(
      [...wellnessCategories, ...oilCategories].map((cat) => [cat.slug, cat])
    ).values());
    setHeaders({
      "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400, stale-if-error=86400",
      "Vary": "Accept-Encoding",
      // Surrogate key for targeted purge
      "x-key": `health-beauty${category ? `,category:${category}` : ""}${collection ? `,collection:${collection}` : ""}`
    });
    let title = "Health & Beauty";
    let description = "Discover our wellness products, essential oils, and natural health solutions inspired by African traditions and aromatherapy.";
    if (collection === "wellness") {
      title = "Wellness & Lifestyle";
      description = "Explore our wellness and lifestyle products promoting natural health and wellbeing with African-inspired traditions.";
    } else if (collection === "oils") {
      title = "Essential Oils & Aromatherapy";
      description = "Discover our collection of premium essential oils featuring authentic scents and therapeutic aromatherapy solutions.";
    }
    if (category) {
      title = `${category} - ${title}`;
      description = `Browse our ${category.toLowerCase()} collection of ${description.toLowerCase()}`;
    }
    const seoData = buildSEOData({
      title,
      description,
      canonical: `${PUBLIC_SITE_URL}/shop/health-and-beauty${collection ? `?collection=${collection}` : ""}${category ? `${collection ? "&" : "?"}category=${encodeURIComponent(category)}` : ""}`,
      noIndex: page > 1
      // Don't index pagination pages
    });
    return {
      products: allProducts,
      pagination: {
        page,
        totalPages: Math.ceil(totalDocs / limit),
        hasNextPage: page < Math.ceil(totalDocs / limit),
        hasPrevPage: page > 1,
        totalDocs
      },
      categories,
      collections: [
        { value: "wellness", label: "Wellness & Lifestyle" },
        { value: "oils", label: "Essential Oils & Aromatherapy" }
      ],
      currentCategory: category,
      currentCollection: collection,
      currentSort: sort,
      seo: seoData
    };
  } catch (error) {
    console.error("Error loading health & beauty products:", error);
    setHeaders({
      "Cache-Control": "public, s-maxage=300"
      // Short cache on error
    });
    return {
      products: [],
      pagination: {
        page: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
        totalDocs: 0
      },
      categories: [],
      collections: [],
      currentCategory: category,
      currentCollection: collection,
      currentSort: sort,
      seo: buildSEOData({
        title: "Health & Beauty",
        description: "Discover our wellness products and essential oils.",
        canonical: `${PUBLIC_SITE_URL}/shop/health-and-beauty`,
        noIndex: false
      })
    };
  }
};
export {
  load
};
