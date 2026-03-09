import { p as payloadGet } from "../../../../../../chunks/payload.js";
import { b as buildSEOData } from "../../../../../../chunks/seo.js";
import { P as PUBLIC_SITE_URL } from "../../../../../../chunks/public.js";
import { error } from "@sveltejs/kit";
import { i as is404Error } from "../../../../../../chunks/errors.js";
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
    const productsParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      depth: "2",
      sort,
      "where[tags][in]": tag.id
    });
    const productsData = await payloadGet(`/api/fashion-jewelry?${productsParams.toString()}`);
    const featuredProductsData = await payloadGet(`/api/fashion-jewelry?where[tags][in]=${tag.id}&where[featured][equals]=true&limit=4&depth=1`);
    const breadcrumbs = [
      { name: "Home", url: `${PUBLIC_SITE_URL}/` },
      { name: "Fashion & Jewelry", url: `${PUBLIC_SITE_URL}/shop/apparel` },
      { name: "Tags", url: `${PUBLIC_SITE_URL}/shop/apparel/tags` },
      { name: tag.name, url: `${PUBLIC_SITE_URL}/shop/apparel/tags/${tagSlug}` }
    ];
    setHeaders({
      "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400, stale-if-error=86400",
      "Vary": "Accept-Encoding",
      "x-key": `tag:${tag.id},fashion-by-tag`
    });
    const seoData = buildSEOData({
      title: `${tag.name} Fashion & Jewelry`,
      description: `Shop fashion and jewelry items tagged with "${tag.name}". ${tag.description || `Discover beautiful pieces related to ${tag.name} themes and styles.`}`,
      canonical: `${PUBLIC_SITE_URL}/shop/apparel/tags/${tagSlug}`,
      breadcrumbs,
      noIndex: page > 1
    });
    return {
      tag,
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
    console.error("Error loading fashion products by tag:", err);
    setHeaders({
      "Cache-Control": "public, s-maxage=300"
    });
    throw error(500, "Failed to load tag");
  }
};
export {
  load
};
