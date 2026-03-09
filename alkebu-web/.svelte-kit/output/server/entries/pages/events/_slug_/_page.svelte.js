import { i as attr_style, e as stringify, d as attr, g as ensure_array_like } from "../../../../chunks/index2.js";
import { M as Meta } from "../../../../chunks/Meta.js";
import { u as urlFor } from "../../../../chunks/payload2.js";
import { a as formatDate } from "../../../../chunks/date.js";
import { e as escape_html } from "../../../../chunks/utils2.js";
import { h as html } from "../../../../chunks/html.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    const { event, relatedEvents, isPastEvent, seo } = data;
    const startDate = new Date(event.startDate);
    const endDate = event.endDate ? new Date(event.endDate) : null;
    const dateDisplay = endDate && endDate.toDateString() !== startDate.toDateString() ? `${formatDate(event.startDate)} - ${formatDate(event.endDate)}` : formatDate(event.startDate);
    const timeDisplay = new Date(event.startDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    Meta($$renderer2, { metadata: seo });
    $$renderer2.push(`<!----> <section class="page-header"${attr_style(`background-image: url(${stringify(event.featuredImage?.url || "/assets/images/resources/page-header-bg.jpg")});`)}><div class="container"><h2>${escape_html(event.title)}</h2> <ul class="flex items-center gap-2 text-sm text-white/80"><li><a href="/">Home</a></li> <li><a href="/events">Events</a></li> <li><span>${escape_html(event.title)}</span></li></ul></div></section> <section class="event-detail py-12"><div class="container mx-auto px-6 lg:px-12"><div class="grid grid-cols-1 lg:grid-cols-3 gap-8"><div class="lg:col-span-2">`);
    if (event.featuredImage) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="mb-8 rounded-lg overflow-hidden"><img${attr("src", urlFor(event.featuredImage).width(800).height(450).auto("format").url())}${attr("alt", event.featuredImage.alt || event.title)} class="w-full h-auto" loading="eager"/></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div class="mb-8"><div class="flex flex-wrap gap-4 mb-6">`);
    if (isPastEvent) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<span class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-200 text-gray-700"><i class="far fa-calendar-check mr-2"></i> Past Event</span>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<span class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary text-white"><i class="far fa-calendar-star mr-2"></i> Upcoming</span>`);
    }
    $$renderer2.push(`<!--]--> `);
    if (event.type) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<span class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-muted text-foreground"><i class="far fa-tag mr-2"></i> ${escape_html(event.type)}</span>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div> <h1 class="text-3xl lg:text-4xl font-bold mb-4 text-foreground">${escape_html(event.title)}</h1> `);
    if (event.description) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="prose max-w-none mb-8"><p class="text-lg text-gray-700">${escape_html(event.description)}</p></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (event.content) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="prose max-w-none">${html(event.content)}</div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div></div> <div class="lg:col-span-1"><div class="sticky top-24 space-y-6"><div class="bg-white rounded-lg shadow-lg p-6"><h3 class="text-xl font-bold mb-4 text-foreground">Event Details</h3> <div class="space-y-4"><div class="flex items-start"><i class="far fa-calendar text-primary text-xl mt-1 mr-3"></i> <div><p class="font-semibold text-foreground">Date</p> <p class="text-gray-700">${escape_html(dateDisplay)}</p> <p class="text-sm text-gray-600">${escape_html(timeDisplay)}</p></div></div> `);
    if (event.location) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="flex items-start"><i class="far fa-map-marker-alt text-primary text-xl mt-1 mr-3"></i> <div><p class="font-semibold text-foreground">Location</p> <p class="text-gray-700">${escape_html(event.location)}</p></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (event.venue) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="flex items-start"><i class="far fa-building text-primary text-xl mt-1 mr-3"></i> <div><p class="font-semibold text-foreground">Venue</p> <p class="text-gray-700">${escape_html(event.venue.name)}</p></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (event.cost !== void 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="flex items-start"><i class="far fa-ticket text-primary text-xl mt-1 mr-3"></i> <div><p class="font-semibold text-foreground">Cost</p> <p class="text-gray-700">${escape_html(event.cost === 0 || event.cost === "0" ? "Free" : `$${event.cost}`)}</p></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (event.registrationUrl && !isPastEvent) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="mt-6"><a${attr("href", event.registrationUrl)} target="_blank" rel="noopener noreferrer" class="btn-primary w-full text-center block">Register Now <i class="far fa-external-link ml-2"></i></a></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (event.contactEmail || event.contactPhone) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="pt-4 border-t border-gray-200"><p class="font-semibold text-foreground mb-2">Contact</p> `);
      if (event.contactEmail) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<p class="text-sm text-gray-700"><i class="far fa-envelope mr-2"></i> <a${attr("href", `mailto:${stringify(event.contactEmail)}`)} class="hover:text-primary">${escape_html(event.contactEmail)}</a></p>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> `);
      if (event.contactPhone) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<p class="text-sm text-gray-700"><i class="far fa-phone mr-2"></i> <a${attr("href", `tel:${stringify(event.contactPhone)}`)} class="hover:text-primary">${escape_html(event.contactPhone)}</a></p>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div></div> <div class="bg-muted rounded-lg p-6"><h3 class="text-lg font-bold mb-3 text-foreground">Share Event</h3> <div class="flex gap-3"><a${attr("href", `https://www.facebook.com/sharer/sharer.php?u=${stringify(encodeURIComponent(seo.canonical))}`)} target="_blank" rel="noopener noreferrer" class="flex-1 bg-white hover:bg-primary hover:text-white transition-colors rounded p-2 text-center" aria-label="Share on Facebook"><i class="fab fa-facebook-f"></i></a> <a${attr("href", `https://twitter.com/intent/tweet?url=${stringify(encodeURIComponent(seo.canonical))}&text=${stringify(encodeURIComponent(event.title))}`)} target="_blank" rel="noopener noreferrer" class="flex-1 bg-white hover:bg-primary hover:text-white transition-colors rounded p-2 text-center" aria-label="Share on Twitter"><i class="fab fa-twitter"></i></a> <a${attr("href", `mailto:?subject=${stringify(encodeURIComponent(event.title))}&body=${stringify(encodeURIComponent(seo.canonical))}`)} class="flex-1 bg-white hover:bg-primary hover:text-white transition-colors rounded p-2 text-center" aria-label="Share via Email"><i class="far fa-envelope"></i></a></div></div></div></div></div> `);
    if (relatedEvents && relatedEvents.length > 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="mt-16"><div class="block-title text-center mb-8"><p>Don't miss out</p> <h3>${escape_html(isPastEvent ? "Similar Events" : "Upcoming Events")}</h3> <div class="leaf"><img loading="lazy" src="/assets/images/resources/leaf.png" alt=""/></div></div> <div class="grid grid-cols-1 md:grid-cols-3 gap-6"><!--[-->`);
      const each_array = ensure_array_like(relatedEvents);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let relatedEvent = each_array[$$index];
        $$renderer2.push(`<a${attr("href", `/events/${stringify(relatedEvent.slug)}`)} class="group block bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow overflow-hidden">`);
        if (relatedEvent.featuredImage) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<div class="aspect-video overflow-hidden"><img${attr("src", urlFor(relatedEvent.featuredImage).width(400).height(225).auto("format").url())}${attr("alt", relatedEvent.featuredImage.alt || relatedEvent.title)} class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy"/></div>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--> <div class="p-4"><p class="text-sm text-primary mb-2"><i class="far fa-calendar mr-1"></i> ${escape_html(formatDate(relatedEvent.startDate))}</p> <h4 class="font-bold text-lg mb-2 text-foreground group-hover:text-primary transition-colors">${escape_html(relatedEvent.title)}</h4> `);
        if (relatedEvent.description) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<p class="text-sm text-gray-600 line-clamp-2 svelte-1pckhrw">${escape_html(relatedEvent.description)}</p>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--></div></a>`);
      }
      $$renderer2.push(`<!--]--></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div></section>`);
  });
}
export {
  _page as default
};
