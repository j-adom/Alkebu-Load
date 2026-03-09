import { s as sanitize_props, a as spread_props, b as slot, d as attr, g as ensure_array_like, i as attr_style, e as stringify } from "../../../chunks/index2.js";
import { M as Meta } from "../../../chunks/Meta.js";
import { u as urlFor } from "../../../chunks/payload2.js";
import { I as Icon } from "../../../chunks/Icon.js";
import { B as Book_open } from "../../../chunks/book-open.js";
import { e as escape_html } from "../../../chunks/utils2.js";
function Hand($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  /**
   * @license lucide-svelte v0.452.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const iconNode = [
    ["path", { "d": "M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2" }],
    ["path", { "d": "M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2" }],
    ["path", { "d": "M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8" }],
    [
      "path",
      {
        "d": "M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"
      }
    ]
  ];
  Icon($$renderer, spread_props([
    { name: "hand" },
    $$sanitized_props,
    {
      /**
       * @component @name Hand
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTggMTFWNmEyIDIgMCAwIDAtMi0yYTIgMiAwIDAgMC0yIDIiIC8+CiAgPHBhdGggZD0iTTE0IDEwVjRhMiAyIDAgMCAwLTItMmEyIDIgMCAwIDAtMiAydjIiIC8+CiAgPHBhdGggZD0iTTEwIDEwLjVWNmEyIDIgMCAwIDAtMi0yYTIgMiAwIDAgMC0yIDJ2OCIgLz4KICA8cGF0aCBkPSJNMTggOGEyIDIgMCAxIDEgNCAwdjZhOCA4IDAgMCAxLTggOGgtMmMtMi44IDAtNC41LS44Ni01Ljk5LTIuMzRsLTMuNi0zLjZhMiAyIDAgMCAxIDIuODMtMi44Mkw3IDE1IiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/hand
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
function Handshake($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  /**
   * @license lucide-svelte v0.452.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const iconNode = [
    ["path", { "d": "m11 17 2 2a1 1 0 1 0 3-3" }],
    [
      "path",
      {
        "d": "m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"
      }
    ],
    ["path", { "d": "m21 3 1 11h-2" }],
    ["path", { "d": "M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" }],
    ["path", { "d": "M3 4h8" }]
  ];
  Icon($$renderer, spread_props([
    { name: "handshake" },
    $$sanitized_props,
    {
      /**
       * @component @name Handshake
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJtMTEgMTcgMiAyYTEgMSAwIDEgMCAzLTMiIC8+CiAgPHBhdGggZD0ibTE0IDE0IDIuNSAyLjVhMSAxIDAgMSAwIDMtM2wtMy44OC0zLjg4YTMgMyAwIDAgMC00LjI0IDBsLS44OC44OGExIDEgMCAxIDEtMy0zbDIuODEtMi44MWE1Ljc5IDUuNzkgMCAwIDEgNy4wNi0uODdsLjQ3LjI4YTIgMiAwIDAgMCAxLjQyLjI1TDIxIDQiIC8+CiAgPHBhdGggZD0ibTIxIDMgMSAxMWgtMiIgLz4KICA8cGF0aCBkPSJNMyAzIDIgMTRsNi41IDYuNWExIDEgMCAxIDAgMy0zIiAvPgogIDxwYXRoIGQ9Ik0zIDRoOCIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/handshake
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
function Leaf($$renderer, $$props) {
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
        "d": "M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"
      }
    ],
    [
      "path",
      { "d": "M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" }
    ]
  ];
  Icon($$renderer, spread_props([
    { name: "leaf" },
    $$sanitized_props,
    {
      /**
       * @component @name Leaf
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTEgMjBBNyA3IDAgMCAxIDkuOCA2LjFDMTUuNSA1IDE3IDQuNDggMTkgMmMxIDIgMiA0LjE4IDIgOCAwIDUuNS00Ljc4IDEwLTEwIDEwWiIgLz4KICA8cGF0aCBkPSJNMiAyMWMwLTMgMS44NS01LjM2IDUuMDgtNkM5LjUgMTQuNTIgMTIgMTMgMTMgMTIiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/leaf
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
    const metadata = {
      title: "About Alkebu-Lan Images",
      description: `Nashville's Center for Black Lifestyles. Proudly serving Nashville and beyond for 35 years!`,
      image: "/assets/images/resources/logo.png",
      imageAlt: "Alkebu-Lan Images Logo",
      url: "/about/"
    };
    let { data } = $$props;
    const about = data.about ?? {};
    const description = about.description ?? "";
    const section1 = about.section1 ?? {};
    const section2 = about.section2 ?? {};
    const section1Images = section1.images ?? [];
    const image0 = section1Images?.[0]?.image ?? section1Images?.[0];
    const image1 = section1Images?.[1]?.image ?? section1Images?.[1];
    const image2 = section1Images?.[2]?.image ?? section1Images?.[2];
    section2.section2image ?? section2.image;
    const principles = [
      { icon: Hand, title: "Black Owned & Operated" },
      { icon: Handshake, title: "Cooperative Economics" },
      { icon: Book_open, title: "Knowledge is Power" },
      { icon: Leaf, title: "Natural Lifestyles" }
    ];
    Meta($$renderer2, { metadata });
    $$renderer2.push(`<!----> <section class="section bg-background"><div class="container mx-auto px-4 lg:px-8"><div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 mb-12"><div><p class="text-primary font-semibold uppercase tracking-wide mb-2">About Alkebu-Lan Images</p> <h1 class="text-4xl md:text-5xl font-bold font-display text-foreground">Nashville's Center for Black Lifestyles</h1> <div class="w-20 h-1 bg-primary mt-6"></div></div> <div class="flex items-center"><p class="text-lg text-muted-foreground leading-relaxed">${escape_html(description)}</p></div></div> <div class="grid grid-cols-1 lg:grid-cols-12 items-stretch gap-6 mb-16"><div class="lg:col-span-5"><div class="h-full min-h-[400px] lg:min-h-[500px]"><img loading="lazy" class="w-full h-full object-cover rounded-2xl shadow-medium"${attr("src", urlFor(image2).width(800).height(1024).auto("format").url())}${attr("alt", image2?.alt ?? "Alkebu-Lan Images")}/></div></div> <div class="lg:col-span-5"><div class="h-full min-h-[400px] lg:min-h-[500px]"><img loading="lazy" class="w-full h-full object-cover rounded-2xl shadow-medium"${attr("src", urlFor(image0).width(800).height(1024).auto("format").url())}${attr("alt", image0?.alt ?? "Alkebu-Lan Images")}/></div></div> <div class="lg:col-span-2"><div class="h-full min-h-[300px] lg:min-h-[500px] relative overflow-hidden rounded-2xl bg-primary"><img loading="lazy" class="absolute inset-0 w-full h-full object-cover opacity-30"${attr("src", urlFor(image1).auto("format").url())}${attr("alt", image1?.alt ?? "Alkebu-Lan Images")}/> <div class="relative z-10 flex h-full items-center justify-center text-center p-6"><h2 class="text-xl lg:text-2xl font-bold text-primary-foreground">Proudly serving Nashville and beyond for 35 years!</h2></div></div></div></div></div></section> <section class="py-20 bg-kente-forest text-white relative overflow-hidden"><div class="absolute inset-0 bg-gradient-to-br from-kente-forest via-kente-indigo/50 to-kente-forest"></div> <div class="container mx-auto px-4 lg:px-8 relative z-10"><div class="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 mb-16"><div><p class="text-kente-gold font-semibold uppercase tracking-wide mb-2">Our Principles</p> <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold font-display">Uplifting Black Consciousness &amp; Culture</h2> <div class="w-20 h-1 bg-kente-gold mt-6"></div></div> <div class="flex items-center"><p class="text-lg text-white/80 leading-relaxed">Alkebu-Lan Images seeks to support the local Black community and beyond by sourcing our products
          where possible from other Black-owned businesses in the spirit of the Kwanzaa principle of Ujima. As
          a result one can find a wide range of rare books, handmade jewelry, and other items not found in your
          typical retail establishment. With a focus on sourcing products by Black businesses and for Black
          people we hope to shine a light on a market that is both under-served and under-valued.</p></div></div> <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"><!--[-->`);
    const each_array = ensure_array_like(principles);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let principle = each_array[$$index];
      $$renderer2.push(`<div class="group p-6 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/20 transition-all duration-300 hover:-translate-y-1"><div class="flex items-center gap-4"><div class="w-14 h-14 rounded-xl bg-kente-gold/20 flex items-center justify-center group-hover:bg-kente-gold/30 transition-colors"><!---->`);
      principle.icon?.($$renderer2, { class: "w-7 h-7 text-kente-gold" });
      $$renderer2.push(`<!----></div> <h3 class="font-semibold text-lg">${escape_html(principle.title)}</h3></div></div>`);
    }
    $$renderer2.push(`<!--]--></div></div></section> <section class="relative py-24 md:py-32 bg-cover bg-center overflow-hidden"${attr_style(`background-image: url(${stringify(urlFor(section2.section2image).width(1920).height(600).auto("format").url())});`)}><div class="absolute inset-0 bg-gradient-to-r from-kente-forest/95 via-kente-indigo/90 to-kente-forest/95"></div> <div class="container mx-auto px-4 relative z-10 text-center"><h2 class="text-3xl md:text-4xl lg:text-5xl font-bold text-white font-display mb-6 max-w-4xl mx-auto">Providing our customers a Well-Curated range of products that elevate Black Lifestyles</h2> <p class="text-xl text-white/80 mb-8">Browse our online store to see just what we're talking about</p> <a href="/shop" class="btn-primary btn-lg">Discover More</a></div></section>`);
  });
}
export {
  _page as default
};
