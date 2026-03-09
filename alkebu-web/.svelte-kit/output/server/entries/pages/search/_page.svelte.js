import { s as sanitize_props, a as spread_props, b as slot, f as store_get, q as head, d as attr, g as ensure_array_like, u as unsubscribe_stores } from "../../../chunks/index2.js";
import { p as page } from "../../../chunks/stores.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/state.svelte.js";
import { P as PayloadImage } from "../../../chunks/PayloadImage.js";
import { f as formatCurrency } from "../../../chunks/currency.js";
import { S as Search } from "../../../chunks/search.js";
import { B as Book_open } from "../../../chunks/book-open.js";
import { S as Shopping_bag } from "../../../chunks/shopping-bag.js";
import { I as Icon } from "../../../chunks/Icon.js";
import { A as Arrow_right } from "../../../chunks/arrow-right.js";
import { e as escape_html } from "../../../chunks/utils2.js";
function House($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  /**
   * @license lucide-svelte v0.452.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const iconNode = [
    [
      "path",
      { "d": "M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" }
    ],
    [
      "path",
      {
        "d": "M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
      }
    ]
  ];
  Icon($$renderer, spread_props([
    { name: "house" },
    $$sanitized_props,
    {
      /**
       * @component @name House
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTUgMjF2LThhMSAxIDAgMCAwLTEtMWgtNGExIDEgMCAwIDAtMSAxdjgiIC8+CiAgPHBhdGggZD0iTTMgMTBhMiAyIDAgMCAxIC43MDktMS41MjhsNy01Ljk5OWEyIDIgMCAwIDEgMi41ODIgMGw3IDUuOTk5QTIgMiAwIDAgMSAyMSAxMHY5YTIgMiAwIDAgMS0yIDJINWEyIDIgMCAwIDEtMi0yeiIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/house
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      iconNode,
      children: ($$renderer2) => {
        $$renderer2.push(`<!--[-->`);
        slot($$renderer2, $$props, "default", {}, null);
        $$renderer2.push(`<!--]-->`);
      },
      $$slots: { default: true }
    }
  ]));
}
function Sparkles($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  /**
   * @license lucide-svelte v0.452.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const iconNode = [
    [
      "path",
      {
        "d": "M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
      }
    ],
    ["path", { "d": "M20 3v4" }],
    ["path", { "d": "M22 5h-4" }],
    ["path", { "d": "M4 17v2" }],
    ["path", { "d": "M5 18H3" }]
  ];
  Icon($$renderer, spread_props([
    { name: "sparkles" },
    $$sanitized_props,
    {
      /**
       * @component @name Sparkles
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNOS45MzcgMTUuNUEyIDIgMCAwIDAgOC41IDE0LjA2M2wtNi4xMzUtMS41ODJhLjUuNSAwIDAgMSAwLS45NjJMOC41IDkuOTM2QTIgMiAwIDAgMCA5LjkzNyA4LjVsMS41ODItNi4xMzVhLjUuNSAwIDAgMSAuOTYzIDBMMTQuMDYzIDguNUEyIDIgMCAwIDAgMTUuNSA5LjkzN2w2LjEzNSAxLjU4MWEuNS41IDAgMCAxIDAgLjk2NEwxNS41IDE0LjA2M2EyIDIgMCAwIDAtMS40MzcgMS40MzdsLTEuNTgyIDYuMTM1YS41LjUgMCAwIDEtLjk2MyAweiIgLz4KICA8cGF0aCBkPSJNMjAgM3Y0IiAvPgogIDxwYXRoIGQ9Ik0yMiA1aC00IiAvPgogIDxwYXRoIGQ9Ik00IDE3djIiIC8+CiAgPHBhdGggZD0iTTUgMThIMyIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/sparkles
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      iconNode,
      children: ($$renderer2) => {
        $$renderer2.push(`<!--[-->`);
        slot($$renderer2, $$props, "default", {}, null);
        $$renderer2.push(`<!--]-->`);
      },
      $$slots: { default: true }
    }
  ]));
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let { data } = $$props;
    let searchQuery = store_get($$store_subs ??= {}, "$page", page).url.searchParams.get("q") || "";
    let typeFilter = data.typeFilter || store_get($$store_subs ??= {}, "$page", page).url.searchParams.get("type") || "all";
    const availableTypes = data.availableTypes || [];
    const typeLabel = (value) => availableTypes.find((t) => t.value === value)?.label || value;
    const isString = (val) => typeof val === "string";
    let results = data.results || [];
    let pagination = data.pagination || { totalDocs: 0 };
    let searchTime = data.searchTime || 0;
    head($$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>${escape_html(data.seo?.title)}</title>`);
      });
      $$renderer3.push(`<meta name="description"${attr("content", data.seo?.description)}/> `);
      if (data.seo?.canonical) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<link rel="canonical"${attr("href", data.seo.canonical)}/>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> `);
      if (data.seo?.noIndex) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<meta name="robots" content="noindex,nofollow"/>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]-->`);
    });
    $$renderer2.push(`<section class="relative py-16 md:py-20 bg-gradient-to-br from-kente-forest via-kente-indigo to-kente-forest overflow-hidden"><div class="absolute inset-0 bg-black/30"></div> <div class="container relative z-10 mx-auto px-4"><div class="max-w-3xl mx-auto text-center"><h1 class="text-4xl md:text-5xl font-bold text-white mb-4 font-display">Search Our Collection</h1> <p class="text-white/80 text-lg mb-8">Find books, products, events, and businesses</p> <div class="bg-white/10 backdrop-blur-md rounded-2xl p-2"><div class="flex flex-col sm:flex-row gap-2"><div class="relative flex-1">`);
    Search($$renderer2, {
      class: "absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"
    });
    $$renderer2.push(`<!----> <input${attr("value", searchQuery)} type="text" placeholder="Search for books, products, events, businesses..." class="input-modern pl-12 bg-white"/></div> `);
    $$renderer2.select(
      {
        value: typeFilter,
        class: "select-modern bg-white sm:w-40",
        "aria-label": "Filter by type"
      },
      ($$renderer3) => {
        $$renderer3.push(`<!--[-->`);
        const each_array = ensure_array_like(availableTypes);
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let typeOption = each_array[$$index];
          $$renderer3.option({ value: typeOption.value }, ($$renderer4) => {
            $$renderer4.push(`${escape_html(typeOption.label)}`);
          });
        }
        $$renderer3.push(`<!--]-->`);
      }
    );
    $$renderer2.push(` <button class="btn-primary">`);
    Search($$renderer2, { class: "w-5 h-5" });
    $$renderer2.push(`<!----> Search</button></div></div></div></div></section> <section class="section bg-background"><div class="container mx-auto px-4"><div class="max-w-6xl mx-auto">`);
    if (searchQuery) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="mb-8 flex items-center justify-between flex-wrap gap-3"><h2 class="text-2xl font-bold">`);
      if (pagination.totalDocs > 0) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`Found <span class="text-primary">${escape_html(pagination.totalDocs)}</span> result${escape_html(pagination.totalDocs === 1 ? "" : "s")} for "${escape_html(searchQuery)}" `);
        if (typeFilter !== "all") {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<span class="text-muted-foreground font-normal">in ${escape_html(availableTypes.find((t) => t.value === typeFilter)?.label || typeFilter)}</span>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]-->`);
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`No results found for "${escape_html(searchQuery)}"`);
      }
      $$renderer2.push(`<!--]--></h2> `);
      if (searchTime > 0) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<span class="text-sm text-muted-foreground">${escape_html(searchTime)}ms</span>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></div> `);
      if (results.length > 0) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"><!--[-->`);
        const each_array_1 = ensure_array_like(results);
        for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
          let result = each_array_1[$$index_1];
          $$renderer2.push(`<a${attr("href", result.url)} class="group card-modern"><div class="relative aspect-[4/3] bg-muted overflow-hidden">`);
          if (isString(result.image)) {
            $$renderer2.push("<!--[-->");
            $$renderer2.push(`<img${attr("src", result.image)}${attr("alt", result.title)} class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy"/>`);
          } else {
            $$renderer2.push("<!--[!-->");
            if (result.image?.[0] || result.image?.url) {
              $$renderer2.push("<!--[-->");
              PayloadImage($$renderer2, {
                image: Array.isArray(result.image) ? result.image[0] : result.image,
                alt: result.title,
                maxWidth: 400,
                class: "w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              });
            } else {
              $$renderer2.push("<!--[!-->");
              $$renderer2.push(`<div class="w-full h-full flex items-center justify-center text-muted-foreground text-sm">No image</div>`);
            }
            $$renderer2.push(`<!--]-->`);
          }
          $$renderer2.push(`<!--]--> <span class="absolute top-3 left-3 badge-primary uppercase">${escape_html(typeLabel(result.type))}</span></div> <div class="p-5 space-y-2"><h3 class="text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">${escape_html(result.title)}</h3> `);
          if (result.author) {
            $$renderer2.push("<!--[-->");
            $$renderer2.push(`<p class="text-sm text-muted-foreground">by ${escape_html(result.author)}</p>`);
          } else {
            $$renderer2.push("<!--[!-->");
          }
          $$renderer2.push(`<!--]--> `);
          if (result.description) {
            $$renderer2.push("<!--[-->");
            $$renderer2.push(`<p class="text-sm text-muted-foreground line-clamp-2">${escape_html(result.description)}</p>`);
          } else {
            $$renderer2.push("<!--[!-->");
          }
          $$renderer2.push(`<!--]--> `);
          if (result.price) {
            $$renderer2.push("<!--[-->");
            $$renderer2.push(`<p class="text-base font-bold text-primary">${escape_html(formatCurrency(result.price))}</p>`);
          } else {
            $$renderer2.push("<!--[!-->");
          }
          $$renderer2.push(`<!--]--></div></a>`);
        }
        $$renderer2.push(`<!--]--></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<div class="text-center py-16 bg-muted/30 rounded-2xl"><div class="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">`);
        Search($$renderer2, { class: "w-8 h-8 text-muted-foreground" });
        $$renderer2.push(`<!----></div> <p class="text-foreground text-lg mb-2">No results found for your search.</p> <p class="text-muted-foreground mb-6">Try different keywords or browse our collections:</p> <div class="flex flex-wrap justify-center gap-3"><a href="/shop/books" class="btn-outline btn-sm">`);
        Book_open($$renderer2, { class: "w-4 h-4" });
        $$renderer2.push(`<!----> Browse Books</a> <a href="/shop/apparel" class="btn-outline btn-sm">`);
        Shopping_bag($$renderer2, { class: "w-4 h-4" });
        $$renderer2.push(`<!----> Browse Apparel</a> <a href="/shop/health-and-beauty" class="btn-outline btn-sm">`);
        Sparkles($$renderer2, { class: "w-4 h-4" });
        $$renderer2.push(`<!----> Health &amp; Beauty</a> <a href="/shop/home-goods" class="btn-outline btn-sm">`);
        House($$renderer2, { class: "w-4 h-4" });
        $$renderer2.push(`<!----> Home Goods</a></div></div>`);
      }
      $$renderer2.push(`<!--]-->`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div class="text-center py-16"><div class="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">`);
      Search($$renderer2, { class: "w-10 h-10 text-primary" });
      $$renderer2.push(`<!----></div> <p class="text-foreground text-xl mb-2">Enter a search term to find books, products, events, and more.</p> <p class="text-muted-foreground mb-8">Or explore our popular categories below:</p> <div class="flex flex-wrap justify-center gap-4"><a href="/shop/books" class="group flex items-center gap-2 text-primary font-semibold hover:gap-3 transition-all">Browse All Books `);
      Arrow_right($$renderer2, { class: "w-4 h-4" });
      $$renderer2.push(`<!----></a> <a href="/shop" class="group flex items-center gap-2 text-primary font-semibold hover:gap-3 transition-all">Shop Departments `);
      Arrow_right($$renderer2, { class: "w-4 h-4" });
      $$renderer2.push(`<!----></a> <a href="/blog" class="group flex items-center gap-2 text-primary font-semibold hover:gap-3 transition-all">Read the Blog `);
      Arrow_right($$renderer2, { class: "w-4 h-4" });
      $$renderer2.push(`<!----></a></div></div>`);
    }
    $$renderer2.push(`<!--]--></div></div></section>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
