<script lang="ts">
  import { page } from "$app/stores";
  import { cart } from "$lib/stores/cart";
  import { formatCurrency } from "$lib/utils/currency";
  import Meta from "$lib/components/Meta.svelte";
  import { browser } from "$app/environment";

  let cartState = $state({
    items: [] as any[],
    itemCount: 0,
    subtotal: 0,
    tax: 0,
    shipping: 0,
    total: 0,
  });

  let checkoutState = $state<"form" | "processing" | "error">("form");
  let checkoutError = $state<string | null>(null);

  // Form state
  let email = $state("");
  let firstName = $state("");
  let lastName = $state("");
  let street = $state("");
  let city = $state("");
  let state = $state("TN");
  let zip = $state("");
  let country = $state("US");
  let taxExempt = $state(false);

  // Preview state
  let previewLoading = $state(false);
  let previewTax = $state(0);
  let previewShipping = $state(0);
  let previewShippingMethod = $state("");
  let previewShippingDays = $state(0);
  let previewTotal = $state(0);
  let hasPreview = $state(false);
  let previewTimeout: ReturnType<typeof setTimeout> | null = null;

  $effect(() => {
    const unsubscribe = cart.subscribe((value) => {
      cartState = value;
    });
    return unsubscribe;
  });

  // Debounced preview when address fields change
  $effect(() => {
    // Track all address-related fields to trigger reactivity
    const _deps = [city, state, zip, country, taxExempt, cartState.id];

    if (browser && cartState.id && state && zip) {
      if (previewTimeout) clearTimeout(previewTimeout);
      previewTimeout = setTimeout(() => {
        fetchPreview();
      }, 500);
    }
  });

  async function fetchPreview() {
    if (!cartState.id || !state) return;

    previewLoading = true;
    try {
      const response = await fetch("/api/checkout/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartId: cartState.id,
          shippingAddress: { street, city, state, zip, country },
          taxExempt,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        previewTax = data.tax?.amount ?? 0;
        previewShipping = data.shipping?.cost ?? 0;
        previewShippingMethod = data.shipping?.method ?? "standard";
        previewShippingDays = data.shipping?.estimatedDays ?? 0;
        previewTotal = data.total ?? 0;
        hasPreview = true;
      }
    } catch (err) {
      console.error("Failed to fetch checkout preview:", err);
    } finally {
      previewLoading = false;
    }
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();

    // Validation
    if (!email || !firstName || !lastName || !street || !city || !zip) {
      checkoutError = "Please fill in all required fields";
      return;
    }

    if (cartState.itemCount === 0) {
      checkoutError = "Your cart is empty";
      return;
    }

    checkoutState = "processing";
    checkoutError = null;

    try {
      const result = await cart.checkout({
        shippingAddress: { street, city, state, zip, country },
        customerEmail: email,
        taxExempt,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to start checkout");
      }
      // cart.checkout() handles redirect to Stripe
    } catch (error) {
      checkoutState = "error";
      checkoutError =
        error instanceof Error ? error.message : "An error occurred";
    }
  }

  const isFormValid = $derived(
    email &&
      firstName &&
      lastName &&
      street &&
      city &&
      zip &&
      cartState.itemCount > 0,
  );

  // Use preview values if available, otherwise fall back to cart store
  const displayTax = $derived(hasPreview ? previewTax : cartState.tax);
  const displayShipping = $derived(
    hasPreview ? previewShipping : cartState.shipping,
  );
  const displayTotal = $derived(hasPreview ? previewTotal : cartState.total);
</script>

<Meta
  title="Checkout"
  description="Complete your purchase"
  canonicalUrl="{$page.url.origin}/checkout"
/>

<div class="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
  <div class="mx-auto max-w-2xl">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-foreground">Checkout</h1>
      <p class="mt-2 text-muted-foreground">Complete your purchase</p>
    </div>

    {#if cartState.itemCount === 0}
      <!-- Empty Cart -->
      <div class="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
        <p class="text-muted-foreground mb-4">Your cart is empty</p>
        <a href="/shop" class="btn-primary">Continue Shopping</a>
      </div>
    {:else}
      <form on:submit={handleSubmit} class="space-y-8">
        <!-- Contact Information -->
        <section class="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 class="text-lg font-semibold text-foreground mb-4">
            Contact Information
          </h2>
          <div class="space-y-4">
            <div>
              <label
                for="email"
                class="block text-sm font-medium text-muted-foreground mb-1"
              >
                Email *
              </label>
              <input
                type="email"
                id="email"
                bind:value={email}
                required
                class="input-modern"
              />
            </div>
          </div>
        </section>

        <!-- Shipping Address -->
        <section class="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 class="text-lg font-semibold text-foreground mb-4">
            Shipping Address
          </h2>
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label
                  for="firstName"
                  class="block text-sm font-medium text-muted-foreground mb-1"
                >
                  First Name *
                </label>
                <input
                  type="text"
                  id="firstName"
                  bind:value={firstName}
                  required
                  class="input-modern"
                />
              </div>
              <div>
                <label
                  for="lastName"
                  class="block text-sm font-medium text-muted-foreground mb-1"
                >
                  Last Name *
                </label>
                <input
                  type="text"
                  id="lastName"
                  bind:value={lastName}
                  required
                  class="input-modern"
                />
              </div>
            </div>

            <div>
              <label
                for="street"
                class="block text-sm font-medium text-muted-foreground mb-1"
              >
                Street Address *
              </label>
              <input
                type="text"
                id="street"
                bind:value={street}
                required
                class="input-modern"
              />
            </div>

            <div class="grid grid-cols-3 gap-4">
              <div>
                <label
                  for="city"
                  class="block text-sm font-medium text-muted-foreground mb-1"
                >
                  City *
                </label>
                <input
                  type="text"
                  id="city"
                  bind:value={city}
                  required
                  class="input-modern"
                />
              </div>
              <div>
                <label
                  for="state"
                  class="block text-sm font-medium text-muted-foreground mb-1"
                >
                  State *
                </label>
                <input
                  type="text"
                  id="state"
                  bind:value={state}
                  required
                  class="input-modern"
                />
              </div>
              <div>
                <label
                  for="zip"
                  class="block text-sm font-medium text-muted-foreground mb-1"
                >
                  ZIP Code *
                </label>
                <input
                  type="text"
                  id="zip"
                  bind:value={zip}
                  required
                  class="input-modern"
                />
              </div>
            </div>

            <div>
              <label class="flex items-center gap-2">
                <input
                  type="checkbox"
                  bind:checked={taxExempt}
                  class="rounded border-input text-primary focus:ring-primary/50"
                />
                <span class="text-sm text-muted-foreground"
                  >This is a tax-exempt organization</span
                >
              </label>
            </div>
          </div>
        </section>

        <!-- Order Summary -->
        <section class="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 class="text-lg font-semibold text-foreground mb-4">
            Order Summary
          </h2>
          <div class="space-y-3">
            {#each cartState.items as item (item.id)}
              <div class="flex justify-between text-sm">
                <span class="text-muted-foreground">
                  {item.productTitle || item.product?.title || "Product"} x {item.quantity}
                </span>
                <span class="font-medium text-foreground">
                  {formatCurrency(item.totalPrice || 0)}
                </span>
              </div>
            {/each}

            <div class="border-t border-border pt-3 mt-3">
              <div class="flex justify-between mb-2">
                <span class="text-muted-foreground">Subtotal</span>
                <span class="text-foreground"
                  >{formatCurrency(cartState.subtotal)}</span
                >
              </div>

              <div class="flex justify-between mb-2">
                <span class="text-muted-foreground">
                  Shipping
                  {#if previewLoading}
                    <span class="text-xs opacity-60">(calculating…)</span>
                  {:else if hasPreview && previewShippingDays > 0}
                    <span class="text-xs opacity-60"
                      >({previewShippingDays} day{previewShippingDays !== 1
                        ? "s"
                        : ""})</span
                    >
                  {/if}
                </span>
                <span class="text-foreground">
                  {#if previewLoading}
                    <span class="opacity-40">—</span>
                  {:else if displayShipping === 0 && hasPreview}
                    <span class="text-accent font-medium">Free</span>
                  {:else}
                    {formatCurrency(displayShipping)}
                  {/if}
                </span>
              </div>

              <div class="flex justify-between mb-2">
                <span class="text-muted-foreground">
                  Tax
                  {#if previewLoading}
                    <span class="text-xs opacity-60">(calculating…)</span>
                  {/if}
                </span>
                <span class="text-foreground">
                  {#if previewLoading}
                    <span class="opacity-40">—</span>
                  {:else}
                    {formatCurrency(displayTax)}
                  {/if}
                </span>
              </div>

              <div
                class="flex justify-between text-base font-semibold border-t border-border/50 pt-2 mt-2"
              >
                <span class="text-foreground">Total</span>
                <span class="text-primary text-xl">
                  {#if previewLoading}
                    <span class="opacity-40 text-base">Calculating…</span>
                  {:else}
                    {formatCurrency(displayTotal)}
                  {/if}
                </span>
              </div>
            </div>
          </div>
        </section>

        <!-- Error Message -->
        {#if checkoutError}
          <div
            class="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-destructive"
          >
            {checkoutError}
          </div>
        {/if}

        <!-- Submit -->
        <button
          type="submit"
          disabled={!isFormValid || checkoutState === "processing"}
          class="btn-primary w-full text-lg"
        >
          {checkoutState === "processing"
            ? "Redirecting to payment…"
            : "Continue to Payment"}
        </button>

        <p class="text-center text-xs text-muted-foreground">
          You'll be redirected to Stripe to complete your payment securely.
        </p>
      </form>
    {/if}
  </div>
</div>
