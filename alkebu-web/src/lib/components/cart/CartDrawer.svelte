<script lang="ts">
  import { onMount } from 'svelte';
  import CartLineItem from '$lib/components/cart/CartLineItem.svelte';
  import CartTotals from '$lib/components/cart/CartTotals.svelte';
  import { cart, createEmptyCart } from '$lib/stores/cart';
  import { cartDrawer } from '$lib/stores/cartDrawer';
  import { paymentProvider } from '$lib/paymentProvider';

  interface Props {
    user?: {
      email?: string | null;
    } | null;
  }

  let { user = null }: Props = $props();

  let cartState = $state(createEmptyCart());
  let checkoutEmail = $state(user?.email ?? '');
  let taxExempt = $state(false);
  let checkoutError = $state<string | null>(null);
  let isCheckingOut = $state(false);
  let isClearing = $state(false);
  let isOpen = $state(false);
  let shippingAddress = $state({
    street: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
  });

  const isCartEmpty = $derived(cartState.itemCount === 0);

  $effect(() => {
    const unsubscribe = cart.subscribe((value) => {
      cartState = value;
    });
    return unsubscribe;
  });

  $effect(() => {
    const unsubscribe = cartDrawer.subscribe((value) => {
      isOpen = value;
    });
    return unsubscribe;
  });

  $effect(() => {
    if (user?.email && !checkoutEmail) {
      checkoutEmail = user.email;
    }
  });

  $effect(() => {
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('cart-drawer-open', isOpen);
    }
  });

  onMount(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        cartDrawer.close();
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });

  function closeDrawer() {
    cartDrawer.close();
  }

  function validateShipping() {
    if (!shippingAddress.street || !shippingAddress.city || !shippingAddress.state || !shippingAddress.zip) {
      return 'Please enter a complete US shipping address.';
    }
    if (shippingAddress.country && shippingAddress.country !== 'US') {
      return 'Only US shipping addresses are supported.';
    }
    return null;
  }

  async function handleCheckout(event: SubmitEvent) {
    event.preventDefault();
    if (isCartEmpty || isCheckingOut) return;

    const validationError = validateShipping();
    if (validationError) {
      checkoutError = validationError;
      return;
    }

    checkoutError = null;
    isCheckingOut = true;

    const result = await cart.checkout({
      customerEmail: checkoutEmail || undefined,
      taxExempt,
      shippingAddress,
    });

    isCheckingOut = false;

    if (!result.success) {
      checkoutError = result.error || 'Unable to start checkout';
    }
  }

  async function handleClearCart() {
    if (isCartEmpty || isClearing) return;
    isClearing = true;
    const result = await cart.clear();
    isClearing = false;
    if (!result.success) {
      checkoutError = result.error || 'Failed to clear cart';
    }
  }
</script>

<div
  class={`cart-overlay ${isOpen ? 'open' : ''}`}
  aria-hidden={!isOpen}
  onclick={closeDrawer}
></div>

<aside
  class={`cart-drawer ${isOpen ? 'open' : ''}`}
  aria-hidden={!isOpen}
  aria-modal="true"
  role="dialog"
  aria-label="Shopping cart"
  tabindex="-1"
