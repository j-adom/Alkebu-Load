<script lang="ts">
    import { page } from "$app/stores";
    import Meta from "$lib/components/Meta.svelte";
</script>

<Meta
    title="Payment Cancelled"
    description="Your payment was cancelled"
    canonicalUrl="{$page.url.origin}/checkout/cancel"
/>

<section class="mx-auto max-w-3xl px-6 py-16 text-center">
    <div class="rounded-2xl border border-border bg-card p-10 shadow-medium">
        <div
            class="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-8 w-8 text-secondary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                />
            </svg>
        </div>

        <p class="text-sm uppercase tracking-wide text-secondary">
            Payment Cancelled
        </p>
        <h1 class="mt-2 text-3xl font-bold text-foreground">
            Your order was not placed
        </h1>
        <p class="mt-4 text-lg text-muted-foreground">
            No charges have been made. Your cart items are still saved.
        </p>

        <div
            class="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
        >
            <a href="/checkout" class="btn-primary">
                Return to Checkout
            </a>
            <a href="/shop" class="btn-outline">
                Continue Shopping
            </a>
        </div>
    </div>
</section>
