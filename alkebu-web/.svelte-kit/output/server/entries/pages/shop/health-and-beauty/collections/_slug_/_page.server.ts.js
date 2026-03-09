import { p as payloadGet } from "../../../../../../chunks/payload.js";
import { b as buildSEOData } from "../../../../../../chunks/seo.js";
import { P as PUBLIC_SITE_URL } from "../../../../../../chunks/public.js";
import { c as wellnessCollections, d as oilCollections } from "../../../../../../chunks/catalog.js";
import { error } from "@sveltejs/kit";
const load = async ({ params, url, setHeaders }) => {
  const collectionSlug = params.slug;
  const page = parseInt(url.searchParams.get("p") || "1");
  const sort = url.searchParams.get("sort") || "-createdAt";
  const limit = 24;
  try {
    const allCollections = [...wellnessCollections, ...oilCollections];
    const collection = allCollections.find((c) => c.slug === collectionSlug);
    if (!collection) {
      throw error(404, "Collection not found");
    }
    let allProducts = [];
    let totalDocs = 0;
    const wellnessParams = new URLSearchParams({
      page: page.toString(),
      limit: Math.ceil(limit / 2).toString(),
      depth: "2",
      sort,
      "where[collections][in]": collection.slug
    });
    const wellnessProducts = await payloadGet(`/api/wellness-lifestyle?${wellnessParams.toString()}`);
    allProducts = [...wellnessProducts.docs || []];
    totalDocs += wellnessProducts.totalDocs || 0;
    const oilsParams = new URLSearchParams({
      page: page.toString(),
      limit: Math.ceil(limit / 2).toString(),
      depth: "2",
      sort,
      "where[collections][in]": collection.slug,
      "where[productType][equals]": "fragrance-oil"
    });
    const oilProducts = await payloadGet(`/api/oils-incense?${oilsParams.toString()}`);
    allProducts = [...allProducts, ...oilProducts.docs || []];
    totalDocs += oilProducts.totalDocs || 0;
    const breadcrumbs = [
      { name: "Home", url: `${PUBLIC_SITE_URL}/` },
      { name: "Health & Beauty", url: `${PUBLIC_SITE_URL}/shop/health-and-beauty` },
      { name: "Collections", url: `${PUBLIC_SITE_URL}/shop/health-and-beauty/collections` },
      { name: collection.name, url: `${PUBLIC_SITE_URL}/shop/health-and-beauty/collections/${collectionSlug}` }
    ];
    setHeaders({
      "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400, stale-if-error=86400",
      "Vary": "Accept-Encoding",
      "x-key": `collection:${collection.slug},health-beauty-by-collection`
    });
    const seoData = buildSEOData({
      title: `${collection.name} Health & Beauty`,
      description: `Shop our ${collection.name.toLowerCase()} health and beauty collection. ${collection.description || `Discover wellness products and essential oils in our ${collection.name} collection.`}`,
      canonical: `${PUBLIC_SITE_URL}/shop/health-and-beauty/collections/${collectionSlug}`,
      breadcrumbs,
      noIndex: page > 1
    });
    return {
      collection,
      products: allProducts,
      pagination: {
        page,
        totalPages: Math.ceil(totalDocs / limit),
        hasNextPage: page < Math.ceil(totalDocs / limit),
        hasPrevPage: page > 1,
        totalDocs
      },
      currentSort: sort,
      seo: seoData
    };
  } catch (err) {
    if (err?.status === 404) {
      throw err;
    }
    console.error("Error loading health & beauty collection:", err);
    setHeaders({
      "Cache-Control": "public, s-maxage=300"
    });
    throw error(500, "Failed to load collection");
  }
};
export {
  load
};
