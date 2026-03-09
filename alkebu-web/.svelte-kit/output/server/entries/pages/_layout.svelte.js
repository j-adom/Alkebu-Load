import { s as sanitize_props, a as spread_props, b as slot, c as attr_class, d as attr, e as stringify, f as store_get, u as unsubscribe_stores, g as ensure_array_like, h as store_set } from "../../chunks/index2.js";
import { r as run } from "../../chunks/legacy-server.js";
import { s as setContext } from "../../chunks/context.js";
import { p as page } from "../../chunks/stores.js";
import { c as createEmptyCart, p as paymentProvider } from "../../chunks/cart.js";
import "../../chunks/cartDrawer.js";
import { S as Shopping_bag } from "../../chunks/shopping-bag.js";
import { M as Mail, P as Phone, S as Send, a as Map_pin } from "../../chunks/send.js";
import { F as Facebook, T as Twitter } from "../../chunks/twitter.js";
import { I as Icon } from "../../chunks/Icon.js";
import { S as Search } from "../../chunks/search.js";
import { e as escape_html } from "../../chunks/utils2.js";
import { A as Arrow_right } from "../../chunks/arrow-right.js";
import "@sveltejs/kit/internal";
import "../../chunks/exports.js";
import "../../chunks/utils.js";
import { w as writable } from "../../chunks/index.js";
import "@sveltejs/kit/internal/server";
import "../../chunks/state.svelte.js";
import { P as PayloadImage } from "../../chunks/PayloadImage.js";
import { f as formatCurrency } from "../../chunks/currency.js";
import "clsx";
function Chevron_down($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  /**
   * @license lucide-svelte v0.452.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const iconNode = [["path", { "d": "m6 9 6 6 6-6" }]];
  Icon($$renderer, spread_props([
    { name: "chevron-down" },
    $$sanitized_props,
    {
      /**
       * @component @name ChevronDown
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJtNiA5IDYgNiA2LTYiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/chevron-down
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
function Instagram($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  /**
   * @license lucide-svelte v0.452.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const iconNode = [
    [
      "rect",
      {
        "width": "20",
        "height": "20",
        "x": "2",
        "y": "2",
        "rx": "5",
        "ry": "5"
      }
    ],
    [
      "path",
      { "d": "M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" }
    ],
    [
      "line",
      { "x1": "17.5", "x2": "17.51", "y1": "6.5", "y2": "6.5" }
    ]
  ];
  Icon($$renderer, spread_props([
    { name: "instagram" },
    $$sanitized_props,
    {
      /**
       * @component @name Instagram
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cmVjdCB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHg9IjIiIHk9IjIiIHJ4PSI1IiByeT0iNSIgLz4KICA8cGF0aCBkPSJNMTYgMTEuMzdBNCA0IDAgMSAxIDEyLjYzIDggNCA0IDAgMCAxIDE2IDExLjM3eiIgLz4KICA8bGluZSB4MT0iMTcuNSIgeDI9IjE3LjUxIiB5MT0iNi41IiB5Mj0iNi41IiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/instagram
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       * @deprecated Brand icons have been deprecated and are due to be removed, please refer to https://github.com/lucide-icons/lucide/issues/670. We recommend using https://simpleicons.org/?q=instagram instead. This icon will be removed in v1.0
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
function Menu($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  /**
   * @license lucide-svelte v0.452.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const iconNode = [
    ["line", { "x1": "4", "x2": "20", "y1": "12", "y2": "12" }],
    ["line", { "x1": "4", "x2": "20", "y1": "6", "y2": "6" }],
    ["line", { "x1": "4", "x2": "20", "y1": "18", "y2": "18" }]
  ];
  Icon($$renderer, spread_props([
    { name: "menu" },
    $$sanitized_props,
    {
      /**
       * @component @name Menu
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8bGluZSB4MT0iNCIgeDI9IjIwIiB5MT0iMTIiIHkyPSIxMiIgLz4KICA8bGluZSB4MT0iNCIgeDI9IjIwIiB5MT0iNiIgeTI9IjYiIC8+CiAgPGxpbmUgeDE9IjQiIHgyPSIyMCIgeTE9IjE4IiB5Mj0iMTgiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/menu
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
function Minus($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  /**
   * @license lucide-svelte v0.452.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const iconNode = [["path", { "d": "M5 12h14" }]];
  Icon($$renderer, spread_props([
    { name: "minus" },
    $$sanitized_props,
    {
      /**
       * @component @name Minus
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNNSAxMmgxNCIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/minus
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
function Plus($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  /**
   * @license lucide-svelte v0.452.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const iconNode = [["path", { "d": "M5 12h14" }], ["path", { "d": "M12 5v14" }]];
  Icon($$renderer, spread_props([
    { name: "plus" },
    $$sanitized_props,
    {
      /**
       * @component @name Plus
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNNSAxMmgxNCIgLz4KICA8cGF0aCBkPSJNMTIgNXYxNCIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/plus
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
function Trash_2($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  /**
   * @license lucide-svelte v0.452.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const iconNode = [
    ["path", { "d": "M3 6h18" }],
    ["path", { "d": "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" }],
    ["path", { "d": "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" }],
    ["line", { "x1": "10", "x2": "10", "y1": "11", "y2": "17" }],
    ["line", { "x1": "14", "x2": "14", "y1": "11", "y2": "17" }]
  ];
  Icon($$renderer, spread_props([
    { name: "trash-2" },
    $$sanitized_props,
    {
      /**
       * @component @name Trash2
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMyA2aDE4IiAvPgogIDxwYXRoIGQ9Ik0xOSA2djE0YzAgMS0xIDItMiAySDdjLTEgMC0yLTEtMi0yVjYiIC8+CiAgPHBhdGggZD0iTTggNlY0YzAtMSAxLTIgMi0yaDRjMSAwIDIgMSAyIDJ2MiIgLz4KICA8bGluZSB4MT0iMTAiIHgyPSIxMCIgeTE9IjExIiB5Mj0iMTciIC8+CiAgPGxpbmUgeDE9IjE0IiB4Mj0iMTQiIHkxPSIxMSIgeTI9IjE3IiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/trash-2
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
function X($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  /**
   * @license lucide-svelte v0.452.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const iconNode = [
    ["path", { "d": "M18 6 6 18" }],
    ["path", { "d": "m6 6 12 12" }]
  ];
  Icon($$renderer, spread_props([
    { name: "x" },
    $$sanitized_props,
    {
      /**
       * @component @name X
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTggNiA2IDE4IiAvPgogIDxwYXRoIGQ9Im02IDYgMTIgMTIiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/x
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
function CartIconButton($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { className = "" } = $$props;
    let itemCount = 0;
    $$renderer2.push(`<button type="button"${attr_class(`relative inline-flex items-center justify-center p-2 rounded-full transition-all duration-200 ease-smooth hover:bg-muted/80 active:scale-95 ${stringify("")} ${stringify(className)}`)}${attr("aria-label", `View cart (${stringify(itemCount)} items)`)}>`);
    Shopping_bag($$renderer2, {
      size: 24,
      class: "text-foreground transition-colors duration-200",
      strokeWidth: 1.5
    });
    $$renderer2.push(`<!----> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></button>`);
  });
}
function Nav($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let activeUrl = store_get($$store_subs ??= {}, "$page", page).url.pathname;
    function isActive(path) {
      if (path === "/") return activeUrl === "/";
      return activeUrl.startsWith(path);
    }
    $$renderer2.push(`<div class="bg-gradient-to-r from-primary/10 via-background to-secondary/10 border-b border-border hidden lg:block"><div class="container mx-auto px-4"><div class="flex items-center justify-between h-10 text-sm"><div class="flex items-center gap-6"><a href="mailto:info@alkebulanimages.com" class="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">`);
    Mail($$renderer2, { size: 14 });
    $$renderer2.push(`<!----> info@alkebulanimages.com</a> <a href="tel:615-321-4111" class="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">`);
    Phone($$renderer2, { size: 14 });
    $$renderer2.push(`<!----> 615-321-4111</a></div> <div class="flex items-center gap-4"><a href="https://www.facebook.com/AlkebulanImages/" target="_blank" rel="noopener" class="text-muted-foreground hover:text-primary transition-colors" aria-label="Facebook">`);
    Facebook($$renderer2, { size: 16 });
    $$renderer2.push(`<!----></a> <a href="https://twitter.com/alkebulanimages" target="_blank" rel="noopener" class="text-muted-foreground hover:text-primary transition-colors" aria-label="Twitter">`);
    Twitter($$renderer2, { size: 16 });
    $$renderer2.push(`<!----></a> <a href="https://www.instagram.com/alkebulanimages" target="_blank" rel="noopener" class="text-muted-foreground hover:text-primary transition-colors" aria-label="Instagram">`);
    Instagram($$renderer2, { size: 16 });
    $$renderer2.push(`<!----></a></div></div></div></div> <header${attr_class(`sticky top-0 z-50 transition-all duration-300 ${stringify("bg-background border-b border-transparent")}`)}><div class="container mx-auto px-4"><div class="flex items-center justify-between h-16 lg:h-20"><button type="button" class="lg:hidden p-2 -ml-2 text-foreground hover:text-primary transition-colors"${attr("aria-label", "Open menu")}>`);
    {
      $$renderer2.push("<!--[!-->");
      Menu($$renderer2, { size: 24 });
    }
    $$renderer2.push(`<!--]--></button> <a href="/" class="flex-shrink-0"><img src="/assets/images/resources/logo.png" alt="Alkebu-Lan Images"${attr_class(`h-12 lg:h-16 w-auto transition-all duration-300 ${stringify("")}`)}/></a> <nav class="hidden lg:flex items-center gap-1"><a href="/"${attr_class(`px-4 py-2 rounded-lg font-medium transition-colors ${stringify(isActive("/") && activeUrl === "/" ? "text-primary bg-primary/10" : "text-foreground hover:text-primary hover:bg-muted")}`)}>Home</a> <a href="/about"${attr_class(`px-4 py-2 rounded-lg font-medium transition-colors ${stringify(isActive("/about") ? "text-primary bg-primary/10" : "text-foreground hover:text-primary hover:bg-muted")}`)}>About</a> <div class="relative group"><a href="/shop"${attr_class(`flex items-center gap-1 px-4 py-2 rounded-lg font-medium transition-colors ${stringify(isActive("/shop") ? "text-primary bg-primary/10" : "text-foreground hover:text-primary hover:bg-muted")}`)}>Shop `);
    Chevron_down($$renderer2, {
      size: 16,
      class: "transition-transform group-hover:rotate-180"
    });
    $$renderer2.push(`<!----></a> <div class="absolute left-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200"><div class="bg-card rounded-xl border border-border shadow-medium py-2 min-w-[200px]"><a href="/shop/books" class="block px-4 py-2 text-foreground hover:text-primary hover:bg-muted transition-colors">Books</a> <a href="/shop/apparel" class="block px-4 py-2 text-foreground hover:text-primary hover:bg-muted transition-colors">Apparel</a> <a href="/shop/health-and-beauty" class="block px-4 py-2 text-foreground hover:text-primary hover:bg-muted transition-colors">Health &amp; Beauty</a> <a href="/shop/home-goods" class="block px-4 py-2 text-foreground hover:text-primary hover:bg-muted transition-colors">Art &amp; Imports</a></div></div></div> <a href="/blog"${attr_class(`px-4 py-2 rounded-lg font-medium transition-colors ${stringify(isActive("/blog") ? "text-primary bg-primary/10" : "text-foreground hover:text-primary hover:bg-muted")}`)}>Blog</a> <a href="/events"${attr_class(`px-4 py-2 rounded-lg font-medium transition-colors ${stringify(isActive("/events") ? "text-primary bg-primary/10" : "text-foreground hover:text-primary hover:bg-muted")}`)}>Events</a> <a href="/contact"${attr_class(`px-4 py-2 rounded-lg font-medium transition-colors ${stringify(isActive("/contact") ? "text-primary bg-primary/10" : "text-foreground hover:text-primary hover:bg-muted")}`)}>Contact</a></nav> <div class="flex items-center gap-2"><a href="/search" class="p-2 rounded-full text-foreground hover:text-primary hover:bg-muted transition-colors" aria-label="Search">`);
    Search($$renderer2, { size: 20 });
    $$renderer2.push(`<!----></a> `);
    CartIconButton($$renderer2, {});
    $$renderer2.push(`<!----></div></div></div></header> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <aside${attr_class(`fixed top-0 left-0 z-50 h-full w-80 max-w-[85vw] bg-card border-r border-border shadow-strong transform transition-transform duration-300 ease-smooth lg:hidden ${stringify("-translate-x-full")}`)}><div class="flex flex-col h-full"><div class="flex items-center justify-between p-4 border-b border-border"><img src="/assets/images/resources/logo.png" alt="Alkebu-Lan Images" class="h-10"/> <button type="button" class="p-2 text-foreground hover:text-primary transition-colors" aria-label="Close menu">`);
    X($$renderer2, { size: 24 });
    $$renderer2.push(`<!----></button></div> <nav class="flex-1 overflow-y-auto p-4"><div class="space-y-1"><a href="/"${attr_class(`block px-4 py-3 rounded-xl font-medium transition-colors ${stringify(isActive("/") && activeUrl === "/" ? "text-primary bg-primary/10" : "text-foreground hover:bg-muted")}`)}>Home</a> <a href="/about"${attr_class(`block px-4 py-3 rounded-xl font-medium transition-colors ${stringify(isActive("/about") ? "text-primary bg-primary/10" : "text-foreground hover:bg-muted")}`)}>About Us</a> <div class="py-2"><button type="button"${attr_class(`w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium transition-colors ${stringify(isActive("/shop") ? "text-primary bg-primary/10" : "text-foreground hover:bg-muted")}`)}>Shop `);
    Chevron_down($$renderer2, {
      size: 18,
      class: `transition-transform ${stringify("")}`
    });
    $$renderer2.push(`<!----></button> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div> <a href="/blog"${attr_class(`block px-4 py-3 rounded-xl font-medium transition-colors ${stringify(isActive("/blog") ? "text-primary bg-primary/10" : "text-foreground hover:bg-muted")}`)}>Blog</a> <a href="/events"${attr_class(`block px-4 py-3 rounded-xl font-medium transition-colors ${stringify(isActive("/events") ? "text-primary bg-primary/10" : "text-foreground hover:bg-muted")}`)}>Events</a> <a href="/contact"${attr_class(`block px-4 py-3 rounded-xl font-medium transition-colors ${stringify(isActive("/contact") ? "text-primary bg-primary/10" : "text-foreground hover:bg-muted")}`)}>Contact Us</a></div></nav> <div class="p-4 border-t border-border space-y-4"><div class="space-y-2 text-sm"><a href="mailto:info@alkebulanimages.com" class="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">`);
    Mail($$renderer2, { size: 16 });
    $$renderer2.push(`<!----> info@alkebulanimages.com</a> <a href="tel:615-321-4111" class="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">`);
    Phone($$renderer2, { size: 16 });
    $$renderer2.push(`<!----> 615-321-4111</a></div> <div class="flex gap-4"><a href="https://www.facebook.com/AlkebulanImages/" target="_blank" rel="noopener" class="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all" aria-label="Facebook">`);
    Facebook($$renderer2, { size: 18 });
    $$renderer2.push(`<!----></a> <a href="https://twitter.com/alkebulanimages" target="_blank" rel="noopener" class="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all" aria-label="Twitter">`);
    Twitter($$renderer2, { size: 18 });
    $$renderer2.push(`<!----></a> <a href="https://www.instagram.com/alkebulanimages" target="_blank" rel="noopener" class="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all" aria-label="Instagram">`);
    Instagram($$renderer2, { size: 18 });
    $$renderer2.push(`<!----></a></div></div></div></aside>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
function Footer($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let email = "";
    let isSubmitting = false;
    $$renderer2.push(`<footer class="bg-gradient-to-b from-card to-muted/50 border-t border-border"><div class="container mx-auto px-4 py-12 md:py-16"><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10"><div class="lg:col-span-1"><h3 class="text-lg font-bold text-foreground mb-4 font-display">About Alkebu-Lan Images</h3> <p class="text-muted-foreground text-sm leading-relaxed mb-6">Since 1986, Nashville's center for promoting positivity in Black culture and empowering Black lifestyles through books, art, and community.</p> <div class="mt-6"><p class="text-sm text-foreground font-medium mb-3">Join our newsletter</p> `);
    {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<form class="flex gap-2"><input type="email" placeholder="Enter your email"${attr("value", email)} required class="input-modern flex-1 text-sm py-2.5" aria-label="Email address for newsletter"/> <button type="submit"${attr("disabled", isSubmitting, true)} class="btn-primary btn-sm px-3" aria-label="Subscribe to newsletter">`);
      {
        $$renderer2.push("<!--[!-->");
        Send($$renderer2, { size: 16 });
      }
      $$renderer2.push(`<!--]--></button></form>`);
    }
    $$renderer2.push(`<!--]--></div></div> <div><h3 class="text-lg font-bold text-foreground mb-4 font-display">Explore</h3> <ul class="space-y-3"><li><a href="/about/" class="text-muted-foreground hover:text-primary transition-colors text-sm inline-flex items-center gap-1 group">`);
    Arrow_right($$renderer2, {
      size: 14,
      class: "opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all"
    });
    $$renderer2.push(`<!----> About Us</a></li> <li><a href="/shop/books/" class="text-muted-foreground hover:text-primary transition-colors text-sm inline-flex items-center gap-1 group">`);
    Arrow_right($$renderer2, {
      size: 14,
      class: "opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all"
    });
    $$renderer2.push(`<!----> Shop Books</a></li> <li><a href="/blog/" class="text-muted-foreground hover:text-primary transition-colors text-sm inline-flex items-center gap-1 group">`);
    Arrow_right($$renderer2, {
      size: 14,
      class: "opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all"
    });
    $$renderer2.push(`<!----> Blog</a></li> <li><a href="/events/" class="text-muted-foreground hover:text-primary transition-colors text-sm inline-flex items-center gap-1 group">`);
    Arrow_right($$renderer2, {
      size: 14,
      class: "opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all"
    });
    $$renderer2.push(`<!----> Events</a></li> <li><a href="/search/" class="text-muted-foreground hover:text-primary transition-colors text-sm inline-flex items-center gap-1 group">`);
    Arrow_right($$renderer2, {
      size: 14,
      class: "opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all"
    });
    $$renderer2.push(`<!----> Search</a></li></ul></div> <div><h3 class="text-lg font-bold text-foreground mb-4 font-display">Customer Service</h3> <ul class="space-y-3"><li><a href="/contact/" class="text-muted-foreground hover:text-primary transition-colors text-sm inline-flex items-center gap-1 group">`);
    Arrow_right($$renderer2, {
      size: 14,
      class: "opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all"
    });
    $$renderer2.push(`<!----> Contact Us</a></li> <li><a href="/return-policy/" class="text-muted-foreground hover:text-primary transition-colors text-sm inline-flex items-center gap-1 group">`);
    Arrow_right($$renderer2, {
      size: 14,
      class: "opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all"
    });
    $$renderer2.push(`<!----> Return Policy</a></li> <li><a href="/privacy/" class="text-muted-foreground hover:text-primary transition-colors text-sm inline-flex items-center gap-1 group">`);
    Arrow_right($$renderer2, {
      size: 14,
      class: "opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all"
    });
    $$renderer2.push(`<!----> Privacy Policy</a></li> <li><a href="/terms-of-service/" class="text-muted-foreground hover:text-primary transition-colors text-sm inline-flex items-center gap-1 group">`);
    Arrow_right($$renderer2, {
      size: 14,
      class: "opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all"
    });
    $$renderer2.push(`<!----> Terms of Service</a></li></ul></div> <div><h3 class="text-lg font-bold text-foreground mb-4 font-display">Visit Us</h3> <div class="space-y-4"><div class="flex gap-3">`);
    Map_pin($$renderer2, { size: 18, class: "text-primary shrink-0 mt-0.5" });
    $$renderer2.push(`<!----> <p class="text-sm text-muted-foreground">2721 Jefferson St<br/>Nashville, TN 37208</p></div> <a href="mailto:info@alkebulanimages.com" class="flex gap-3 text-muted-foreground hover:text-primary transition-colors">`);
    Mail($$renderer2, { size: 18, class: "shrink-0" });
    $$renderer2.push(`<!----> <span class="text-sm">info@alkebulanimages.com</span></a> <a href="tel:615-321-4111" class="flex gap-3 text-muted-foreground hover:text-primary transition-colors">`);
    Phone($$renderer2, { size: 18, class: "shrink-0" });
    $$renderer2.push(`<!----> <span class="text-sm">615-321-4111</span></a> <div class="flex gap-3 pt-2"><a href="https://www.facebook.com/AlkebulanImages/" target="_blank" rel="noopener noreferrer" class="w-10 h-10 rounded-full bg-muted/80 flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all" aria-label="Follow us on Facebook">`);
    Facebook($$renderer2, { size: 18 });
    $$renderer2.push(`<!----></a> <a href="http://www.twitter.com/alkebulanimages" target="_blank" rel="noopener noreferrer" class="w-10 h-10 rounded-full bg-muted/80 flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all" aria-label="Follow us on Twitter">`);
    Twitter($$renderer2, { size: 18 });
    $$renderer2.push(`<!----></a> <a href="http://www.instagram.com/alkebulanimages" target="_blank" rel="noopener noreferrer" class="w-10 h-10 rounded-full bg-muted/80 flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all" aria-label="Follow us on Instagram">`);
    Instagram($$renderer2, { size: 18 });
    $$renderer2.push(`<!----></a></div></div></div></div></div> <div class="border-t border-border bg-muted/30"><div class="container mx-auto px-4 py-4"><div class="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground"><p>© ${escape_html((/* @__PURE__ */ new Date()).getFullYear())} Alkebu-Lan Images. All rights reserved.</p> <div class="flex gap-6"><a href="/privacy/" class="hover:text-primary transition-colors">Privacy</a> <a href="/terms-of-service/" class="hover:text-primary transition-colors">Terms</a></div></div></div></div></footer>`);
  });
}
function CartLineItem($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { item } = $$props;
    const product = item?.product || null;
    const title = item?.productTitle || product?.title || "Product";
    const slug = () => {
      const value = product?.slug;
      if (!value) return null;
      return typeof value === "string" ? value : value?.slug || value?.current || null;
    };
    const productPath = () => {
      if (!slug) return null;
      switch (item?.productType) {
        case "apparel":
        case "fashion-jewelry":
        case "fashionJewelry":
          return `/shop/apparel/${slug}`;
        case "wellness":
        case "wellnessLifestyle":
          return `/shop/health-and-beauty/${slug}`;
        default:
          return `/shop/books/${slug}`;
      }
    };
    const image = item?.image || product?.images?.[0] || product?.featuredImage || product?.coverImage || null;
    const unitPrice = item?.unitPrice || product?.pricing?.retailPrice || 0;
    const quantity = item?.quantity || 0;
    const lineTotal = item?.totalPrice || unitPrice * quantity;
    let isUpdating = false;
    const customizationEntries = () => {
      if (!item?.customization || typeof item.customization !== "object") return [];
      return Object.entries(item.customization).filter(([, value]) => value !== null && value !== void 0 && value !== "");
    };
    $$renderer2.push(`<article${attr_class(`card-modern p-4 ${stringify("")}`)}><div class="flex flex-col gap-4 sm:flex-row"><div class="w-full sm:w-28 shrink-0"><div class="aspect-square rounded-xl bg-muted overflow-hidden">`);
    if (image?.url) {
      $$renderer2.push("<!--[-->");
      PayloadImage($$renderer2, {
        image,
        alt: title,
        maxWidth: 320,
        class: "w-full h-full object-cover"
      });
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div class="flex h-full items-center justify-center text-sm text-muted-foreground">No image</div>`);
    }
    $$renderer2.push(`<!--]--></div></div> <div class="flex-1 flex flex-col gap-3"><div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2"><div class="flex-1">`);
    if (productPath) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<a${attr("href", productPath)} class="font-semibold text-foreground hover:text-primary transition-colors line-clamp-2">${escape_html(title)}</a>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<p class="font-semibold text-foreground line-clamp-2">${escape_html(title)}</p>`);
    }
    $$renderer2.push(`<!--]--> <p class="text-sm text-muted-foreground capitalize mt-0.5">${escape_html(item?.productType?.replace(/-/g, " ") || "Product")}</p> `);
    if (customizationEntries.length) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<ul class="mt-2 text-sm text-muted-foreground space-y-0.5"><!--[-->`);
      const each_array = ensure_array_like(customizationEntries);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let [key, value] = each_array[$$index];
        $$renderer2.push(`<li><span class="font-medium capitalize">${escape_html(key)}:</span> ${escape_html(value)}</li>`);
      }
      $$renderer2.push(`<!--]--></ul>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div> <div class="text-sm sm:text-right"><span class="text-muted-foreground">@</span> <span class="font-medium">${escape_html(formatCurrency(unitPrice))}</span></div></div> <div class="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-border"><div class="inline-flex items-center rounded-xl bg-muted/50"><button type="button" class="p-2 text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"${attr("disabled", quantity <= 1, true)} aria-label="Decrease quantity">`);
    Minus($$renderer2, { size: 16 });
    $$renderer2.push(`<!----></button> <span class="min-w-[2.5rem] text-center font-semibold">`);
    {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`${escape_html(quantity)}`);
    }
    $$renderer2.push(`<!--]--></span> <button type="button" class="p-2 text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"${attr("disabled", isUpdating, true)} aria-label="Increase quantity">`);
    Plus($$renderer2, { size: 16 });
    $$renderer2.push(`<!----></button></div> <div class="flex items-center gap-4"><div class="text-right"><p class="text-xs text-muted-foreground">Subtotal</p> <p class="text-lg font-bold text-primary">${escape_html(formatCurrency(lineTotal))}</p></div> <button type="button" class="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10"${attr("disabled", isUpdating, true)} aria-label="Remove item">`);
    Trash_2($$renderer2, { size: 18 });
    $$renderer2.push(`<!----></button></div></div></div></div> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></article>`);
  });
}
function CartTotals($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { cart, children } = $$props;
    $$renderer2.push(`<section class="rounded-2xl border border-border bg-card p-6 shadow-soft"><h2 class="text-xl font-semibold text-foreground">Order summary</h2> <dl class="mt-4 space-y-3 text-sm"><div class="flex items-center justify-between"><dt class="text-muted-foreground">Subtotal</dt> <dd class="font-medium text-foreground">${escape_html(formatCurrency(cart.subtotal))}</dd></div> <div class="flex items-center justify-between"><dt class="text-muted-foreground">Estimated tax</dt> <dd class="font-medium text-foreground">${escape_html(formatCurrency(cart.tax))}</dd></div> <div class="flex items-center justify-between"><dt class="text-muted-foreground">Shipping</dt> <dd class="font-medium text-foreground">${escape_html(cart.shipping > 0 ? formatCurrency(cart.shipping) : "Calculated at checkout")}</dd></div></dl> <div class="mt-5 flex items-center justify-between border-t border-border pt-4"><dt class="text-base font-semibold text-foreground">Total</dt> <dd class="text-2xl font-bold text-primary">${escape_html(formatCurrency(cart.total))}</dd></div> <div class="mt-6">`);
    children?.($$renderer2);
    $$renderer2.push(`<!----></div></section>`);
  });
}
function CartDrawer($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { user = null } = $$props;
    let cartState = createEmptyCart();
    let checkoutEmail = user?.email ?? "";
    let taxExempt = false;
    let isCheckingOut = false;
    let isClearing = false;
    let shippingAddress = { street: "", city: "", state: "", zip: "", country: "US" };
    const isCartEmpty = cartState.itemCount === 0;
    $$renderer2.push(`<div${attr_class(`cart-overlay ${""}`, "svelte-vxwq7s")}${attr("aria-hidden", true)}></div> <aside${attr_class(`cart-drawer ${""}`, "svelte-vxwq7s")}${attr("aria-hidden", true)} aria-modal="true" role="dialog" aria-label="Shopping cart" tabindex="-1"><header class="cart-drawer__header svelte-vxwq7s"><div><p class="cart-drawer__title svelte-vxwq7s">Your cart</p> <p class="cart-drawer__count svelte-vxwq7s">${escape_html(cartState.itemCount)} ${escape_html(cartState.itemCount === 1 ? "item" : "items")}</p></div> <button type="button" class="cart-drawer__close svelte-vxwq7s" aria-label="Close cart"><span aria-hidden="true">×</span></button></header> <div class="cart-drawer__body svelte-vxwq7s">`);
    if (isCartEmpty) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="cart-drawer__empty svelte-vxwq7s"><p class="text-lg font-semibold text-foreground">Your cart is empty</p> <p class="mt-2 text-muted-foreground">Browse the shop to discover books and gifts.</p> <a href="/shop" class="btn-primary mt-6">Continue shopping</a></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div class="cart-drawer__items svelte-vxwq7s"><!--[-->`);
      const each_array = ensure_array_like(cartState.items);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let item = each_array[$$index];
        CartLineItem($$renderer2, { item });
      }
      $$renderer2.push(`<!--]--></div> <div class="cart-drawer__footer svelte-vxwq7s"><div class="flex items-center justify-between text-sm text-muted-foreground"><span>${escape_html(cartState.itemCount)} ${escape_html(cartState.itemCount === 1 ? "item" : "items")}</span> <button type="button" class="font-semibold text-destructive hover:text-destructive/80"${attr("disabled", isClearing, true)}>${escape_html("Clear cart")}</button></div> `);
      CartTotals($$renderer2, {
        cart: cartState,
        children: ($$renderer3) => {
          $$renderer3.push(`<form class="space-y-4"><div><label for="drawer-checkout-email" class="text-sm font-medium text-muted-foreground">Email address</label> <input id="drawer-checkout-email" type="email" placeholder="you@example.com"${attr("value", checkoutEmail)} class="input-modern mt-1" required/> <p class="mt-1 text-xs text-muted-foreground">Receipts and updates are sent here.</p></div> <div class="grid grid-cols-1 gap-3"><div><label class="text-sm font-medium text-muted-foreground">Street address</label> <input type="text" placeholder="123 Jefferson St"${attr("value", shippingAddress.street)} class="input-modern mt-1" required/></div> <div class="grid grid-cols-2 gap-3"><div><label class="text-sm font-medium text-muted-foreground">City</label> <input type="text" placeholder="Nashville"${attr("value", shippingAddress.city)} class="input-modern mt-1" required/></div> <div><label class="text-sm font-medium text-muted-foreground">State</label> <input type="text" placeholder="TN"${attr("value", shippingAddress.state)} class="input-modern mt-1 uppercase" maxlength="2" required/></div></div> <div class="grid grid-cols-2 gap-3"><div><label class="text-sm font-medium text-muted-foreground">ZIP code</label> <input type="text" placeholder="37208"${attr("value", shippingAddress.zip)} class="input-modern mt-1" required/></div> <div><label class="text-sm font-medium text-muted-foreground">Country</label> <input type="text"${attr("value", shippingAddress.country)} class="input-modern mt-1 uppercase" readonly/></div></div> <p class="text-xs text-muted-foreground">Tennessee addresses are charged 9.75% sales tax. Other US addresses are not taxed. We ship to US addresses only.</p></div> <label class="flex items-center gap-2 text-sm text-muted-foreground"><input type="checkbox"${attr("checked", taxExempt, true)} class="rounded border-input text-primary focus:ring-primary/50"/> Tax exempt order (institutional or wholesale)</label> `);
          {
            $$renderer3.push("<!--[!-->");
          }
          $$renderer3.push(`<!--]--> <div class="flex flex-col gap-2"><button type="submit" class="btn-primary w-full"${attr("disabled", isCheckingOut, true)}>${escape_html(`Checkout with ${paymentProvider.name}`)}</button> <p class="text-xs text-muted-foreground text-center">Payments are processed by ${escape_html(paymentProvider.name)}. `);
          {
            $$renderer3.push("<!--[-->");
            $$renderer3.push(`${escape_html(paymentProvider.note)}`);
          }
          $$renderer3.push(`<!--]--></p></div></form>`);
        }
      });
      $$renderer2.push(`<!----></div>`);
    }
    $$renderer2.push(`<!--]--></div></aside>`);
  });
}
function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let { settings, children, user } = $$props;
    const settings$ = writable(settings);
    run(() => {
      store_set(settings$, settings);
    });
    setContext("settings", settings$);
    let searchInput = "";
    $$renderer2.push(`<div class="page-wrapper">`);
    Nav($$renderer2);
    $$renderer2.push(`<!----> <main>`);
    if (!store_get($$store_subs ??= {}, "$page", page).data) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="preloader"><img src="/assets/images/loader.png" class="preloader__image" alt="loading"/></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
      children?.($$renderer2);
      $$renderer2.push(`<!---->`);
    }
    $$renderer2.push(`<!--]--></main> `);
    Footer($$renderer2);
    $$renderer2.push(`<!----> <a href="." data-target="html" class="scroll-to-target scroll-to-top" aria-label="Scroll back to top"><i class="fa fa-angle-up" aria-hidden="true"></i></a> <div class="search-popup"><div class="search-popup__overlay custom-cursor__overlay"><div class="cursor"></div> <div class="cursor-follower"></div></div> <div class="search-popup__inner"><form class="search-popup__form" method="GET"><input${attr("value", searchInput)} type="search" name="q" id="search" placeholder="Type here to Search...." aria-label="Search through site content"/> <button type="submit" aria-label="Submit search"><i class="fa fa-search" aria-hidden="true"></i></button></form></div></div> `);
    CartDrawer($$renderer2, { user });
    $$renderer2.push(`<!----></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _layout as default
};
