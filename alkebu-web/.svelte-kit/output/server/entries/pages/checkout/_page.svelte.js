import { e as stringify, f as store_get, u as unsubscribe_stores } from "../../../chunks/index2.js";
import { p as page } from "../../../chunks/stores.js";
import "../../../chunks/cart.js";
import { M as Meta } from "../../../chunks/Meta.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    Meta($$renderer2, {
      canonicalUrl: `${stringify(store_get($$store_subs ??= {}, "$page", page).url.origin)}/checkout`
    });
    $$renderer2.push(`<!----> <div class="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8"><div class="mx-auto max-w-2xl"><div class="mb-8"><h1 class="text-3xl font-bold text-foreground">Checkout</h1> <p class="mt-2 text-muted-foreground">Complete your purchase</p></div> `);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="rounded-2xl border border-dashed border-border bg-card p-8 text-center"><p class="text-muted-foreground mb-4">Your cart is empty</p> <a href="/shop" class="btn-primary">Continue Shopping</a></div>`);
    }
    $$renderer2.push(`<!--]--></div></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
