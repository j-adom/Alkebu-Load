import { e as stringify, f as store_get, u as unsubscribe_stores } from "../../../chunks/index2.js";
import { p as page } from "../../../chunks/stores.js";
import "../../../chunks/cart.js";
import "../../../chunks/cartDrawer.js";
/* empty css                                                         */
import "../../../chunks/index3.js";
import { M as Meta } from "../../../chunks/Meta.js";
import { A as Arrow_left } from "../../../chunks/arrow-left.js";
import { S as Shopping_bag } from "../../../chunks/shopping-bag.js";
import { e as escape_html } from "../../../chunks/utils2.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let cartState = { itemCount: 0 };
    Meta($$renderer2, {
      canonicalUrl: `${stringify(store_get($$store_subs ??= {}, "$page", page).url.origin)}/cart`
    });
    $$renderer2.push(`<!----> <div class="min-h-screen bg-background"><div class="border-b border-border bg-card"><div class="container mx-auto px-4 py-6"><div class="flex items-center justify-between"><div><h1 class="text-3xl md:text-4xl font-bold text-foreground font-display">Shopping Cart</h1> <p class="mt-1 text-muted-foreground">${escape_html(cartState.itemCount)} ${escape_html("items")} in your cart</p></div> <a href="/shop" class="btn-ghost btn-sm hidden sm:inline-flex">`);
    Arrow_left($$renderer2, { size: 18 });
    $$renderer2.push(`<!----> Continue Shopping</a></div></div></div> <div class="container mx-auto px-4 py-8">`);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="max-w-md mx-auto text-center py-16"><div class="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">`);
      Shopping_bag($$renderer2, { size: 48, class: "text-muted-foreground" });
      $$renderer2.push(`<!----></div> <h2 class="text-2xl font-bold text-foreground mb-2">Your cart is empty</h2> <p class="text-muted-foreground mb-8">Looks like you haven't added anything to your cart yet. Start shopping to discover amazing books and products.</p> <a href="/shop" class="btn-primary btn-lg">`);
      Shopping_bag($$renderer2, { size: 20 });
      $$renderer2.push(`<!----> Start Shopping</a></div>`);
    }
    $$renderer2.push(`<!--]--></div></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
