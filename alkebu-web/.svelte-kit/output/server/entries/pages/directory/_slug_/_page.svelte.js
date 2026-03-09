import { i as attr_style, e as stringify, d as attr, g as ensure_array_like, c as attr_class } from "../../../../chunks/index2.js";
import { M as Meta } from "../../../../chunks/Meta.js";
import { u as urlFor } from "../../../../chunks/payload2.js";
import { e as escape_html } from "../../../../chunks/utils2.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    const { business, relatedBusinesses, reviews, seo } = data;
    function formatHours(hours) {
      if (!hours) return null;
      const daysOrder = [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday"
      ];
      return daysOrder.map((day) => ({
        day: day.charAt(0).toUpperCase() + day.slice(1),
        ...hours[day]
      }));
    }
    const formattedHours = formatHours(business.hours);
    Meta($$renderer2, { metadata: seo });
    $$renderer2.push(`<!----> <section class="page-header"${attr_style(`background-image: url(${stringify(business.photos?.[0]?.url || "/assets/images/resources/page-header-bg.jpg")});`)}><div class="container"><h2>${escape_html(business.name)}</h2> <ul class="flex items-center gap-2 text-sm text-white/80"><li><a href="/">Home</a></li> <li><a href="/directory">Directory</a></li> <li><span>${escape_html(business.name)}</span></li></ul></div></section> <section class="business-detail py-12"><div class="container mx-auto px-6 lg:px-12"><div class="grid grid-cols-1 lg:grid-cols-3 gap-8"><div class="lg:col-span-2"><div class="flex items-start gap-6 mb-8">`);
    if (business.logo) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="flex-shrink-0"><img${attr("src", urlFor(business.logo).width(120).height(120).auto("format").url())}${attr("alt", `${stringify(business.name)} logo`)} class="w-24 h-24 rounded-lg object-cover shadow-md" loading="eager"/></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div class="flex-1"><div class="flex items-center gap-3 mb-2"><h1 class="text-3xl lg:text-4xl font-bold text-foreground">${escape_html(business.name)}</h1> `);
    if (business.verified) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800"><i class="fas fa-check-circle mr-1"></i> Verified</span>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div> `);
    if (business.category) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<p class="text-lg text-gray-600 mb-2"><i class="far fa-tag mr-2"></i> ${escape_html(business.category)}</p>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (business.averageRating) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="flex items-center gap-2"><div class="flex"><!--[-->`);
      const each_array = ensure_array_like(Array(5));
      for (let i = 0, $$length = each_array.length; i < $$length; i++) {
        each_array[i];
        $$renderer2.push(`<i${attr_class(`fa${stringify(i < Math.round(business.averageRating) ? "s" : "r")} fa-star text-yellow-400`)}></i>`);
      }
      $$renderer2.push(`<!--]--></div> <span class="text-sm text-gray-600">${escape_html(business.averageRating.toFixed(1))} (${escape_html(business.reviewCount || 0)} reviews)</span></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div></div> `);
    if (business.photos && business.photos.length > 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="mb-8"><div class="grid grid-cols-2 md:grid-cols-3 gap-4"><!--[-->`);
      const each_array_1 = ensure_array_like(business.photos.slice(0, 6));
      for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
        let photo = each_array_1[$$index_1];
        $$renderer2.push(`<div class="aspect-square rounded-lg overflow-hidden"><img${attr("src", urlFor(photo).width(400).height(400).auto("format").url())}${attr("alt", photo.alt || business.name)} class="w-full h-full object-cover hover:scale-105 transition-transform duration-300" loading="lazy"/></div>`);
      }
      $$renderer2.push(`<!--]--></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (business.description) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="mb-8"><h2 class="text-2xl font-bold mb-4 text-foreground">About</h2> <div class="prose max-w-none"><p class="text-gray-700 leading-relaxed">${escape_html(business.description)}</p></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (business.specialties && business.specialties.length > 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="mb-8"><h2 class="text-2xl font-bold mb-4 text-foreground">Specialties</h2> <div class="flex flex-wrap gap-2"><!--[-->`);
      const each_array_2 = ensure_array_like(business.specialties);
      for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
        let specialty = each_array_2[$$index_2];
        $$renderer2.push(`<span class="inline-block px-3 py-1 bg-muted text-foreground rounded-full text-sm">${escape_html(specialty)}</span>`);
      }
      $$renderer2.push(`<!--]--></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div class="mb-8"><h2 class="text-2xl font-bold mb-6 text-foreground">Reviews</h2> `);
    if (reviews && reviews.length > 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="space-y-6"><!--[-->`);
      const each_array_3 = ensure_array_like(reviews);
      for (let $$index_4 = 0, $$length = each_array_3.length; $$index_4 < $$length; $$index_4++) {
        let review = each_array_3[$$index_4];
        $$renderer2.push(`<div class="bg-white rounded-lg shadow-md p-6"><div class="flex items-start justify-between mb-3"><div><p class="font-semibold text-foreground">${escape_html(review.author?.name || "Anonymous")}</p> <div class="flex items-center gap-2 mt-1"><div class="flex"><!--[-->`);
        const each_array_4 = ensure_array_like(Array(5));
        for (let i = 0, $$length2 = each_array_4.length; i < $$length2; i++) {
          each_array_4[i];
          $$renderer2.push(`<i${attr_class(`fa${stringify(i < review.rating ? "s" : "r")} fa-star text-yellow-400 text-sm`)}></i>`);
        }
        $$renderer2.push(`<!--]--></div> <span class="text-xs text-gray-500">${escape_html(new Date(review.createdAt).toLocaleDateString())}</span></div></div></div> `);
        if (review.title) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<h3 class="font-semibold mb-2 text-foreground">${escape_html(review.title)}</h3>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--> `);
        if (review.comment) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<p class="text-gray-700">${escape_html(review.comment)}</p>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--></div>`);
      }
      $$renderer2.push(`<!--]--></div> <div class="mt-6 text-center"><button class="btn-primary">Load More Reviews</button></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div class="bg-gray-50 rounded-lg p-8 text-center"><p class="text-gray-600">No reviews yet. Be the first to review this business!</p> <button class="btn-primary mt-4">Write a Review</button></div>`);
    }
    $$renderer2.push(`<!--]--></div></div> <div class="lg:col-span-1"><div class="sticky top-24 space-y-6"><div class="bg-white rounded-lg shadow-lg p-6"><h3 class="text-xl font-bold mb-4 text-foreground">Contact Information</h3> <div class="space-y-4">`);
    if (business.address) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="flex items-start"><i class="far fa-map-marker-alt text-primary text-xl mt-1 mr-3"></i> <div><p class="font-semibold text-foreground">Address</p> <p class="text-gray-700 text-sm">${escape_html(business.address)}</p></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (business.phone) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="flex items-start"><i class="far fa-phone text-primary text-xl mt-1 mr-3"></i> <div><p class="font-semibold text-foreground">Phone</p> <a${attr("href", `tel:${stringify(business.phone)}`)} class="text-gray-700 hover:text-primary text-sm">${escape_html(business.phone)}</a></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (business.email) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="flex items-start"><i class="far fa-envelope text-primary text-xl mt-1 mr-3"></i> <div><p class="font-semibold text-foreground">Email</p> <a${attr("href", `mailto:${stringify(business.email)}`)} class="text-gray-700 hover:text-primary text-sm break-all">${escape_html(business.email)}</a></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (business.website) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="flex items-start"><i class="far fa-globe text-primary text-xl mt-1 mr-3"></i> <div><p class="font-semibold text-foreground">Website</p> <a${attr("href", business.website)} target="_blank" rel="noopener noreferrer" class="text-gray-700 hover:text-primary text-sm break-all">Visit Website <i class="far fa-external-link ml-1 text-xs"></i></a></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (business.socialMedia) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="pt-4 border-t border-gray-200"><p class="font-semibold text-foreground mb-3">Social Media</p> <div class="flex gap-3">`);
      if (business.socialMedia.facebook) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<a${attr("href", business.socialMedia.facebook)} target="_blank" rel="noopener noreferrer" class="text-xl text-gray-600 hover:text-primary" aria-label="Facebook"><i class="fab fa-facebook"></i></a>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> `);
      if (business.socialMedia.instagram) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<a${attr("href", business.socialMedia.instagram)} target="_blank" rel="noopener noreferrer" class="text-xl text-gray-600 hover:text-primary" aria-label="Instagram"><i class="fab fa-instagram"></i></a>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> `);
      if (business.socialMedia.twitter) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<a${attr("href", business.socialMedia.twitter)} target="_blank" rel="noopener noreferrer" class="text-xl text-gray-600 hover:text-primary" aria-label="Twitter"><i class="fab fa-twitter"></i></a>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div></div> `);
    if (formattedHours) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="bg-white rounded-lg shadow-lg p-6"><h3 class="text-xl font-bold mb-4 text-foreground">Business Hours</h3> <div class="space-y-2"><!--[-->`);
      const each_array_5 = ensure_array_like(formattedHours);
      for (let $$index_5 = 0, $$length = each_array_5.length; $$index_5 < $$length; $$index_5++) {
        let { day, open, close, closed } = each_array_5[$$index_5];
        $$renderer2.push(`<div class="flex justify-between text-sm"><span class="font-medium text-foreground">${escape_html(day)}</span> <span class="text-gray-700">${escape_html(closed ? "Closed" : `${open} - ${close}`)}</span></div>`);
      }
      $$renderer2.push(`<!--]--></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div class="bg-muted rounded-lg p-6 space-y-3"><a${attr("href", `tel:${stringify(business.phone)}`)} class="btn-primary w-full text-center block"><i class="far fa-phone mr-2"></i> Call Now</a> `);
    if (business.website) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<a${attr("href", business.website)} target="_blank" rel="noopener noreferrer" class="bg-white text-foreground hover:bg-primary hover:text-white transition-colors rounded px-6 py-3 font-semibold w-full text-center block"><i class="far fa-external-link mr-2"></i> Visit Website</a>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div></div></div></div> `);
    if (relatedBusinesses && relatedBusinesses.length > 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="mt-16"><div class="block-title text-center mb-8"><p>Explore more</p> <h3>Related Businesses</h3> <div class="leaf"><img loading="lazy" src="/assets/images/resources/leaf.png" alt=""/></div></div> <div class="grid grid-cols-1 md:grid-cols-4 gap-6"><!--[-->`);
      const each_array_6 = ensure_array_like(relatedBusinesses);
      for (let $$index_7 = 0, $$length = each_array_6.length; $$index_7 < $$length; $$index_7++) {
        let relatedBusiness = each_array_6[$$index_7];
        $$renderer2.push(`<a${attr("href", `/directory/${stringify(relatedBusiness.slug)}`)} class="group block bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow overflow-hidden">`);
        if (relatedBusiness.logo) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<div class="aspect-square overflow-hidden bg-gray-100 p-4"><img${attr("src", urlFor(relatedBusiness.logo).width(200).height(200).auto("format").url())}${attr("alt", `${stringify(relatedBusiness.name)} logo`)} class="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" loading="lazy"/></div>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--> <div class="p-4"><h4 class="font-bold text-lg mb-1 text-foreground group-hover:text-primary transition-colors">${escape_html(relatedBusiness.name)}</h4> `);
        if (relatedBusiness.category) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<p class="text-sm text-gray-600 mb-2">${escape_html(relatedBusiness.category)}</p>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--> `);
        if (relatedBusiness.averageRating) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<div class="flex items-center gap-1"><div class="flex text-xs"><!--[-->`);
          const each_array_7 = ensure_array_like(Array(5));
          for (let i = 0, $$length2 = each_array_7.length; i < $$length2; i++) {
            each_array_7[i];
            $$renderer2.push(`<i${attr_class(`fa${stringify(i < Math.round(relatedBusiness.averageRating) ? "s" : "r")} fa-star text-yellow-400`)}></i>`);
          }
          $$renderer2.push(`<!--]--></div> <span class="text-xs text-gray-600">(${escape_html(relatedBusiness.reviewCount || 0)})</span></div>`);
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
