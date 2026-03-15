<script lang="ts">
  import { paymentProvider } from "$lib/paymentProvider";
  import { cart } from "$lib/stores/cart";
  import { browser } from "$app/environment";
  import { onMount } from "svelte";

  let { data } = $props();
  const sessionId = $derived(data.sessionId);
  const status = $derived(data.status);

  // Clear cart after successful checkout
  onMount(() => {
    if (browser && sessionId && status?.orderCreated) {
      cart.resetLocal();
    }
  });
</script>

<section class="mx-auto max-w-3xl px-6 py-16 text-center">
  {#if !sessionId}
    <div
      class="rounded-2xl border border-dashed border-border bg-card p-10 shadow-soft"
    >
      <h1 class="text-3xl font-bold text-foreground">Checkout complete</h1>
      <p class="mt-3 text-muted-foreground">
        We couldn't locate your payment session. If you completed a purchase,
        you'll receive an email confirmation shortly.
      </p>
      <p class="mt-2 text-sm text-muted-foreground">
        Payments are processed by {paymentProvider.name}.
        {#if paymentProvider.note}{paymentProvider.note}{/if}
      </p>
      <a
        href="/shop"
        class="btn-primary mt-8"
      >
        Return to shop
      </a>
    </div>
  {:else}
    <div class="rounded-2xl border border-border bg-card p-10 shadow-medium">
      <div
        class="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-8 w-8 text-accent"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      <p class="text-sm uppercase tracking-wide text-primary">Thank you</p>
      <h1 class="mt-2 text-4xl font-bold text-foreground">Order confirmed!</h1>
      {#if status?.orderCreated}
        <p class="mt-3 text-lg text-muted-foreground">
          We received your payment and are preparing your order.
        </p>
        {#if status?.orderNumber}
          <p class="mt-1 text-sm font-semibold text-muted-foreground">
            Order # {status.orderNumber}
          </p>
        {/if}
      {:else}
        <p class="mt-3 text-lg text-muted-foreground">
          Your payment is processing. We'll email you a receipt and tracking
          details soon.
        </p>
      {/if}
      <p class="mt-4 text-sm text-muted-foreground">
        Payments are processed by {paymentProvider.name}.
        {#if paymentProvider.note}{paymentProvider.note}{/if}
      </p>
      <div class="mt-8 space-x-3">
        <a href="/shop" class="btn-primary">
          Continue shopping
        </a>
        <a href="/contact" class="btn-outline">
          Contact support
        </a>
      </div>
    </div>
  {/if}
</section>
