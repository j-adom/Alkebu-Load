import { p as payloadGet } from "../../../../../../chunks/payload.js";
import { b as buildSEOData } from "../../../../../../chunks/seo.js";
import { P as PUBLIC_SITE_URL } from "../../../../../../chunks/public.js";
import { error } from "@sveltejs/kit";
const load = async ({ params, url, setHeaders }) => {
  const typeSlug = params.slug;
  const page = parseInt(url.searchParams.get("p") || "1");
  const sort = url.searchParams.get("sort") || "-createdAt";
  const limit = 24;
  try {
    let products = [];
    let totalDocs = 0;
    let typeName = "";
    let typeDescription = "";
    if (typeSlug === "wellness") {
      const wellnessParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        depth: "2",
        sort
      });
      const wellnessData = await payloadGet(`/api/wellness-lifestyle?${wellnessParams.toString()}`);
      products = wellnessData.docs || [];
      totalDocs = wellnessData.totalDocs || 0;
      typeName = "Wellness & Lifestyle";
      typeDescription = "Wellness and lifestyle products promoting natural health and wellbeing.";
    } else if (typeSlug === "oils") {
      const oilsParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        depth: "2",
        sort,
        "where[productType][equals]": "fragrance-oil"
      });
      const oilsData = await payloadGet(`/api/oils-incense?${oilsParams.toString()}`);
      products = oilsData.docs || [];
      totalDocs = oilsData.totalDocs || 0;
      typeName = "Essential Oils";
      typeDescription = "Premium essential oils for aromatherapy and therapeutic wellness.";
    } else {
      throw error(404, "Product type not found");
    }
    const breadcrumbs = [
      { name: "Home", url: `${PUBLIC_SITE_URL}/` },
      { name: "Health & Beauty", url: `${PUBLIC_SITE_URL}/shop/health-and-beauty` },
      { name: "Types", url: `${PUBLIC_SITE_URL}/shop/health-and-beauty/types` },
      { name: typeName, url: `${PUBLIC_SITE_URL}/shop/health-and-beauty/types/${typeSlug}` }
    ];
    setHeaders({
      "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400, stale-if-error=86400",
      "Vary": "Accept-Encoding",
      "x-key": `health-beauty-type:${typeSlug}`
    });
    const seoData = buildSEOData({
      title: `${typeName} Products`,
      description: typeDescription,
      canonical: `${PUBLIC_SITE_URL}/shop/health-and-beauty/types/${typeSlug}`,
      breadcrumbs,
      noIndex: page > 1
    });
    return {
      type: {
        name: typeName,
        slug: typeSlug,
        description: typeDescription
      },
      products,
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
    console.error("Error loading health & beauty products by type:", err);
    setHeaders({
      "Cache-Control": "public, s-maxage=300"
    });
    throw error(500, "Failed to load product type");
  }
};
export {
  load
};
