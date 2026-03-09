import { g as ensure_array_like, d as attr, e as stringify } from "../../../chunks/index2.js";
import { M as Meta } from "../../../chunks/Meta.js";
import { u as urlFor } from "../../../chunks/payload2.js";
import { f as formatDateShort } from "../../../chunks/date.js";
import { e as escape_html } from "../../../chunks/utils2.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    const events = data.events || [];
    const pagination = data.pagination || { page: 1, totalPages: 1, totalDocs: events.length };
    const eventTypes = data.eventTypes || [];
    const currentType = data.currentType || "";
    const upcoming = data.upcoming ?? true;
    const metadata = data.seo;
    const placeholderImage = "/assets/images/resources/placeholder.jpg";
    const formatLocation = (event) => {
      if (!event.location) return "";
      if (typeof event.location === "string") return event.location;
      const parts = [
        event.location.name,
        [
          event.location.address,
          event.location.city,
          event.location.state,
          event.location.zip
        ].filter(Boolean).join(", ")
      ].filter(Boolean);
      return parts.join(" - ");
    };
    const buildLink = (page) => {
      const params = new URLSearchParams();
      if (page > 1) params.set("page", String(page));
      if (currentType) params.set("type", currentType);
      if (upcoming === false) params.set("upcoming", "false");
      const query = params.toString();
      return `/events${query ? `?${query}` : ""}`;
    };
    Meta($$renderer2, { metadata });
    $$renderer2.push(`<!----> <section class="page-header" style="background-image: url(/assets/images/resources/page-header-bg.jpg);"><div class="container"><h2>Events</h2> <ul class="flex items-center gap-2 text-sm text-white/80"><li><a href="/">Home</a></li> <li><span>Events</span></li></ul></div></section> <section class="py-12"><div class="container mx-auto px-6 lg:px-12"><div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8"><div><p class="text-sm text-muted-foreground">${escape_html(pagination.totalDocs || 0)} ${escape_html(upcoming === false ? "past" : "upcoming")} event${escape_html((pagination.totalDocs || 0) === 1 ? "" : "s")}</p> <h1 class="text-3xl font-bold text-foreground">What's happening</h1></div> <form method="GET" class="flex flex-wrap items-end gap-4"><div><label class="block text-sm font-medium text-foreground mb-2" for="type">Event type</label> <select id="type" name="type" class="select-modern min-w-[140px]">`);
    $$renderer2.option({ value: "" }, ($$renderer3) => {
      $$renderer3.push(`All`);
    });
    $$renderer2.push(`<!--[-->`);
    const each_array = ensure_array_like(eventTypes);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let type = each_array[$$index];
      $$renderer2.option({ value: type.value, selected: type.value === currentType }, ($$renderer3) => {
        $$renderer3.push(`${escape_html(type.label)}`);
      });
    }
    $$renderer2.push(`<!--]--></select></div> <div><label class="block text-sm font-medium text-foreground mb-2" for="timing">Timing</label> <select id="timing" name="upcoming" class="select-modern min-w-[140px]">`);
    $$renderer2.option({ value: "true", selected: upcoming !== false }, ($$renderer3) => {
      $$renderer3.push(`Upcoming`);
    });
    $$renderer2.option({ value: "false", selected: upcoming === false }, ($$renderer3) => {
      $$renderer3.push(`Past`);
    });
    $$renderer2.push(`</select></div> <div><button type="submit" class="btn-primary btn-sm">Apply filters</button></div></form></div> `);
    if (events.length === 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="bg-gray-50 rounded-lg p-8 text-center"><p class="text-muted-foreground">No events found.</p> <p class="text-sm text-muted-foreground mt-2">Check back soon for new happenings.</p></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"><!--[-->`);
      const each_array_1 = ensure_array_like(events);
      for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
        let event = each_array_1[$$index_1];
        $$renderer2.push(`<a${attr("href", `/events/${stringify(event.slug)}`)} class="group block bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"><div class="relative">`);
        if (event.featuredImage) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<img${attr("src", urlFor(event.featuredImage).width(600).height(360).auto("format").url())}${attr("alt", event.featuredImage.alt || event.title)} class="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy"/>`);
        } else {
          $$renderer2.push("<!--[!-->");
          $$renderer2.push(`<img${attr("src", placeholderImage)} alt="Placeholder" class="w-full h-48 object-cover" loading="lazy"/>`);
        }
        $$renderer2.push(`<!--]--> <div class="absolute top-3 left-3 bg-primary text-white text-sm font-semibold px-3 py-1 rounded">${escape_html(formatDateShort(event.startDate))}</div></div> <div class="p-5 space-y-2"><h3 class="text-lg font-bold text-foreground group-hover:text-primary transition-colors">${escape_html(event.title)}</h3> `);
        if (event.type) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<p class="text-sm text-muted-foreground"><i class="far fa-tag mr-2"></i>${escape_html(event.type)}</p>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--> `);
        if (formatLocation(event)) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<p class="text-sm text-muted-foreground"><i class="far fa-map-marker-alt mr-2"></i>${escape_html(formatLocation(event))}</p>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--></div></a>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]--> `);
    if (pagination.totalPages > 1) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="flex items-center justify-center gap-3 mt-10">`);
      if (pagination.hasPrevPage) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<a${attr("href", buildLink(pagination.page - 1))} class="px-4 py-2 border rounded hover:bg-gray-100">Previous</a>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> <span class="px-4 py-2 bg-muted rounded font-semibold text-foreground">Page ${escape_html(pagination.page)} of ${escape_html(pagination.totalPages)}</span> `);
      if (pagination.hasNextPage) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<a${attr("href", buildLink(pagination.page + 1))} class="px-4 py-2 border rounded hover:bg-gray-100">Next</a>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div></section>`);
  });
}
export {
  _page as default
};
