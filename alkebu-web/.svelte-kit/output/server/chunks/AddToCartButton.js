import { s as sanitize_props, a as spread_props, b as slot, c as attr_class, d as attr, e as stringify } from "./index2.js";
import "./cart.js";
import "./cartDrawer.js";
import { I as Icon } from "./Icon.js";
import { e as escape_html } from "./utils2.js";
function Shopping_cart($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  /**
   * @license lucide-svelte v0.452.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   */
  const iconNode = [
    ["circle", { "cx": "8", "cy": "21", "r": "1" }],
    ["circle", { "cx": "19", "cy": "21", "r": "1" }],
    [
      "path",
      {
        "d": "M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"
      }
    ]
  ];
  Icon($$renderer, spread_props([
    { name: "shopping-cart" },
    $$sanitized_props,
    {
      /**
       * @component @name ShoppingCart
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8Y2lyY2xlIGN4PSI4IiBjeT0iMjEiIHI9IjEiIC8+CiAgPGNpcmNsZSBjeD0iMTkiIGN5PSIyMSIgcj0iMSIgLz4KICA8cGF0aCBkPSJNMi4wNSAyLjA1aDJsMi42NiAxMi40MmEyIDIgMCAwIDAgMiAxLjU4aDkuNzhhMiAyIDAgMCAwIDEuOTUtMS41N2wxLjY1LTcuNDNINS4xMiIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/shopping-cart
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
function AddToCartButton($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      productId,
      productType = "books",
      quantity = 1,
      customization,
      className = "btn-primary",
      disabled = false,
      iconOnly = false,
      label = "Add to Cart",
      loadingLabel = "Adding…",
      successLabel = "Added!",
      iconClass = "",
      onsuccess,
      onerror
    } = $$props;
    let isAdding = false;
    const buttonText = /* @__PURE__ */ (() => {
      return label;
    })();
    const computedDisabled = disabled || !productId || isAdding;
    const accessibleLabel = iconOnly ? label : void 0;
    $$renderer2.push(`<button type="button"${attr_class(`${stringify(className)} ${stringify("")}`)}${attr("disabled", computedDisabled, true)} aria-live="polite"${attr("aria-label", accessibleLabel)}>`);
    if (iconOnly) {
      $$renderer2.push("<!--[-->");
      {
        $$renderer2.push("<!--[!-->");
        {
          $$renderer2.push("<!--[!-->");
          Shopping_cart($$renderer2, { size: 20 });
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]-->`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<span class="inline-flex items-center gap-2">`);
      {
        $$renderer2.push("<!--[!-->");
        {
          $$renderer2.push("<!--[!-->");
          Shopping_cart($$renderer2, { size: 18 });
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]--> ${escape_html(buttonText)}</span>`);
    }
    $$renderer2.push(`<!--]--></button> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  AddToCartButton as A
};
