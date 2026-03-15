<script lang="ts">
  import { page } from '$app/stores';
  import { cart, createEmptyCart } from '$lib/stores/cart';
  import { cartDrawer } from '$lib/stores/cartDrawer';
  import CartLineItem from '$lib/components/cart/CartLineItem.svelte';
  import CartTotals from '$lib/components/cart/CartTotals.svelte';
  import Meta from '$lib/components/Meta.svelte';
  import { ShoppingBag, ArrowLeft, Trash2, CreditCard } from 'lucide-svelte';

  let cartState = $state(createEmptyCart());

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

  function handleCheckout() {
    cartDrawer.close();
    window.location.href = '/checkout';
  }

  const isEmpty = $derived(cartState.itemCount === 0);
</script>

<Meta
  title="Shopping Cart"
  description="Review and manage your shopping cart"
  canonicalUrl="{$page.url.origin}/cart"
/>

<div class="min-h-screen bg-background">
  <!-- Header -->
  <div class="border-b border-border bg-card">
    <div class="container mx-auto px-4 py-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl md:text-4xl font-bold text-foreground font-display">Shopping Cart</h1>
          <p class="mt-1 text-muted-foreground">
            {cartState.itemCount} {cartState.itemCount === 1 ? 'item' : 'items'} in your cart
          </p>
        </div>
        <a href="/shop" class="btn-ghost btn-sm hidden sm:inline-flex">
          <ArrowLeft size={18} />
          Continue Shopping
        </a>
      </div>
    </div>
  </div>

  <div class="container mx-auto px-4 py-8">
    {#if isEmpty}
      <!-- Empty Cart State -->
      <div class="max-w-md mx-auto text-center py-16">
        <div class="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
          <ShoppingBag size={48} class="text-muted-foreground" />
        </div>
        <h2 class="text-2xl font-bold text-foreground mb-2">Your cart is empty</h2>
        <p class="text-muted-foreground mb-8">
          Looks like you haven't added anything to your cart yet. Start shopping to discover amazing books and products.
        </p>
        <a href="/shop" class="btn-primary btn-lg">
          <ShoppingBag size={20} />
          Start Shopping
        </a>
      </div>
    {:else}
      <!-- Cart Contents -->
      <div class="grid gap-8 lg:grid-cols-3">
        <!-- Cart Items -->
        <div class="lg:col-span-2 space-y-4">
          {#each cartState.items as item (item.id)}
            <CartLineItem {item} />
          {/each}

          <!-- Clear Cart Option -->
          <div class="pt-4 flex items-center justify-between border-t border-border">
            <a href="/shop" class="btn-ghost btn-sm">
              <ArrowLeft size={16} />
              Continue Shopping
            </a>
            <button
              onclick={handleClearCart}
              disabled={isClearing}
              class="btn btn-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
            >
              <Trash2 size={16} />
              {isClearing ? 'Clearing...' : 'Clear Cart'}
            </button>
          </div>
          
          {#if clearError}
            <p class="text-sm text-destructive animate-fade-in">{clearError}</p>
          {/if}
        </div>

        <!-- Cart Summary -->
        <div class="lg:col-span-1">
          <div class="lg:sticky lg:top-6 space-y-4">
            <CartTotals cart={cartState} />

            <div class="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <button
                onclick={handleCheckout}
                class="btn-primary w-full"
              >
                <CreditCard size={18} />
                Proceed to Checkout
              </button>

              <p class="mt-4 text-sm text-muted-foreground">
                Checkout is where shipping, tax, and payment details are finalized.
              </p>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>
