<script lang="ts">
  import type { Cart } from '$lib/stores/cart';
  import { formatCurrency } from '$lib/utils/currency';

  interface Props {
    cart: Cart;
    children?: () => any;
  }

  let { cart, children }: Props = $props();
</script>

<section class="rounded-2xl border border-border bg-card p-6 shadow-soft">
  <h2 class="text-xl font-semibold text-foreground">Order summary</h2>
  <dl class="mt-4 space-y-3 text-sm">
    <div class="flex items-center justify-between">
      <dt class="text-muted-foreground">Subtotal</dt>
      <dd class="font-medium text-foreground">{formatCurrency(cart.subtotal)}</dd>
    </div>
    <div class="flex items-center justify-between">
      <dt class="text-muted-foreground">Estimated tax</dt>
      <dd class="font-medium text-foreground">{formatCurrency(cart.tax)}</dd>
    </div>
    <div class="flex items-center justify-between">
      <dt class="text-muted-foreground">Shipping</dt>
      <dd class="font-medium text-foreground">
        {cart.shipping > 0 ? formatCurrency(cart.shipping) : 'Calculated at checkout'}
      </dd>
    </div>
  </dl>

  <div class="mt-5 flex items-center justify-between border-t border-border pt-4">
    <dt class="text-base font-semibold text-foreground">Total</dt>
    <dd class="text-2xl font-bold text-primary">{formatCurrency(cart.total)}</dd>
  </div>

  <div class="mt-6">
    {@render children?.()}
  </div>
</section>
