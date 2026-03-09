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
    const incenseParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      depth: "2",
      sort,
      "where[tags][in]": tag.id,
      "where[productType][in]": "incense-pack,sage-bundle,palo-santo"
    });
    const incenseProducts = await payloadGet(`/api/oils-incense?${incenseParams.toString()}`);
    const breadcrumbs = [
      { name: "Home", url: `${PUBLIC_SITE_URL}/` },
      { name: "Home Goods", url: `${PUBLIC_SITE_URL}/shop/home-goods` },
      { name: "Tags", url: `${PUBLIC_SITE_URL}/shop/home-goods/tags` },
      { name: tag.name, url: `${PUBLIC_SITE_URL}/shop/home-goods/tags/${tagSlug}` }
    ];
    setHeaders({
      "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400, stale-if-error=86400",
      "Vary": "Accept-Encoding",
      "x-key": `tag:${tag.id},home-goods-by-tag`
    });
    const seoData = buildSEOData({
      title: `${tag.name} Home Goods`,
      description: `Shop home goods tagged with "${tag.name}". ${tag.description || `Discover incense, art, and home decor items related to ${tag.name}.`}`,
      canonical: `${PUBLIC_SITE_URL}/shop/home-goods/tags/${tagSlug}`,
      breadcrumbs,
      noIndex: page > 1
    });
    return {
      tag,
      products: incenseProducts.docs || [],
      pagination: {
        page: incenseProducts.page || 1,
        totalPages: incenseProducts.totalPages || 1,
        hasNextPage: incenseProducts.hasNextPage || false,
        hasPrevPage: incenseProducts.hasPrevPage || false,
        totalDocs: incenseProducts.totalDocs || 0
      },
      currentSort: sort,
      seo: seoData
    };
  } catch (err) {
    if (err?.status === 404) {
      throw err;
    }
    console.error("Error loading home goods products by tag:", err);
    setHeaders({
      "Cache-Control": "public, s-maxage=300"
    });
    throw error(500, "Failed to load tag");
  }
};
export {
  load
};
