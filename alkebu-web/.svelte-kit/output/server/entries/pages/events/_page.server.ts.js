import { p as payloadGet } from "../../../chunks/payload.js";
import { b as buildSEOData } from "../../../chunks/seo.js";
import { P as PUBLIC_SITE_URL } from "../../../chunks/public.js";
const load = async ({ url, setHeaders }) => {
  const page = parseInt(url.searchParams.get("page") || "1");
  const type = url.searchParams.get("type") || void 0;
  const upcoming = url.searchParams.get("upcoming") !== "false";
  const limit = 12;
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      depth: "2",
      sort: upcoming ? "startDate" : "-startDate"
    });
    if (upcoming) {
      params.append("where[startDate][greater_than_equal]", (/* @__PURE__ */ new Date()).toISOString());
    }
    if (type) {
      params.append("where[type][equals]", type);
    }
    const events = await payloadGet(`/api/events?${params.toString()}`);
    const eventTypes = [
      { value: "book-signing", label: "Book Signings" },
      { value: "workshop", label: "Workshops" },
      { value: "reading", label: "Readings" },
      { value: "discussion", label: "Discussions" },
      { value: "community", label: "Community Events" }
    ];
    setHeaders({
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=21600, stale-if-error=3600",
      "Vary": "Accept-Encoding",
      // Surrogate key for targeted purge
      "x-key": `events${type ? `,type:${type}` : ""}${upcoming ? ",upcoming" : ",past"}`
    });
    const seoData = buildSEOData({
      title: type ? `${type.charAt(0).toUpperCase() + type.slice(1).replace("-", " ")} Events` : "Events",
      description: upcoming ? "Join us for upcoming literary events, book signings, workshops, and community gatherings celebrating African diaspora culture." : "Browse our past events including book signings, workshops, and community gatherings.",
      canonical: `${PUBLIC_SITE_URL}/events${type ? `?type=${encodeURIComponent(type)}` : ""}${!upcoming ? "&upcoming=false" : ""}`,
      noIndex: page > 1
      // Don't index pagination pages
    });
    return {
      events: events.docs || [],
      pagination: {
        page: events.page || 1,
        totalPages: events.totalPages || 1,
        hasNextPage: events.hasNextPage || false,
        hasPrevPage: events.hasPrevPage || false,
        totalDocs: events.totalDocs || 0
      },
      eventTypes,
      currentType: type,
      upcoming,
      seo: seoData
    };
  } catch (error) {
    console.error("Error loading events:", error);
    setHeaders({
      "Cache-Control": "public, s-maxage=300"
      // Short cache on error
    });
    return {
      events: [],
      pagination: {
        page: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
        totalDocs: 0
      },
      eventTypes: [],
      currentType: type,
      upcoming,
      seo: buildSEOData({
        title: "Events",
        description: "Join us for literary events celebrating African diaspora culture.",
        canonical: `${PUBLIC_SITE_URL}/events`,
        noIndex: false
      })
    };
  }
};
export {
  load
};
