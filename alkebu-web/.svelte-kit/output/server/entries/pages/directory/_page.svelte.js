import { g as ensure_array_like, d as attr, e as stringify } from "../../../chunks/index2.js";
import { M as Meta } from "../../../chunks/Meta.js";
import { u as urlFor } from "../../../chunks/payload2.js";
import { e as escape_html } from "../../../chunks/utils2.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    const businesses = data.businesses || [];
    const pagination = data.pagination || { page: 1, totalPages: 1, totalDocs: businesses.length };
    const businessCategories = data.businessCategories || [];
    const directoryCategories = data.directoryCategories || [];
    const locations = data.locations || [];
    const currentCategory = data.currentCategory || "";
    const currentDirectoryCategory = data.currentDirectoryCategory || "";
    const currentLocation = data.currentLocation || "";
    const showVerified = data.showVerified || false;
    const metadata = data.seo;
    const placeholderImage = "/assets/images/resources/placeholder.jpg";
    const formatLocation = (business) => {
      if (!business.location) return "";
      if (typeof business.location === "string") return business.location;
      const parts = [
        business.location.name,
        [
          business.location.address,
          business.location.city,
          business.location.state,
          business.location.zip
        ].filter(Boolean).join(", ")
      ].filter(Boolean);
      return parts.join(" - ");
    };
    const buildLink = (page) => {
      const params = new URLSearchParams();
      if (page > 1) params.set("page", String(page));
      if (currentCategory) params.set("category", currentCategory);
      if (currentDirectoryCategory) params.set("directory", currentDirectoryCategory);
      if (currentLocation) params.set("location", currentLocation);
      if (showVerified) params.set("verified", "true");
      const query = params.toString();
      return `/directory${query ? `?${query}` : ""}`;
    };
    Meta($$renderer2, { metadata });
    $$renderer2.push(`<!----> <section class="page-header" style="background-image: url(/assets/images/resources/page-header-bg.jpg);"><div class="container"><h2>Local Business Directory</h2> <ul class="flex items-center gap-2 text-sm text-white/80"><li><a href="/">Home</a></li> <li><span>Directory</span></li></ul></div></section> <section class="py-12"><div class="container mx-auto px-6 lg:px-12"><div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-10"><div><p class="text-sm text-gray-600">${escape_html(pagination.totalDocs || 0)} listings</p> <h1 class="text-3xl font-bold text-foreground">Support Local Businesses</h1></div> <form method="GET" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3"><div><label class="block text-sm text-gray-700 mb-1" for="category">Category</label> <select id="category" name="category" class="w-full border border-gray-300 rounded px-3 py-2">`);
    $$renderer2.option({ value: "" }, ($$renderer3) => {
      $$renderer3.push(`All`);
    });
    $$renderer2.push(`<!--[-->`);
    const each_array = ensure_array_like(businessCategories);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let category = each_array[$$index];
      $$renderer2.option(
        {
          value: category.value,
          selected: category.value === currentCategory
        },
        ($$renderer3) => {
          $$renderer3.push(`${escape_html(category.label)}`);
        }
      );
    }
    $$renderer2.push(`<!--]--></select></div> <div><label class="block text-sm text-gray-700 mb-1" for="directory">Directory</label> <select id="directory" name="directory" class="w-full border border-gray-300 rounded px-3 py-2">`);
    $$renderer2.option({ value: "" }, ($$renderer3) => {
      $$renderer3.push(`All`);
    });
    $$renderer2.push(`<!--[-->`);
    const each_array_1 = ensure_array_like(directoryCategories);
    for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
      let directory = each_array_1[$$index_1];
      $$renderer2.option(
        {
          value: directory.value,
          selected: directory.value === currentDirectoryCategory
        },
        ($$renderer3) => {
          $$renderer3.push(`${escape_html(directory.label)}`);
        }
      );
    }
    $$renderer2.push(`<!--]--></select></div> <div><label class="block text-sm text-gray-700 mb-1" for="location">Location</label> <select id="location" name="location" class="w-full border border-gray-300 rounded px-3 py-2">`);
    $$renderer2.option({ value: "" }, ($$renderer3) => {
      $$renderer3.push(`Anywhere`);
    });
    $$renderer2.push(`<!--[-->`);
    const each_array_2 = ensure_array_like(locations);
    for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
      let location = each_array_2[$$index_2];
      $$renderer2.option({ value: location, selected: location === currentLocation }, ($$renderer3) => {
        $$renderer3.push(`${escape_html(location)}`);
      });
    }
    $$renderer2.push(`<!--]--></select></div> <div class="flex items-center gap-2 mt-6"><input type="checkbox" id="verified" name="verified" value="true"${attr("checked", showVerified, true)}/> <label for="verified" class="text-sm text-gray-700">Verified only</label></div> <div class="mt-2 md:mt-6"><button type="submit" class="btn-primary w-full">Apply filters</button></div></form></div> `);
    if (businesses.length === 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="bg-gray-50 rounded-lg p-8 text-center"><p class="text-gray-700">No businesses found for these filters.</p> <p class="text-sm text-gray-500 mt-2">Try widening your search or removing filters.</p></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"><!--[-->`);
      const each_array_3 = ensure_array_like(businesses);
      for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
        let business = each_array_3[$$index_3];
        $$renderer2.push(`<a${attr("href", `/directory/${stringify(business.slug)}`)} class="group block bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"><div class="flex items-center gap-4 p-5"><div class="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">`);
        if (business.logo) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<img${attr("src", urlFor(business.logo).width(180).height(180).auto("format").url())}${attr("alt", `${business.name} logo`)} class="w-full h-full object-cover" loading="lazy"/>`);
        } else {
          $$renderer2.push("<!--[!-->");
          $$renderer2.push(`<img${attr("src", placeholderImage)} alt="Placeholder logo" class="w-full h-full object-cover" loading="lazy"/>`);
        }
        $$renderer2.push(`<!--]--></div> <div class="flex-1"><h3 class="text-lg font-bold text-foreground group-hover:text-primary transition-colors">${escape_html(business.name)}</h3> `);
        if (business.category) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<p class="text-sm text-gray-600"><i class="far fa-tag mr-2"></i>${escape_html(business.category)}</p>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--> `);
        if (formatLocation(business)) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<p class="text-sm text-gray-600"><i class="far fa-map-marker-alt mr-2"></i>${escape_html(formatLocation(business))}</p>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--> `);
        if (business.averageRating) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<p class="text-sm text-yellow-600"><i class="fas fa-star mr-1"></i>${escape_html(business.averageRating.toFixed(1))} (${escape_html(business.reviewCount || 0)})</p>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--></div></div> `);
        if (business.description) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<div class="px-5 pb-5 text-sm text-gray-700 line-clamp-2">${escape_html(business.description)}</div>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--></a>`);
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
