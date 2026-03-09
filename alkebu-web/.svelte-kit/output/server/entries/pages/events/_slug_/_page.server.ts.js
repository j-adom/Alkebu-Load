import { a as getEventBySlug, p as payloadGet } from "../../../../chunks/payload.js";
import { c as buildEventJsonLd, b as buildSEOData } from "../../../../chunks/seo.js";
import { P as PUBLIC_SITE_URL } from "../../../../chunks/public.js";
import { error } from "@sveltejs/kit";
import { i as is404Error } from "../../../../chunks/errors.js";
const load = async ({ params, setHeaders }) => {
  const { slug } = params;
  try {
    const event = await getEventBySlug(slug);
    if (!event) {
      throw error(404, "Event not found");
    }
    const relatedParams = new URLSearchParams({
      limit: "3",
      depth: "1",
      sort: "startDate",
      "where[id][not_equals]": event.id
    });
    const now = (/* @__PURE__ */ new Date()).toISOString();
    if (new Date(event.startDate) >= /* @__PURE__ */ new Date()) {
      relatedParams.append("where[startDate][greater_than_equal]", now);
    } else if (event.type) {
      relatedParams.append("where[type][equals]", event.type);
    }
    const relatedEvents = await payloadGet(`/api/events?${relatedParams.toString()}`);
    const breadcrumbs = [
      { name: "Home", url: `${PUBLIC_SITE_URL}/` },
      { name: "Events", url: `${PUBLIC_SITE_URL}/events` },
      { name: event.title, url: `${PUBLIC_SITE_URL}/events/${slug}` }
    ];
    const eventDate = new Date(event.startDate);
    const isPastEvent = eventDate < /* @__PURE__ */ new Date();
    const isWithin24Hours = Math.abs(eventDate.getTime() - Date.now()) < 24 * 60 * 60 * 1e3;
    let cacheControl;
    if (isPastEvent) {
      cacheControl = "public, s-maxage=604800, stale-while-revalidate=2592000, stale-if-error=604800";
    } else if (isWithin24Hours) {
      cacheControl = "public, s-maxage=300, stale-while-revalidate=1800, stale-if-error=300";
    } else {
      cacheControl = "public, s-maxage=21600, stale-while-revalidate=86400, stale-if-error=21600";
    }
    setHeaders({
      "Cache-Control": cacheControl,
      "Vary": "Accept-Encoding",
      // Surrogate keys for targeted purge
      "x-key": `event:${event.id}${event.type ? `,event-type:${event.type}` : ""}${event.venue ? `,venue:${event.venue.id}` : ""}`
    });
    const jsonLd = buildEventJsonLd(event, slug);
    const eventDateStr = new Date(event.startDate).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    const seoData = buildSEOData({
      title: event.title,
      description: event.seoDescription || event.description || `Join us for ${event.title} on ${eventDateStr}. ${event.location || "Location TBA"}.`,
      canonical: `${PUBLIC_SITE_URL}/events/${slug}`,
      image: event.featuredImage?.url,
      imageAlt: event.featuredImage?.alt || `Featured image for ${event.title}`,
      jsonLd,
      breadcrumbs,
      publishedTime: event.createdAt,
      modifiedTime: event.updatedAt
    });
    return {
      event,
      relatedEvents: relatedEvents.docs || [],
      isPastEvent,
      isWithin24Hours,
      seo: seoData
    };
  } catch (err) {
    if (is404Error(err)) {
      throw err;
    }
    console.error("Error loading event:", err);
    setHeaders({
      "Cache-Control": "public, s-maxage=300"
      // Short cache on error
    });
    throw error(500, "Failed to load event");
  }
};
export {
  load
};
