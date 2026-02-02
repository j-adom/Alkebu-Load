<script lang="ts">
  import { page } from '$app/stores';
  import { cart } from '$lib/stores/cart';
  import { cartDrawer } from '$lib/stores/cartDrawer';
  import CartLineItem from '$lib/components/cart/CartLineItem.svelte';
  import CartTotals from '$lib/components/cart/CartTotals.svelte';
  import { Button } from '$lib/components/ui/button';
  import Meta from '$lib/components/Meta.svelte';

  let cartState = $state({
    items: [],
    itemCount: 0,
    subtotal: 0,
    tax: 0,
    total: 0,
  });

  let isClearing = $state(false);
  let clearError = $state<string | null>(null);

  $effect(() => {
    const unsubscribe = cart.subscribe((value) => {
      cartState = value;
    });
    return unsubscribe;
  });

  async function handleClearCart() {
    if (!window.confirm('Are you sure you want to clear your entire cart?')) return;

    isClearing = true;
    clearError = null;
    const result = await cart.clear();
    isClearing = false;

    if (!result.success) {
      clearError = result.error || 'Failed to clear cart';
    }
  }

  function handleContinueShopping() {
    cartDrawer.close();
    // Navigate to shop page
    window.location.href = '/shop';
  }

  function handleCheckout() {
    cartDrawer.close();
    // Navigate to checkout page
    window.location.href = '/checkout';
  }

  const isEmpty = $derived(cartState.itemCount === 0);
</script>

<Meta
  title="Shopping Cart"
  description="Review and manage your shopping cart"
  canonicalUrl="{$page.url.origin}/cart"
/>

<div class="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
  <div class="mx-auto max-w-4xl">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Shopping Cart</h1>
      <p class="mt-2 text-gray-600">
        {cartState.itemCount} {cartState.itemCount === 1 ? 'item' : 'items'} in your cart
      </p>
    </div>

    {#if isEmpty}
      <!-- Empty Cart State -->
      <div class="rounded-lg border border-gray-200 bg-white p-12 text-center">
        <svg
          class="mx-auto h-16 w-16 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
        <h3 class="mt-4 text-lg font-semibold text-gray-900">Your cart is empty</h3>
        <p class="mt-2 text-gray-600">Start shopping to add items to your cart</p>
        <Button
          on:click={handleContinueShopping}
          variant="default"
          class="mt-6"
        >
          Continue Shopping
        </Button>
      </div>
    {:else}
      <!-- Cart Contents -->
      <div class="grid gap-8 lg:grid-cols-3">
        <!-- Cart Items -->
        <div class="lg:col-span-2">
          <div class="space-y-4">
            {#each cartState.items as item (item.id)}
              <CartLineItem {item} />
            {/each}
          </div>

          <!-- Clear Cart Option -->
          <div class="mt-6 border-t border-gray-200 pt-6">
            <button
              on:click={handleClearCart}
              disabled={isClearing}
              class="text-sm text-red-600 hover:text-red-800 disabled:text-gray-400"
            >
              {isClearing ? 'Clearing...' : 'Clear cart'}
            </button>
            {#if clearError}
              <p class="mt-2 text-sm text-red-600">{clearError}</p>
            {/if}
          </div>
        </div>

        <!-- Cart Summary -->
        <div class="h-fit rounded-lg border border-gray-200 bg-white p-6 lg:sticky lg:top-4">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>

          <CartTotals
            subtotal={cartState.subtotal}
            tax={cartState.tax}
            total={cartState.total}
          />

          <div class="mt-6 space-y-3">
            <Button
              on:click={handleCheckout}
              variant="default"
              class="w-full"
            >
              Proceed to Checkout
            </Button>
            <Button
              on:click={handleContinueShopping}
              variant="outline"
              class="w-full"
            >
              Continue Shopping
            </Button>
          </div>

          <!-- Cart Note -->
          <div class="mt-6 border-t border-gray-200 pt-4">
            <p class="text-xs text-gray-500">
              Taxes and shipping will be calculated at checkout.
            </p>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  :global(body) {
    background-color: rgb(249, 250, 251);
  }
</style>