>
  <header class="cart-drawer__header">
    <div>
      <p class="cart-drawer__title">Your cart</p>
      <p class="cart-drawer__count">
        {cartState.itemCount} {cartState.itemCount === 1 ? 'item' : 'items'}
      </p>
    </div>
    <button
      type="button"
      class="cart-drawer__close"
      aria-label="Close cart"
      onclick={closeDrawer}
    >
      <span aria-hidden="true">&times;</span>
    </button>
  </header>

  <div class="cart-drawer__body">
    {#if isCartEmpty}
      <div class="cart-drawer__empty">
        <p class="text-lg font-semibold text-thm-black">Your cart is empty</p>
        <p class="mt-2 text-gray-600">Browse the shop to discover books and gifts.</p>
        <a href="/shop" class="mt-6 inline-flex items-center justify-center rounded-full bg-thm-primary px-5 py-2 font-semibold text-white hover:bg-thm-black" onclick={closeDrawer}>
          Continue shopping
        </a>
      </div>
    {:else}
      <div class="cart-drawer__items">
        {#each cartState.items as item}
          <CartLineItem {item} />
        {/each}
      </div>

      <div class="cart-drawer__footer">
        <div class="flex items-center justify-between text-sm text-gray-500">
          <span>
            {cartState.itemCount} {cartState.itemCount === 1 ? 'item' : 'items'}
          </span>
          <button
            type="button"
            class="font-semibold text-red-600 hover:text-red-500"
            onclick={handleClearCart}
            disabled={isClearing}
          >
            {isClearing ? 'Clearing…' : 'Clear cart'}
          </button>
        </div>

        <CartTotals cart={cartState}>
          <form class="space-y-4" onsubmit={(e) => { e.preventDefault(); handleCheckout(); }}>
            <div>
              <label for="drawer-checkout-email" class="text-sm font-medium text-gray-700">Email address</label>
              <input
                id="drawer-checkout-email"
                type="email"
                placeholder="you@example.com"
                bind:value={checkoutEmail}
                class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-thm-primary focus:outline-none focus:ring-2 focus:ring-thm-primary/20"
                required
              />
              <p class="mt-1 text-xs text-gray-500">Receipts and updates are sent here.</p>
            </div>

            <div class="grid grid-cols-1 gap-3">
              <div>
                <label class="text-sm font-medium text-gray-700">Street address</label>
                <input
                  type="text"
                  placeholder="123 Jefferson St"
                  bind:value={shippingAddress.street}
                  class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-thm-primary focus:outline-none focus:ring-2 focus:ring-thm-primary/20"
                  required
                />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-sm font-medium text-gray-700">City</label>
                  <input
                    type="text"
                    placeholder="Nashville"
                    bind:value={shippingAddress.city}
                    class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-thm-primary focus:outline-none focus:ring-2 focus:ring-thm-primary/20"
                    required
                  />
                </div>
                <div>
                  <label class="text-sm font-medium text-gray-700">State</label>
                  <input
                    type="text"
                    placeholder="TN"
                    bind:value={shippingAddress.state}
                    class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-base uppercase focus:border-thm-primary focus:outline-none focus:ring-2 focus:ring-thm-primary/20"
                    maxlength="2"
                    required
                  />
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-sm font-medium text-gray-700">ZIP code</label>
                  <input
                    type="text"
                    placeholder="37208"
                    bind:value={shippingAddress.zip}
                    class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-thm-primary focus:outline-none focus:ring-2 focus:ring-thm-primary/20"
                    required
                  />
                </div>
                <div>
                  <label class="text-sm font-medium text-gray-700">Country</label>
                  <input
                    type="text"
                    bind:value={shippingAddress.country}
                    class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-base uppercase focus:border-thm-primary focus:outline-none focus:ring-2 focus:ring-thm-primary/20"
                    readonly
                  />
              </div>
              </div>
              <p class="text-xs text-gray-500">
                Tennessee addresses are charged 9.75% sales tax. Other US addresses are not taxed. We ship to US addresses only.
              </p>
            </div>

            <label class="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                bind:checked={taxExempt}
                class="rounded border-gray-300 text-thm-primary focus:ring-thm-primary/50"
              />
              Tax exempt order (institutional or wholesale)
            </label>

            {#if checkoutError}
              <p class="text-sm text-red-600">{checkoutError}</p>
            {/if}

            <div class="flex flex-col gap-2">
              <button
                type="submit"
                class="thm-btn w-full text-center"
                disabled={isCheckingOut}
              >
                {isCheckingOut ? `Redirecting to ${paymentProvider.name}…` : `Checkout with ${paymentProvider.name}`}
              </button>
              <p class="text-xs text-gray-500 text-center">
                Payments are processed by {paymentProvider.name}.
                {#if paymentProvider.note}{paymentProvider.note}{/if}
              </p>
            </div>
          </form>
        </CartTotals>
      </div>
    {/if}
  </div>
</aside>

<style>
  .cart-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.25s ease;
    z-index: 40;
  }

  .cart-overlay.open {
    opacity: 1;
    pointer-events: auto;
  }

  .cart-drawer {
    position: fixed;
    top: 0;
    right: 0;
    width: min(420px, 100%);
    height: 100%;
    background: #fff;
    box-shadow: -12px 0 24px rgba(0, 0, 0, 0.15);
    transform: translateX(100%);
    transition: transform 0.3s ease;
    display: flex;
    flex-direction: column;
    z-index: 50;
  }

  .cart-drawer.open {
    transform: translateX(0);
  }

  .cart-drawer__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem;
    border-bottom: 1px solid #f2f2f2;
  }

  .cart-drawer__title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--thm-black, #111);
  }

  .cart-drawer__count {
    font-size: 0.9rem;
    color: #6b7280;
  }

  .cart-drawer__close {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 9999px;
    border: 1px solid #e5e7eb;
    background: white;
    font-size: 1.5rem;
    line-height: 1;
  }

  .cart-drawer__body {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .cart-drawer__items {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .cart-drawer__footer {
    padding: 1.5rem;
    border-top: 1px solid #f2f2f2;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .cart-drawer__empty {
    padding: 2rem;
    text-align: center;
  }

  :global(body.cart-drawer-open) {
    overflow: hidden;
  }
</style>
