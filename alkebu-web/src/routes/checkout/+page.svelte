<script lang="ts">
  import { page } from '$app/stores';
  import { cart } from '$lib/stores/cart';
  import { formatCurrency } from '$lib/utils/currency';
  import { Button } from '$lib/components/ui/button';
  import Meta from '$lib/components/Meta.svelte';
  import { onMount } from 'svelte';

  let cartState = $state({
    items: [],
    itemCount: 0,
    subtotal: 0,
    tax: 0,
    total: 0,
  });

  let checkoutState = $state<'loading' | 'form' | 'processing' | 'error' | 'success'>('form');
  let checkoutError = $state<string | null>(null);

  // Form state
  let email = $state('');
  let firstName = $state('');
  let lastName = $state('');
  let street = $state('');
  let city = $state('');
  let state = $state('TN');
  let zip = $state('');
  let country = $state('US');
  let taxExempt = $state(false);

  // Stripe Elements (loaded dynamically)
  let stripeLoaded = $state(false);
  let stripeElements: any = null;
  let stripePaymentElement: any = null;

  $effect(() => {
    const unsubscribe = cart.subscribe((value) => {
      cartState = value;
    });
    return unsubscribe;
  });

  onMount(async () => {
    // Load Stripe.js
    if (!window.Stripe) {
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.async = true;
      script.onload = initializeStripe;
      document.head.appendChild(script);
    } else {
      initializeStripe();
    }
  });

  function initializeStripe() {
    // This would be called after Stripe loads
    // You'll need to get the payment intent client secret from the server
    stripeLoaded = true;
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();

    // Validation
    if (!email || !firstName || !lastName || !street || !city || !zip) {
      checkoutError = 'Please fill in all required fields';
      return;
    }

    if (cartState.itemCount === 0) {
      checkoutError = 'Your cart is empty';
      return;
    }

    checkoutState = 'processing';
    checkoutError = null;

    try {
      // Step 1: Create checkout session on server
      const checkoutResponse = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          firstName,
          lastName,
          shippingAddress: {
            street,
            city,
            state,
            zip,
            country,
          },
          taxExempt,
          items: cartState.items,
          subtotal: cartState.subtotal,
          tax: cartState.tax,
          total: cartState.total,
        }),
      });

      if (!checkoutResponse.ok) {
        const error = await checkoutResponse.json();
        throw new Error(error.message || 'Failed to create checkout session');
      }

      const { sessionUrl } = await checkoutResponse.json();

      // Step 2: Redirect to Stripe Checkout
      if (sessionUrl) {
        window.location.href = sessionUrl;
      }
    } catch (error) {
      checkoutState = 'error';
      checkoutError = error instanceof Error ? error.message : 'An error occurred';
    }
  }

  const isFormValid = $derived(
    email && firstName && lastName && street && city && zip && cartState.itemCount > 0,
  );
</script>

<Meta
  title="Checkout"
  description="Complete your purchase"
  canonicalUrl="{$page.url.origin}/checkout"
/>

<div class="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
  <div class="mx-auto max-w-2xl">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Checkout</h1>
      <p class="mt-2 text-gray-600">Complete your purchase</p>
    </div>

    {#if cartState.itemCount === 0}
      <!-- Empty Cart -->
      <div class="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <p class="text-gray-600 mb-4">Your cart is empty</p>
        <Button href="/shop" variant="default">
          Continue Shopping
        </Button>
      </div>
    {:else}
      <form on:submit={handleSubmit} class="space-y-8">
        <!-- Contact Information -->
        <section class="rounded-lg border border-gray-200 bg-white p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
          <div class="space-y-4">
            <div>
              <label for="email" class="block text-sm font-medium text-gray-700">
                Email *
              </label>
              <input
                type="email"
                id="email"
                bind:value={email}
                required
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
          </div>
        </section>

        <!-- Shipping Address -->
        <section class="rounded-lg border border-gray-200 bg-white p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Shipping Address</h2>
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="firstName" class="block text-sm font-medium text-gray-700">
                  First Name *
                </label>
                <input
                  type="text"
                  id="firstName"
                  bind:value={firstName}
                  required
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label for="lastName" class="block text-sm font-medium text-gray-700">
                  Last Name *
                </label>
                <input
                  type="text"
                  id="lastName"
                  bind:value={lastName}
                  required
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
            </div>

            <div>
              <label for="street" class="block text-sm font-medium text-gray-700">
                Street Address *
              </label>
              <input
                type="text"
                id="street"
                bind:value={street}
                required
                class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>

            <div class="grid grid-cols-3 gap-4">
              <div>
                <label for="city" class="block text-sm font-medium text-gray-700">
                  City *
                </label>
                <input
                  type="text"
                  id="city"
                  bind:value={city}
                  required
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label for="state" class="block text-sm font-medium text-gray-700">
                  State *
                </label>
                <input
                  type="text"
                  id="state"
                  bind:value={state}
                  required
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label for="zip" class="block text-sm font-medium text-gray-700">
                  ZIP Code *
                </label>
                <input
                  type="text"
                  id="zip"
                  bind:value={zip}
                  required
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
            </div>

            <div>
              <label class="flex items-center gap-2">
                <input
                  type="checkbox"
                  bind:checked={taxExempt}
                  class="rounded border-gray-300"
                />
                <span class="text-sm text-gray-600">This is a tax-exempt organization</span>
              </label>
            </div>
          </div>
        </section>

        <!-- Order Summary -->
        <section class="rounded-lg border border-gray-200 bg-white p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
          <div class="space-y-3">
            {#each cartState.items as item (item.id)}
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">
                  {item.productTitle || item.product?.title || 'Product'} x {item.quantity}
                </span>
                <span class="font-medium text-gray-900">
                  {formatCurrency(item.totalPrice || 0)}
                </span>
              </div>
            {/each}

            <div class="border-t border-gray-200 pt-3 mt-3">
              <div class="flex justify-between mb-2">
                <span class="text-gray-600">Subtotal</span>
                <span class="text-gray-900">{formatCurrency(cartState.subtotal)}</span>
              </div>
              <div class="flex justify-between mb-2">
                <span class="text-gray-600">Tax</span>
                <span class="text-gray-900">{formatCurrency(cartState.tax)}</span>
              </div>
              <div class="flex justify-between text-base font-semibold">
                <span class="text-gray-900">Total</span>
                <span class="text-gray-900">{formatCurrency(cartState.total)}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Error Message -->
        {#if checkoutError}
          <div class="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {checkoutError}
          </div>
        {/if}

        <!-- Submit -->
        <Button
          type="submit"
          disabled={!isFormValid || checkoutState === 'processing'}
          class="w-full"
        >
          {checkoutState === 'processing' ? 'Processing...' : 'Continue to Payment'}
        </Button>
      </form>
    {/if}
  </div>
</div>
