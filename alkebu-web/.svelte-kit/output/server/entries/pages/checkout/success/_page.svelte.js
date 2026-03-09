import { e as escape_html } from "../../../../chunks/utils2.js";
import "clsx";
import { p as paymentProvider } from "../../../../chunks/cart.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    const sessionId = data.sessionId;
    const status = data.status;
    $$renderer2.push(`<section class="mx-auto max-w-3xl px-6 py-16 text-center">`);
    if (!sessionId) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="rounded-2xl border border-dashed border-border bg-card p-10 shadow-soft"><h1 class="text-3xl font-bold text-foreground">Checkout complete</h1> <p class="mt-3 text-muted-foreground">We couldn't locate your payment session. If you completed a purchase,
        you'll receive an email confirmation shortly.</p> <p class="mt-2 text-sm text-muted-foreground">Payments are processed by ${escape_html(paymentProvider.name)}. `);
      {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`${escape_html(paymentProvider.note)}`);
      }
      $$renderer2.push(`<!--]--></p> <a href="/shop" class="btn-primary mt-8">Return to shop</a></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div class="rounded-2xl border border-border bg-card p-10 shadow-medium"><div class="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg></div> <p class="text-sm uppercase tracking-wide text-primary">Thank you</p> <h1 class="mt-2 text-4xl font-bold text-foreground">Order confirmed!</h1> `);
      if (status?.orderCreated) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<p class="mt-3 text-lg text-muted-foreground">We received your payment and are preparing your order.</p> `);
        if (status?.orderNumber) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<p class="mt-1 text-sm font-semibold text-muted-foreground">Order # ${escape_html(status.orderNumber)}</p>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]-->`);
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<p class="mt-3 text-lg text-muted-foreground">Your payment is processing. We'll email you a receipt and tracking
          details soon.</p>`);
      }
      $$renderer2.push(`<!--]--> <p class="mt-4 text-sm text-muted-foreground">Payments are processed by ${escape_html(paymentProvider.name)}. `);
      {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`${escape_html(paymentProvider.note)}`);
      }
      $$renderer2.push(`<!--]--></p> <div class="mt-8 space-x-3"><a href="/shop" class="btn-primary">Continue shopping</a> <a href="/contact" class="btn-outline">Contact support</a></div></div>`);
    }
    $$renderer2.push(`<!--]--></section>`);
  });
}
export {
  _page as default
};
