<script lang="ts">
  import { page } from "$app/stores";
  import { cart } from "$lib/stores/cart";
  import { formatCents } from "$lib/utils/currency";
  import Meta from "$lib/components/Meta.svelte";
  import { browser } from "$app/environment";

  type ShippingOption = {
    id: string;
    carrier: string;
    service: string;
    amount: number;
    estimatedDays: number;
    isDefault: boolean;
    isMediaMail: boolean;
    method: string;
  };

  let cartState = $state({
    id: "",
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
  let taxExemptNotice = $state<string | null>(null);
  let previewError = $state<string | null>(null);

  function buildShippingAddress() {
    return {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      street: street.trim(),
      city: city.trim(),
      state: state.trim().toUpperCase(),
      zip: zip.trim(),
      country: country.trim().toUpperCase() || "US",
    };
  }

  // Preview state
  let previewLoading = $state(false);
  let previewTax = $state(0);
  let previewShipping = $state(0);
  let previewShippingMethod = $state("");
  let previewShippingLabel = $state("");
  let previewShippingDays = $state(0);
  let previewTotal = $state(0);
  let hasPreview = $state(false);
  let shippingOptions = $state<ShippingOption[]>([]);
  let selectedShippingRateId = $state("");
  let quoteExpiresAt = $state<string | null>(null);
  let previewTimeout: ReturnType<typeof setTimeout> | null = null;

  function isQuoteExpired(expiresAt: string | null) {
    if (!expiresAt) return true;
    const parsed = Date.parse(expiresAt);
    return Number.isNaN(parsed) || parsed <= Date.now();
  }

  function formatShippingMethod(method: string) {
    if (method === "media-mail") return "USPS Media Mail";
    if (method === "expedited") return "Expedited";
    if (method === "pickup") return "Store Pickup";
    return "Standard";
  }
  $effect(() => {
    const unsubscribe = cart.subscribe((value) => {
      cartState = value;
    });
    return unsubscribe;
  });

  const isAddressReady = $derived(
    firstName.trim() &&
      lastName.trim() &&
      street.trim() &&
      city.trim() &&
      state.trim() &&
      zip.trim(),
  );

  // Debounced preview when address fields change
  $effect(() => {
    const _deps = [
      firstName,
      lastName,
      street,
      city,
      state,
      zip,
      country,
      taxExempt,
      cartState.id,
    ];

    if (!browser) return;

    if (!cartState.id || !isAddressReady) {
      if (previewTimeout) clearTimeout(previewTimeout);
      hasPreview = false;
      previewError = null;
      shippingOptions = [];
      selectedShippingRateId = "";
      quoteExpiresAt = null;
      previewTax = 0;
      previewShipping = 0;
      previewShippingMethod = "";
      previewShippingLabel = "";
      previewShippingDays = 0;
      previewTotal = cartState.subtotal || 0;
      return;
    }

    if (previewTimeout) clearTimeout(previewTimeout);
    previewTimeout = setTimeout(() => {
      fetchPreview(selectedShippingRateId || undefined);
    }, 500);
  });

  async function fetchPreview(rateId?: string) {
    if (!cartState.id || !isAddressReady) return false;

    previewLoading = true;
    previewError = null;
    try {
      const response = await fetch("/api/checkout/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartId: cartState.id,
          shippingAddress: buildShippingAddress(),
          taxExempt,
          selectedShippingRateId: rateId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        previewTax = data.tax?.amount ?? 0;
        previewShipping = data.shipping?.cost ?? 0;
        previewShippingMethod = data.shipping?.method ?? "standard";
        previewShippingLabel = data.shipping?.label ?? formatShippingMethod(data.shipping?.method ?? "standard");
        previewShippingDays = data.shipping?.estimatedDays ?? 0;
        previewTotal = data.total ?? cartState.subtotal;
        shippingOptions = data.shippingOptions ?? [];
        selectedShippingRateId = data.selectedShippingRateId ?? "";
        quoteExpiresAt = data.quoteExpiresAt ?? null;
        taxExemptNotice = data.taxExemptDenied ?? null;
        hasPreview = true;
        return true;
      } else {
        const data = await response.json().catch(() => ({}));
        previewError = data?.error || "Failed to refresh shipping and tax.";
        hasPreview = false;
        shippingOptions = [];
        selectedShippingRateId = "";
        taxExemptNotice = null;
        quoteExpiresAt = null;
        return false;
      }
    } catch (err) {
      console.error("Failed to fetch checkout preview:", err);
      previewError = "Failed to refresh shipping and tax.";
      hasPreview = false;
      shippingOptions = [];
      selectedShippingRateId = "";
      taxExemptNotice = null;
      quoteExpiresAt = null;
      return false;
    } finally {
      previewLoading = false;
    }
  }

  async function handleShippingSelection(rateId: string) {
    selectedShippingRateId = rateId;
    await fetchPreview(rateId);
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

    if (!selectedShippingRateId) {
      checkoutError = "Select a shipping method to continue.";
      return;
    }

    checkoutError = null;

    if (!hasPreview || isQuoteExpired(quoteExpiresAt)) {
      const refreshed = await fetchPreview(selectedShippingRateId || undefined);
      if (!refreshed || !selectedShippingRateId) {
        checkoutState = "error";
        checkoutError = previewError || "Refresh shipping and tax before continuing.";
        return;
      }
    }

    checkoutState = "processing";

    try {
      const result = await cart.checkout({
        shippingAddress: buildShippingAddress(),
        customerEmail: email,
        taxExempt,
        selectedShippingRateId,
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

  const hasValidShippingQuote = $derived(
    cartState.itemCount === 0 || (hasPreview && !!selectedShippingRateId),
  );

  // Use preview values if available, otherwise fall back to cart store
  const displayTax = $derived(hasPreview ? previewTax : cartState.tax);
  const displayShipping = $derived(
    hasPreview ? previewShipping : cartState.shipping,
  );
  const displayTotal = $derived(
    hasPreview ? previewTotal : cartState.total || cartState.subtotal,
  );
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
      <form onsubmit={handleSubmit} class="space-y-8">
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
              {#if taxExemptNotice}
                <p class="mt-2 text-sm text-destructive">{taxExemptNotice}</p>
              {/if}
            </div>
          </div>
        </section>

        <!-- Shipping Method -->
        <section class="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 class="text-lg font-semibold text-foreground mb-4">
            Shipping Method
          </h2>

          {#if !isAddressReady}
            <p class="text-sm text-muted-foreground">
              Enter your full shipping address to load live shipping options.
            </p>
          {:else if previewLoading && !hasPreview}
            <p class="text-sm text-muted-foreground">Loading shipping options…</p>
          {:else if shippingOptions.length > 0}
            <div class="space-y-3">
              {#each shippingOptions as option (option.id)}
                <label class="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 transition hover:border-primary/40">
                  <input
                    type="radio"
                    name="shipping-rate"
                    value={option.id}
                    checked={selectedShippingRateId === option.id}
                    disabled={previewLoading}
                    onchange={() => handleShippingSelection(option.id)}
                    class="mt-1 h-4 w-4 border-input text-primary focus:ring-primary/50"
                  />
                  <span class="flex-1">
                    <span class="flex items-center justify-between gap-4">
                      <span class="font-medium text-foreground">
                        {option.carrier} {option.service}
                        {#if option.isMediaMail}
                          <span class="ml-2 text-xs uppercase tracking-wide text-accent">Default for books</span>
                        {/if}
                      </span>
                      <span class="font-semibold text-foreground">
                        {option.amount === 0 ? "Free" : formatCents(option.amount)}
                      </span>
                    </span>
                    <span class="mt-1 block text-sm text-muted-foreground">
                      {option.estimatedDays > 0
                        ? `${option.estimatedDays} business day${option.estimatedDays !== 1 ? "s" : ""}`
                        : "Delivery estimate unavailable"}
                    </span>
                  </span>
                </label>
              {/each}
            </div>
          {:else if previewError}
            <p class="text-sm text-destructive">{previewError}</p>
          {:else}
            <p class="text-sm text-muted-foreground">
              No shipping options are currently available for this address.
            </p>
          {/if}

          {#if hasPreview && quoteExpiresAt}
            <p class="mt-3 text-xs text-muted-foreground">
              Rates are locked for about 30 minutes and will be refreshed if they expire before payment.
            </p>
          {/if}
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
                  {formatCents(item.totalPrice || 0)}
                </span>
              </div>
            {/each}

            <div class="border-t border-border pt-3 mt-3">
              <div class="flex justify-between mb-2">
                <span class="text-muted-foreground">Subtotal</span>
                <span class="text-foreground"
                  >{formatCents(cartState.subtotal)}</span
                >
              </div>

              <div class="flex justify-between mb-2">
                <span class="text-muted-foreground">
                  Shipping
                  {#if previewLoading}
                    <span class="text-xs opacity-60">(calculating…)</span>
                  {:else if hasPreview}
                    <span class="text-xs opacity-60">
                      ({previewShippingLabel || formatShippingMethod(previewShippingMethod)}{previewShippingDays > 0
                        ? `, ${previewShippingDays} day${previewShippingDays !== 1 ? "s" : ""}`
                        : ""})
                    </span>
                  {:else if !isAddressReady}
                    <span class="text-xs opacity-60">(enter address)</span>
                  {/if}
                </span>
                <span class="text-foreground">
                  {#if previewLoading}
                    <span class="opacity-40">—</span>
                  {:else if displayShipping === 0 && hasPreview}
                    <span class="text-accent font-medium">Free</span>
                  {:else}
                    {formatCents(displayShipping)}
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
                    {formatCents(displayTax)}
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
                    {formatCents(displayTotal)}
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
          disabled={!isFormValid || !hasValidShippingQuote || checkoutState === "processing"}
          class="btn-primary w-full text-lg"
        >
          {checkoutState === "processing"
            ? "Redirecting to payment…"
            : "Continue to Payment"}
        </button>

        <p class="text-center text-xs text-muted-foreground">
          {#if !hasValidShippingQuote}
            Select a shipping method to continue to payment.
          {:else}
            You'll be redirected to Stripe to complete your payment securely.
          {/if}
        </p>
      </form>
    {/if}
  </div>
</div>
