import { g as getBusinessBySlug, p as payloadGet } from "../../../../chunks/payload.js";
import { a as buildLocalBusinessJsonLd, b as buildSEOData } from "../../../../chunks/seo.js";
import { P as PUBLIC_SITE_URL } from "../../../../chunks/public.js";
import { error } from "@sveltejs/kit";
import { i as is404Error } from "../../../../chunks/errors.js";
const load = async ({ params, setHeaders }) => {
  const { slug } = params;
  try {
    const business = await getBusinessBySlug(slug);
    if (!business) {
      throw error(404, "Business not found");
    }
    const relatedParams = new URLSearchParams({
      limit: "4",
      depth: "1",
      sort: "-verifiedAt,-averageRating,-createdAt",
      "where[id][not_equals]": business.id
    });
    if (business.category) {
      relatedParams.append("where[category][equals]", business.category);
    }
    if (business.location) {
      relatedParams.append("where[location][contains]", business.location.split(",")[0].trim());
    }
    const relatedBusinesses = await payloadGet(`/api/businesses?${relatedParams.toString()}`);
    const reviewParams = new URLSearchParams({
      limit: "5",
      depth: "2",
      sort: "-createdAt",
      "where[business][equals]": business.id,
      "where[approved][equals]": "true"
    });
    const reviews = await payloadGet(`/api/reviews?${reviewParams.toString()}`);
    const breadcrumbs = [
      { name: "Home", url: `${PUBLIC_SITE_URL}/` },
      { name: "Directory", url: `${PUBLIC_SITE_URL}/directory` },
      { name: business.name, url: `${PUBLIC_SITE_URL}/directory/${slug}` }
    ];
    let cacheControl;
    if (business.verified) {
      cacheControl = "public, s-maxage=43200, stale-while-revalidate=172800, stale-if-error=43200";
    } else {
      cacheControl = "public, s-maxage=21600, stale-while-revalidate=86400, stale-if-error=21600";
    }
    setHeaders({
      "Cache-Control": cacheControl,
      "Vary": "Accept-Encoding",
      // Surrogate keys for targeted purge
      "x-key": `business:${business.id}${business.category ? `,category:${business.category}` : ""}${business.location ? `,location:${business.location.split(",")[0].trim()}` : ""}`
    });
    const jsonLd = buildLocalBusinessJsonLd(business, slug);
    const locationStr = business.location ? ` in ${business.location}` : "";
    const categoryStr = business.category ? ` - ${business.category.charAt(0).toUpperCase() + business.category.slice(1)}` : "";
    const seoData = buildSEOData({
      title: `${business.name}${locationStr}${categoryStr}`,
      description: business.seoDescription || business.description || `${business.name} is a Black-owned business${locationStr}. ${business.specialties?.join(", ") || "Visit us today!"}`,
      canonical: `${PUBLIC_SITE_URL}/directory/${slug}`,
      image: business.logo?.url || business.photos?.[0]?.url,
      imageAlt: business.logo?.alt || `${business.name} logo` || `Photo of ${business.name}`,
      jsonLd,
      breadcrumbs,
      publishedTime: business.createdAt,
      modifiedTime: business.updatedAt
    });
    return {
      business,
      relatedBusinesses: relatedBusinesses.docs || [],
      reviews: reviews.docs || [],
      reviewsPagination: {
        totalDocs: reviews.totalDocs || 0,
        hasNextPage: reviews.hasNextPage || false
      },
      seo: seoData
    };
  } catch (err) {
    if (is404Error(err)) {
      throw err;
    }
    console.error("Error loading business:", err);
    setHeaders({
      "Cache-Control": "public, s-maxage=300"
      // Short cache on error
    });
    throw error(500, "Failed to load business");
  }
};
export {
  load
};
