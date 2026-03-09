import { s as sanitize_props, a as spread_props, b as slot, o as element, p as bind_props, j as attributes, n as clsx$1, f as store_get, u as unsubscribe_stores, g as ensure_array_like, d as attr, e as stringify } from "./index2.js";
import { M as Meta } from "./Meta.js";
import { A as AddToCartButton } from "./AddToCartButton.js";
import { r as run } from "./legacy-server.js";
import { w as writable } from "./index.js";
import { o as onDestroy } from "./index-server.js";
import { s as setContext, h as hasContext, g as getContext } from "./context.js";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { A as Arrow_left } from "./arrow-left.js";
import { b as buttonVariants } from "./index3.js";
import { A as Arrow_right } from "./arrow-right.js";
import { f as formatCurrency } from "./currency.js";
import { g as getImageUrl } from "./payload2.js";
import { e as escape_html } from "./utils2.js";
import { C as Chevron_right } from "./chevron-right.js";
import { I as Icon } from "./Icon.js";
import { C as Calendar } from "./calendar.js";
function Book($$renderer, $$props) {
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
        "d": "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"
      }
    ]
  ];
  Icon($$renderer, spread_props([
    { name: "book" },
    $$sanitized_props,
    {
      /**
       * @component @name Book
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNNCAxOS41di0xNUEyLjUgMi41IDAgMCAxIDYuNSAySDE5YTEgMSAwIDAgMSAxIDF2MThhMSAxIDAgMCAxLTEgMUg2LjVhMSAxIDAgMCAxIDAtNUgyMCIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/book
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
function File_text($$renderer, $$props) {
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
        "d": "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"
      }
    ],
    ["path", { "d": "M14 2v4a2 2 0 0 0 2 2h4" }],
    ["path", { "d": "M10 9H8" }],
    ["path", { "d": "M16 13H8" }],
    ["path", { "d": "M16 17H8" }]
  ];
  Icon($$renderer, spread_props([
    { name: "file-text" },
    $$sanitized_props,
    {
      /**
       * @component @name FileText
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTUgMkg2YTIgMiAwIDAgMC0yIDJ2MTZhMiAyIDAgMCAwIDIgMmgxMmEyIDIgMCAwIDAgMi0yVjdaIiAvPgogIDxwYXRoIGQ9Ik0xNCAydjRhMiAyIDAgMCAwIDIgMmg0IiAvPgogIDxwYXRoIGQ9Ik0xMCA5SDgiIC8+CiAgPHBhdGggZD0iTTE2IDEzSDgiIC8+CiAgPHBhdGggZD0iTTE2IDE3SDgiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/file-text
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
function Globe($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  /**
   * @license lucide-svelte v0.452.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const iconNode = [
    ["circle", { "cx": "12", "cy": "12", "r": "10" }],
    [
      "path",
      { "d": "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" }
    ],
    ["path", { "d": "M2 12h20" }]
  ];
  Icon($$renderer, spread_props([
    { name: "globe" },
    $$sanitized_props,
    {
      /**
       * @component @name Globe
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgLz4KICA8cGF0aCBkPSJNMTIgMmExNC41IDE0LjUgMCAwIDAgMCAyMCAxNC41IDE0LjUgMCAwIDAgMC0yMCIgLz4KICA8cGF0aCBkPSJNMiAxMmgyMCIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/globe
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
function Layers($$renderer, $$props) {
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
        "d": "m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"
      }
    ],
    [
      "path",
      { "d": "m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" }
    ],
    [
      "path",
      { "d": "m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" }
    ]
  ];
  Icon($$renderer, spread_props([
    { name: "layers" },
    $$sanitized_props,
    {
      /**
       * @component @name Layers
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJtMTIuODMgMi4xOGEyIDIgMCAwIDAtMS42NiAwTDIuNiA2LjA4YTEgMSAwIDAgMCAwIDEuODNsOC41OCAzLjkxYTIgMiAwIDAgMCAxLjY2IDBsOC41OC0zLjlhMSAxIDAgMCAwIDAtMS44M1oiIC8+CiAgPHBhdGggZD0ibTIyIDE3LjY1LTkuMTcgNC4xNmEyIDIgMCAwIDEtMS42NiAwTDIgMTcuNjUiIC8+CiAgPHBhdGggZD0ibTIyIDEyLjY1LTkuMTcgNC4xNmEyIDIgMCAwIDEtMS42NiAwTDIgMTIuNjUiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/layers
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
function Tag($$renderer, $$props) {
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
        "d": "M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"
      }
    ],
    [
      "circle",
      { "cx": "7.5", "cy": "7.5", "r": ".5", "fill": "currentColor" }
    ]
  ];
  Icon($$renderer, spread_props([
    { name: "tag" },
    $$sanitized_props,
    {
      /**
       * @component @name Tag
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTIuNTg2IDIuNTg2QTIgMiAwIDAgMCAxMS4xNzIgMkg0YTIgMiAwIDAgMC0yIDJ2Ny4xNzJhMiAyIDAgMCAwIC41ODYgMS40MTRsOC43MDQgOC43MDRhMi40MjYgMi40MjYgMCAwIDAgMy40MiAwbDYuNTgtNi41OGEyLjQyNiAyLjQyNiAwIDAgMCAwLTMuNDJ6IiAvPgogIDxjaXJjbGUgY3g9IjcuNSIgY3k9IjcuNSIgcj0iLjUiIGZpbGw9ImN1cnJlbnRDb2xvciIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/tag
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
function User($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  /**
   * @license lucide-svelte v0.452.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const iconNode = [
    ["path", { "d": "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" }],
    ["circle", { "cx": "12", "cy": "7", "r": "4" }]
  ];
  Icon($$renderer, spread_props([
    { name: "user" },
    $$sanitized_props,
    {
      /**
       * @component @name User
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTkgMjF2LTJhNCA0IDAgMCAwLTQtNEg5YTQgNCAwIDAgMC00IDR2MiIgLz4KICA8Y2lyY2xlIGN4PSIxMiIgY3k9IjciIHI9IjQiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/user
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
function Button$1($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      href,
      type,
      children,
      disabled = false,
      ref = null,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    element(
      $$renderer2,
      href ? "a" : "button",
      () => {
        $$renderer2.push(`${attributes({
          "data-button-root": true,
          type: href ? void 0 : type,
          href: href && !disabled ? href : void 0,
          disabled: href ? void 0 : disabled,
          "aria-disabled": href ? disabled : void 0,
          role: href && disabled ? "link" : void 0,
          tabindex: href && disabled ? -1 : 0,
          ...restProps
        })}`);
      },
      () => {
        children?.($$renderer2);
        $$renderer2.push(`<!---->`);
      }
    );
    bind_props($$props, { ref });
  });
}
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
function Button($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      class: className = void 0,
      variant = "default",
      size = "default",
      builders = [],
      children,
      onclick,
      onkeydown,
      $$slots,
      $$events,
      ...rest
    } = $$props;
    $$renderer2.push(`<!---->`);
    Button$1($$renderer2, spread_props([
      {
        builders,
        class: cn(buttonVariants({ variant, size, className })),
        type: "button",
        onclick,
        onkeydown
      },
      rest,
      {
        children: ($$renderer3) => {
          children?.($$renderer3);
          $$renderer3.push(`<!---->`);
        },
        $$slots: { default: true }
      }
    ]));
    $$renderer2.push(`<!---->`);
  });
}
const EMBLA_CAROUSEL_CONTEXT = Symbol("EMBLA_CAROUSEL_CONTEXT");
function setEmblaContext(config) {
  setContext(EMBLA_CAROUSEL_CONTEXT, config);
  return config;
}
function getEmblaContext(name = "This component") {
  if (!hasContext(EMBLA_CAROUSEL_CONTEXT)) {
    throw new Error(`${name} must be used within a <Carousel.Root> component`);
  }
  return getContext(EMBLA_CAROUSEL_CONTEXT);
}
function Carousel($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      opts = {},
      plugins = [],
      api = void 0,
      orientation = "horizontal",
      class: className = void 0,
      children,
      $$slots,
      $$events,
      ...rest
    } = $$props;
    const apiStore = writable(void 0);
    const orientationStore = writable(orientation);
    const canScrollPrev = writable(false);
    const canScrollNext = writable(false);
    const optionsStore = writable(opts);
    const pluginStore = writable(plugins);
    const scrollSnapsStore = writable([]);
    const selectedIndexStore = writable(0);
    run(() => {
      orientationStore.set(orientation);
    });
    run(() => {
      pluginStore.set(plugins);
    });
    run(() => {
      optionsStore.set(opts);
    });
    function scrollPrev() {
      api?.scrollPrev();
    }
    function scrollNext() {
      api?.scrollNext();
    }
    function Content(Content2) {
      throw new Error("Function not implemented.");
    }
    function scrollTo(index, jump) {
      api?.scrollTo(index, jump);
    }
    function onSelect(api2) {
      if (!api2) return;
      canScrollPrev.set(api2.canScrollPrev());
      canScrollNext.set(api2.canScrollNext());
      selectedIndexStore.set(api2.selectedScrollSnap());
    }
    run(() => {
      if (api) {
        onSelect(api);
        api.on("select", onSelect);
        api.on("reInit", onSelect);
      }
    });
    function handleKeyDown(e) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        scrollPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        scrollNext();
      }
    }
    setEmblaContext({
      api: apiStore,
      scrollPrev,
      scrollNext,
      orientation: orientationStore,
      canScrollNext,
      canScrollPrev,
      handleKeyDown,
      options: optionsStore,
      plugins: pluginStore,
      onInit,
      scrollSnaps: scrollSnapsStore,
      selectedIndex: selectedIndexStore,
      scrollTo
    });
    function onInit(event) {
      api = event.detail;
      apiStore.set(api);
      scrollSnapsStore.set(api.scrollSnapList());
    }
    onDestroy(() => {
      api?.off("select", onSelect);
    });
    $$renderer2.push(`<div${attributes({
      class: clsx$1(cn("relative", className)),
      role: "region",
      "aria-roledescription": "carousel",
      ...rest
    })}>`);
    children?.($$renderer2);
    $$renderer2.push(`<!----></div>`);
    bind_props($$props, { api, Content });
  });
}
function Carousel_content($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let {
      class: className = void 0,
      children,
      $$slots,
      $$events,
      ...rest
    } = $$props;
    const { orientation, options, plugins, onInit } = getEmblaContext("<Carousel.Content/>");
    $$renderer2.push(`<div class="overflow-hidden"><div${attributes({
      class: clsx$1(cn("flex", store_get($$store_subs ??= {}, "$orientation", orientation) === "horizontal" ? "-ml-4" : "-mt-4 flex-col", className)),
      "data-embla-container": "",
      ...rest
    })}>`);
    children?.($$renderer2);
    $$renderer2.push(`<!----></div></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
function Carousel_item($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let {
      class: className = void 0,
      children,
      $$slots,
      $$events,
      ...rest
    } = $$props;
    const { orientation } = getEmblaContext("<Carousel.Item/>");
    $$renderer2.push(`<div${attributes({
      role: "group",
      "aria-roledescription": "slide",
      class: clsx$1(cn("min-w-0 shrink-0 grow-0 basis-full", store_get($$store_subs ??= {}, "$orientation", orientation) === "horizontal" ? "pl-4" : "pt-4", className)),
      "data-embla-slide": "",
      ...rest
    })}>`);
    children?.($$renderer2);
    $$renderer2.push(`<!----></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
function Carousel_previous($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let {
      class: className = void 0,
      variant = "outline",
      size = "icon",
      $$slots,
      $$events,
      ...rest
    } = $$props;
    const { orientation, canScrollPrev, scrollPrev, handleKeyDown } = getEmblaContext("<Carousel.Previous/>");
    Button($$renderer2, spread_props([
      {
        variant,
        size,
        class: cn(
          "absolute h-8 w-8 touch-manipulation rounded-full",
          store_get($$store_subs ??= {}, "$orientation", orientation) === "horizontal" ? "-left-12 top-1/2 -translate-y-1/2" : "-top-12 left-1/2 -translate-x-1/2 rotate-90",
          className
        ),
        disabled: !store_get($$store_subs ??= {}, "$canScrollPrev", canScrollPrev),
        onclick: scrollPrev,
        onkeydown: handleKeyDown
      },
      rest,
      {
        children: ($$renderer3) => {
          Arrow_left($$renderer3, { class: "h-4 w-4" });
          $$renderer3.push(`<!----> <span class="sr-only">Previous slide</span>`);
        },
        $$slots: { default: true }
      }
    ]));
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
function Carousel_next($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let {
      class: className = void 0,
      variant = "outline",
      size = "icon",
      $$slots,
      $$events,
      ...rest
    } = $$props;
    const { orientation, canScrollNext, scrollNext, handleKeyDown } = getEmblaContext("<Carousel.Next/>");
    Button($$renderer2, spread_props([
      {
        variant,
        size,
        class: cn(
          "absolute h-8 w-8 touch-manipulation rounded-full",
          store_get($$store_subs ??= {}, "$orientation", orientation) === "horizontal" ? "-right-12 top-1/2 -translate-y-1/2" : "-bottom-12 left-1/2 -translate-x-1/2 rotate-90",
          className
        ),
        disabled: !store_get($$store_subs ??= {}, "$canScrollNext", canScrollNext),
        onclick: scrollNext,
        onkeydown: handleKeyDown
      },
      rest,
      {
        children: ($$renderer3) => {
          Arrow_right($$renderer3, { class: "h-4 w-4" });
          $$renderer3.push(`<!----> <span class="sr-only">Next slide</span>`);
        },
        $$slots: { default: true }
      }
    ]));
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
function RelatedBooks($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { books = [], title = "More by this Author" } = $$props;
    function getBookISBN(book) {
      const primaryEdition = book?.editions?.find((e) => e.isPrimary) || book?.editions?.[0];
      return primaryEdition?.isbn || primaryEdition?.isbn10 || book.id || "";
    }
    function getBookUrl(book) {
      const isbn = getBookISBN(book);
      return book?.slug && isbn ? `/shop/books/${book.slug}/${isbn}` : `/shop/books`;
    }
    if (books.length > 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<section class="section bg-muted/30"><div class="container mx-auto px-4"><div class="text-center mb-12"><p class="text-primary font-semibold uppercase tracking-wide mb-2">Keep Shopping</p> <h2 class="text-3xl md:text-4xl font-bold font-display mb-4">${escape_html(title)}</h2> <div class="w-20 h-1 bg-primary mx-auto mb-4"></div> <p class="text-muted-foreground">Swipe or use arrows to browse</p></div> <!---->`);
      Carousel($$renderer2, {
        opts: {
          align: "start",
          loop: false,
          slidesToScroll: 1,
          breakpoints: {
            "(min-width: 640px)": { slidesToScroll: 2 },
            "(min-width: 1024px)": { slidesToScroll: 4 }
          }
        },
        class: "w-full",
        children: ($$renderer3) => {
          $$renderer3.push(`<!---->`);
          Carousel_content($$renderer3, {
            class: "-ml-2 md:-ml-4",
            children: ($$renderer4) => {
              $$renderer4.push(`<!--[-->`);
              const each_array = ensure_array_like(books);
              for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                let book = each_array[$$index];
                $$renderer4.push(`<!---->`);
                Carousel_item($$renderer4, {
                  class: "pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/4",
                  children: ($$renderer5) => {
                    $$renderer5.push(`<a${attr("href", getBookUrl(book))} class="block h-full"><div class="group bg-card rounded-2xl border border-border/50 overflow-hidden shadow-soft transition-all duration-300 hover:shadow-medium hover:-translate-y-1 h-full"><div class="relative aspect-[3/4] overflow-hidden bg-muted"><img${attr("src", getImageUrl(book?.images?.[0]?.image || book?.images?.[0] || (book?.scrapedImageUrls?.[0]?.url ? { url: book.scrapedImageUrls[0].url } : null), { fallback: "/assets/images/resources/placeholder-book.jpg" }))}${attr("alt", book.title)} class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy"/> <div class="absolute bottom-0 left-0 right-0 p-3 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">`);
                    AddToCartButton($$renderer5, {
                      className: "w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-lg",
                      productId: book.id || book._id,
                      productType: "books",
                      iconOnly: false,
                      label: "Add to Cart"
                    });
                    $$renderer5.push(`<!----></div></div> <div class="p-4 text-center"><h4 class="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors mb-1">${escape_html(book.title)}</h4> `);
                    if (book.authors?.length) {
                      $$renderer5.push("<!--[-->");
                      $$renderer5.push(`<p class="text-sm text-muted-foreground mb-2 line-clamp-1">by ${escape_html(book.authors.map((a) => a.name).join(", "))}</p>`);
                    } else {
                      $$renderer5.push("<!--[!-->");
                    }
                    $$renderer5.push(`<!--]--> <p class="text-lg font-bold text-primary">${escape_html(formatCurrency((book?.pricing?.retailPrice || book?.editions?.[0]?.pricing?.retailPrice || 0) / 100))}</p></div></div></a>`);
                  },
                  $$slots: { default: true }
                });
                $$renderer4.push(`<!---->`);
              }
              $$renderer4.push(`<!--]-->`);
            },
            $$slots: { default: true }
          });
          $$renderer3.push(`<!----> <!---->`);
          Carousel_previous($$renderer3, {
            class: "absolute -left-4 sm:-left-12 top-1/3 -translate-y-1/2 h-12 w-12 bg-card border-2 border-border hover:bg-primary hover:border-primary hover:text-primary-foreground shadow-medium transition-all"
          });
          $$renderer3.push(`<!----> <!---->`);
          Carousel_next($$renderer3, {
            class: "absolute -right-4 sm:-right-12 top-1/3 -translate-y-1/2 h-12 w-12 bg-card border-2 border-border hover:bg-primary hover:border-primary hover:text-primary-foreground shadow-medium transition-all"
          });
          $$renderer3.push(`<!---->`);
        },
        $$slots: { default: true }
      });
      $$renderer2.push(`<!----></div></section>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
function BookDetailPage($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      book,
      seo = {},
      settings = {},
      booksByAuthor = [],
      relatedBooks = []
    } = $$props;
    const authors = book?.authors || [];
    const primaryEdition = book?.editions?.find((edition) => edition.isPrimary) || book?.editions?.[0] || {};
    const binding = (primaryEdition?.binding || "Book").toString();
    const isbn = primaryEdition?.isbn || primaryEdition?.isbn10 || "";
    const published = primaryEdition?.datePublished || "";
    const pages = primaryEdition?.pages;
    const language = primaryEdition?.language;
    const priceCents = book?.pricing?.retailPrice ?? 0;
    const price = (priceCents || 0) / 100;
    const coverUrl = getImageUrl(book?.images?.[0]?.image || book?.images?.[0] || (book?.scrapedImageUrls?.[0]?.url ? { url: book.scrapedImageUrls[0].url } : null), { fallback: "/assets/images/resources/placeholder-book.jpg" });
    const description = book?.synopsis || book?.description || "No description available.";
    const subjects = book?.subjects?.map((s) => s.subject).filter(Boolean) || [];
    const tags = book?.tags || [];
    const categories = book?.categories || [];
    const metadata = () => ({
      title: seo?.title || `${book?.title} | Alkebu-Lan Images`,
      description: seo?.description || description,
      image: seo?.image || coverUrl,
      imageAlt: seo?.imageAlt || book?.title,
      url: seo?.canonical || `/shop/books/${book?.slug || ""}`
    });
    Meta($$renderer2, { metadata });
    $$renderer2.push(`<!----> <section class="page-header-modern"><div class="container mx-auto px-4"><nav class="flex items-center gap-2 text-sm text-white/80 mb-4"><a href="/shop/" class="hover:text-white transition-colors">Shop</a> `);
    Chevron_right($$renderer2, { class: "w-4 h-4" });
    $$renderer2.push(`<!----> <a href="/shop/books/" class="hover:text-white transition-colors">Books</a> `);
    Chevron_right($$renderer2, { class: "w-4 h-4" });
    $$renderer2.push(`<!----> <span class="text-white font-medium truncate max-w-[200px]">${escape_html(book?.title)}</span></nav> <h1 class="text-3xl md:text-4xl font-bold font-display">Book Details</h1></div></section> <section class="section bg-background"><div class="container mx-auto px-4"><div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16"><div class="lg:sticky lg:top-24 lg:self-start"><div class="relative group"><div class="aspect-[3/4] rounded-2xl overflow-hidden bg-muted shadow-strong"><img loading="lazy"${attr("src", coverUrl)}${attr("alt", book?.title)} class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"/></div> <div class="absolute top-4 left-4 badge-primary">`);
    Book($$renderer2, { class: "w-3 h-3 mr-1" });
    $$renderer2.push(`<!----> ${escape_html(binding.charAt(0).toUpperCase() + binding.slice(1))}</div></div></div> <div class="space-y-6"><div class="space-y-3"><h1 class="text-3xl md:text-4xl font-bold font-display text-foreground">${escape_html(book?.title)}</h1> `);
    if (book?.titleLong) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<p class="text-lg text-muted-foreground">${escape_html(book.titleLong)}</p>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (authors.length) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<p class="text-lg flex items-center gap-2">`);
      User($$renderer2, { class: "w-5 h-5 text-primary" });
      $$renderer2.push(`<!----> <span class="text-muted-foreground">by</span> <!--[-->`);
      const each_array = ensure_array_like(authors);
      for (let i = 0, $$length = each_array.length; i < $$length; i++) {
        let author = each_array[i];
        if (author.slug) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<a${attr("href", `/shop/books/authors/${stringify(author.slug)}/`)} class="text-foreground hover:text-primary transition-colors font-medium">${escape_html(author.name)}</a>${escape_html(i < authors.length - 1 ? ", " : "")}`);
        } else {
          $$renderer2.push("<!--[!-->");
          $$renderer2.push(`<span class="font-medium">${escape_html(author.name)}</span>${escape_html(i < authors.length - 1 ? ", " : "")}`);
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]--></p>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div> <div class="bg-muted/50 rounded-2xl p-6 space-y-4"><div class="flex items-center justify-between"><div><p class="text-sm text-muted-foreground mb-1">Price</p> <p class="text-4xl font-bold text-primary">${escape_html(formatCurrency(price))}</p></div> `);
    AddToCartButton($$renderer2, {
      productId: book?.id || book?._id,
      productType: "books",
      className: "btn-primary btn-lg",
      label: "Add to Cart"
    });
    $$renderer2.push(`<!----></div></div> <div class="grid grid-cols-2 gap-4">`);
    if (isbn) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="bg-card rounded-xl p-4 border border-border/50"><p class="text-xs text-muted-foreground uppercase tracking-wide mb-1">ISBN</p> <p class="font-medium text-foreground">${escape_html(isbn)}</p></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (published) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="bg-card rounded-xl p-4 border border-border/50"><div class="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide mb-1">`);
      Calendar($$renderer2, { class: "w-3 h-3" });
      $$renderer2.push(`<!----> Published</div> <p class="font-medium text-foreground">${escape_html(published)}</p></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (pages) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="bg-card rounded-xl p-4 border border-border/50"><div class="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide mb-1">`);
      File_text($$renderer2, { class: "w-3 h-3" });
      $$renderer2.push(`<!----> Pages</div> <p class="font-medium text-foreground">${escape_html(pages)}</p></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (language) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="bg-card rounded-xl p-4 border border-border/50"><div class="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide mb-1">`);
      Globe($$renderer2, { class: "w-3 h-3" });
      $$renderer2.push(`<!----> Language</div> <p class="font-medium text-foreground capitalize">${escape_html(language)}</p></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div> `);
    if (categories?.length || subjects?.length || tags?.length) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="space-y-4">`);
      if (categories?.length) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="flex items-start gap-3">`);
        Layers($$renderer2, { class: "w-5 h-5 text-primary mt-0.5 flex-shrink-0" });
        $$renderer2.push(`<!----> <div><p class="text-sm text-muted-foreground mb-2">Categories</p> <div class="flex flex-wrap gap-2"><!--[-->`);
        const each_array_1 = ensure_array_like(categories);
        for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
          let category = each_array_1[$$index_1];
          $$renderer2.push(`<span class="badge-primary">${escape_html(category)}</span>`);
        }
        $$renderer2.push(`<!--]--></div></div></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> `);
      if (subjects?.length) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="flex items-start gap-3">`);
        Book($$renderer2, { class: "w-5 h-5 text-secondary mt-0.5 flex-shrink-0" });
        $$renderer2.push(`<!----> <div><p class="text-sm text-muted-foreground mb-2">Subjects</p> <div class="flex flex-wrap gap-2"><!--[-->`);
        const each_array_2 = ensure_array_like(subjects);
        for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
          let subject = each_array_2[$$index_2];
          $$renderer2.push(`<span class="badge-secondary">${escape_html(subject)}</span>`);
        }
        $$renderer2.push(`<!--]--></div></div></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> `);
      if (tags?.length) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="flex items-start gap-3">`);
        Tag($$renderer2, { class: "w-5 h-5 text-accent mt-0.5 flex-shrink-0" });
        $$renderer2.push(`<!----> <div><p class="text-sm text-muted-foreground mb-2">Tags</p> <div class="flex flex-wrap gap-2"><!--[-->`);
        const each_array_3 = ensure_array_like(tags);
        for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
          let tag = each_array_3[$$index_3];
          $$renderer2.push(`<span class="px-3 py-1 bg-muted text-muted-foreground rounded-full text-sm">${escape_html(tag)}</span>`);
        }
        $$renderer2.push(`<!--]--></div></div></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div class="pt-6 border-t border-border"><h3 class="text-xl font-bold font-display mb-4">About This Book</h3> <div class="prose prose-gray max-w-none"><p class="text-muted-foreground leading-relaxed whitespace-pre-line">${escape_html(description)}</p></div></div></div></div></div></section> `);
    if (booksByAuthor && booksByAuthor.length > 0) {
      $$renderer2.push("<!--[-->");
      RelatedBooks($$renderer2, { books: booksByAuthor, title: "More by this Author" });
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (relatedBooks && relatedBooks.length > 0) {
      $$renderer2.push("<!--[-->");
      RelatedBooks($$renderer2, { books: relatedBooks, title: "You May Also Like" });
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  BookDetailPage as B
};
