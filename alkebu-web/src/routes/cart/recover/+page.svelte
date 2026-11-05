<script lang="ts">
  import Meta from '$lib/components/Meta.svelte';

  let { data } = $props();
</script>

<Meta title="Restore Your Cart" description="Return to your saved cart" noIndex />

<div class="min-h-[60vh] bg-background">
  <div class="container mx-auto max-w-xl px-4 py-16 text-center">
    <h1 class="text-3xl font-bold text-foreground font-display">We couldn't restore that cart</h1>
    <p class="mt-4 text-muted-foreground">{data.error}</p>
    <p class="mt-2 text-muted-foreground">
      Your books may still be available. Browse the shop or give us a call at (615) 321-4111 and we'll help.
    </p>
    <div class="mt-8 flex flex-wrap justify-center gap-3">
      <a href="/shop" class="btn-primary">Browse the shop</a>
      <a href="/contact" class="btn-secondary">Contact us</a>
    </div>
  </div>
</div>
