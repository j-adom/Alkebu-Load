<script lang="ts">
  import { cart } from '$lib/stores/cart';
  import { cartDrawer } from '$lib/stores/cartDrawer';

  interface Props {
    className?: string;
  }

  let { className = '' }: Props = $props();
  let itemCount = $state(0);

  $effect(() => {
    const unsubscribe = cart.subscribe((value) => {
      itemCount = value?.itemCount ?? 0;
    });

    return unsubscribe;
  });

  function openDrawer() {
    cartDrawer.open();
  }
</script>

<button
  type="button"
  class={`relative inline-flex items-center justify-center ${className}`.trim()}
  aria-label="View cart"
  onclick={openDrawer}
>
  <i class="icon-shopping-cart" style="font-size: 1.5rem" aria-hidden="true"></i>
  {#if itemCount > 0}
    <span
      class="absolute -top-1 -right-1 inline-flex min-w-5 items-center justify-center rounded-full bg-thm-primary px-1 text-xs font-semibold text-white"
      aria-live="polite"
    >
      {itemCount}
    </span>
  {/if}
</button>
