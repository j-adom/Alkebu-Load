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
    if (typeSlug === "incense") {
      const incenseParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        depth: "2",
        sort,
        "where[productType][in]": "incense-pack,sage-bundle,palo-santo"
      });
      const incenseData = await payloadGet(`/api/oils-incense?${incenseParams.toString()}`);
      products = incenseData.docs || [];
      totalDocs = incenseData.totalDocs || 0;
      typeName = "Incense & Aromatherapy";
      typeDescription = "Premium incense for creating peaceful and aromatic atmospheres in your home.";
    } else if (typeSlug === "art") {
      typeName = "African Art & Decor";
      typeDescription = "Authentic African art pieces, sculptures, and decorative items celebrating cultural heritage.";
      products = [];
      totalDocs = 0;
    } else if (typeSlug === "imports") {
      typeName = "Cultural Imports";
      typeDescription = "Unique cultural imports and traditional items from across the African diaspora.";
      products = [];
      totalDocs = 0;
    } else if (typeSlug === "home") {
      typeName = "Home Decor";
      typeDescription = "Beautiful home decor items and accessories celebrating African culture.";
      products = [];
      totalDocs = 0;
    } else {
      throw error(404, "Product type not found");
    }
    const breadcrumbs = [
      { name: "Home", url: `${PUBLIC_SITE_URL}/` },
      { name: "Home Goods", url: `${PUBLIC_SITE_URL}/shop/home-goods` },
      { name: "Types", url: `${PUBLIC_SITE_URL}/shop/home-goods/types` },
      { name: typeName, url: `${PUBLIC_SITE_URL}/shop/home-goods/types/${typeSlug}` }
    ];
    setHeaders({
      "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400, stale-if-error=86400",
      "Vary": "Accept-Encoding",
      "x-key": `home-goods-type:${typeSlug}`
    });
    const seoData = buildSEOData({
      title: `${typeName} Products`,
      description: typeDescription,
      canonical: `${PUBLIC_SITE_URL}/shop/home-goods/types/${typeSlug}`,
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
    console.error("Error loading home goods products by type:", err);
    setHeaders({
      "Cache-Control": "public, s-maxage=300"
    });
    throw error(500, "Failed to load product type");
  }
};
export {
  load
};
