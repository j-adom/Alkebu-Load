<script lang="ts">
  import type { Cart } from '$lib/stores/cart';
  import { formatCents } from '$lib/utils/currency';

  interface Props {
    cart: Cart;
    children?: () => any;
  }

  let { cart, children }: Props = $props();
  const hasEstimatedTotals = $derived(Boolean(cart.hasEstimatedTotals));
</script>

<section class="rounded-2xl border border-border bg-card p-6 shadow-soft">
  <h2 class="text-xl font-semibold text-foreground">Order summary</h2>
  <p class="mt-2 text-sm text-muted-foreground">
    {#if hasEstimatedTotals}
      Based on the shipping address currently attached to this cart.
    {:else}
      Shipping and sales tax are calculated after you enter your address at checkout.
    {/if}
  </p>

  <dl class="mt-4 space-y-3 text-sm">
    <div class="flex items-center justify-between">
      <dt class="text-muted-foreground">Subtotal</dt>
      <dd class="font-medium text-foreground">{formatCents(cart.subtotal)}</dd>
    </div>
    <div class="flex items-center justify-between">
      <dt class="text-muted-foreground">Sales tax</dt>
      <dd class="font-medium text-foreground">
        {#if hasEstimatedTotals}
          {formatCents(cart.tax)}
        {:else}
          Calculated at checkout
        {/if}
      </dd>
    </div>
    <div class="flex items-center justify-between">
      <dt class="text-muted-foreground">Shipping</dt>
      <dd class="font-medium text-foreground">
        {#if hasEstimatedTotals}
          {formatCents(cart.shipping)}
        {:else}
          Calculated at checkout
        {/if}
      </dd>
    </div>
  </dl>

  <div class="mt-5 flex items-center justify-between border-t border-border pt-4">
    <dt class="text-base font-semibold text-foreground">
      {hasEstimatedTotals ? 'Estimated total' : 'Current subtotal'}
    </dt>
    <dd class="text-2xl font-bold text-primary">{formatCents(cart.total)}</dd>
  </div>

  <div class="mt-6">
    {@render children?.()}
  </div>
</section>
