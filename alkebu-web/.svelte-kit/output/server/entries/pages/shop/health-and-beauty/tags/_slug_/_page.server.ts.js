import { p as payloadGet } from "../../../../../../chunks/payload.js";
import { b as buildSEOData } from "../../../../../../chunks/seo.js";
import { P as PUBLIC_SITE_URL } from "../../../../../../chunks/public.js";
import { error } from "@sveltejs/kit";
const load = async ({ params, url, setHeaders }) => {
  const tagSlug = decodeURIComponent(params.slug);
  const page = parseInt(url.searchParams.get("p") || "1");
  const sort = url.searchParams.get("sort") || "-createdAt";
  const limit = 24;
  try {
    const tagsData = await payloadGet(`/api/tags?where[slug][equals]=${tagSlug}&limit=1`);
    const tag = tagsData.docs?.[0];
    if (!tag) {
      throw error(404, "Tag not found");
    }
    let allProducts = [];
    let totalDocs = 0;
    const wellnessParams = new URLSearchParams({
      page: page.toString(),
      limit: Math.ceil(limit / 2).toString(),
      depth: "2",
      sort,
      "where[tags][in]": tag.id
    });
    const wellnessProducts = await payloadGet(`/api/wellness-lifestyle?${wellnessParams.toString()}`);
    allProducts = [...wellnessProducts.docs || []];
    totalDocs += wellnessProducts.totalDocs || 0;
    const oilsParams = new URLSearchParams({
      page: page.toString(),
      limit: Math.ceil(limit / 2).toString(),
      depth: "2",
      sort,
      "where[tags][in]": tag.id,
      "where[productType][equals]": "fragrance-oil"
    });
    const oilProducts = await payloadGet(`/api/oils-incense?${oilsParams.toString()}`);
    allProducts = [...allProducts, ...oilProducts.docs || []];
    totalDocs += oilProducts.totalDocs || 0;
    const breadcrumbs = [
      { name: "Home", url: `${PUBLIC_SITE_URL}/` },
      { name: "Health & Beauty", url: `${PUBLIC_SITE_URL}/shop/health-and-beauty` },
      { name: "Tags", url: `${PUBLIC_SITE_URL}/shop/health-and-beauty/tags` },
      { name: tag.name, url: `${PUBLIC_SITE_URL}/shop/health-and-beauty/tags/${tagSlug}` }
    ];
    setHeaders({
      "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400, stale-if-error=86400",
      "Vary": "Accept-Encoding",
      "x-key": `tag:${tag.id},health-beauty-by-tag`
    });
    const seoData = buildSEOData({
      title: `${tag.name} Health & Beauty Products`,
      description: `Shop health and beauty products tagged with "${tag.name}". ${tag.description || `Discover wellness products and essential oils related to ${tag.name}.`}`,
      canonical: `${PUBLIC_SITE_URL}/shop/health-and-beauty/tags/${tagSlug}`,
      breadcrumbs,
      noIndex: page > 1
    });
    return {
      tag,
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
    console.error("Error loading health & beauty products by tag:", err);
    setHeaders({
      "Cache-Control": "public, s-maxage=300"
    });
    throw error(500, "Failed to load tag");
  }
};
export {
  load
};
