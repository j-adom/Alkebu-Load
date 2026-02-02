<script lang="ts">
  import type { Cart } from '$lib/stores/cart';
  import { formatCurrency } from '$lib/utils/currency';

  interface Props {
    cart: Cart;
    children?: () => any;
  }

  let { cart, children }: Props = $props();
</script>

<section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
  <h2 class="text-xl font-semibold text-thm-black">Order summary</h2>
  <dl class="mt-4 space-y-3 text-sm">
    <div class="flex items-center justify-between">
      <dt class="text-gray-600">Subtotal</dt>
      <dd class="font-medium text-thm-black">{formatCurrency(cart.subtotal)}</dd>
    </div>
    <div class="flex items-center justify-between">
      <dt class="text-gray-600">Estimated tax</dt>
      <dd class="font-medium text-thm-black">{formatCurrency(cart.tax)}</dd>
    </div>
    <div class="flex items-center justify-between">
      <dt class="text-gray-600">Shipping</dt>
      <dd class="font-medium text-thm-black">
        {cart.shipping > 0 ? formatCurrency(cart.shipping) : 'Calculated at checkout'}
      </dd>
    </div>
  </dl>

  <div class="mt-5 flex items-center justify-between border-t border-gray-200 pt-4">
    <dt class="text-base font-semibold text-thm-black">Total</dt>
    <dd class="text-2xl font-bold text-thm-primary">{formatCurrency(cart.total)}</dd>
  </div>

  <div class="mt-6">
    {@render children?.()}
  </div>
</section>
