<script lang="ts">
  import { paymentProvider } from '$lib/paymentProvider';

  let { data } = $props();
  const sessionId = $derived(data.sessionId);
  const status = $derived(data.status);
</script>

<section class="mx-auto max-w-3xl px-6 py-16 text-center">
  {#if !sessionId}
    <div class="rounded-2xl border border-dashed border-gray-300 bg-white p-10 shadow-sm">
      <h1 class="text-3xl font-bold text-thm-black">Checkout complete</h1>
      <p class="mt-3 text-gray-600">
        We couldn’t locate your payment session. If you completed a purchase, you’ll receive an email confirmation shortly.
      </p>
      <p class="mt-2 text-sm text-gray-500">
        Payments are processed by {paymentProvider.name}.
        {#if paymentProvider.note}{paymentProvider.note}{/if}
      </p>
      <a href="/shop" class="mt-8 inline-flex items-center justify-center rounded-full bg-thm-primary px-6 py-3 font-semibold text-white hover:bg-thm-black">
        Return to shop
      </a>
    </div>
  {:else}
    <div class="rounded-2xl border border-gray-200 bg-white p-10 shadow-lg">
      <p class="text-sm uppercase tracking-wide text-thm-primary">Thank you</p>
      <h1 class="mt-2 text-4xl font-bold text-thm-black">Order processing</h1>
      {#if status?.orderCreated}
        <p class="mt-3 text-lg text-gray-700">
          We received your payment and are preparing your order.
        </p>
        {#if status?.orderNumber}
          <p class="mt-1 text-sm font-semibold text-gray-600">Order # {status.orderNumber}</p>
        {/if}
      {:else}
        <p class="mt-3 text-lg text-gray-700">
          Your payment is processing. We’ll email you a receipt and tracking details soon.
        </p>
      {/if}
      <p class="mt-4 text-sm text-gray-500">
        Payments are processed by {paymentProvider.name}.
        {#if paymentProvider.note}{paymentProvider.note}{/if}
      </p>
      <div class="mt-8 space-x-3">
        <a href="/shop" class="inline-flex items-center justify-center rounded-full bg-thm-primary px-6 py-3 font-semibold text-white hover:bg-thm-black">
          Continue shopping
        </a>
        <a href="/contact" class="inline-flex items-center justify-center rounded-full border border-thm-primary px-6 py-3 font-semibold text-thm-primary hover:bg-thm-primary/10">
          Contact support
        </a>
      </div>
    </div>
  {/if}
</section>
