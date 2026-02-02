<script lang="ts">
  import { cart } from '$lib/stores/cart';
  import { cartDrawer } from '$lib/stores/cartDrawer';
  import { ShoppingBag } from 'lucide-svelte';

  interface Props {
    className?: string;
  }

  let { className = '' }: Props = $props();
  let itemCount = $state(0);
  let prevCount = $state(0);
  let isAnimating = $state(false);

  $effect(() => {
    const unsubscribe = cart.subscribe((value) => {
      const newCount = value?.itemCount ?? 0;
      
      // Trigger animation when count increases
      if (newCount > prevCount && prevCount > 0) {
        isAnimating = true;
        setTimeout(() => {
          isAnimating = false;
        }, 500);
      }
      
      prevCount = itemCount;
      itemCount = newCount;
    });

    return unsubscribe;
  });

  function openDrawer() {
    cartDrawer.open();
  }
</script>

<button
  type="button"
  class="relative inline-flex items-center justify-center p-2 rounded-full 
         transition-all duration-200 ease-smooth
         hover:bg-muted/80 active:scale-95
         {isAnimating ? 'animate-bounce-subtle' : ''}
         {className}"
  aria-label="View cart ({itemCount} items)"
  onclick={openDrawer}
>
  <ShoppingBag 
    size={24} 
    class="text-foreground transition-colors duration-200" 
    strokeWidth={1.5}
  />
  
  {#if itemCount > 0}
    <span
      class="cart-badge"
      aria-live="polite"
    >
      {itemCount > 99 ? '99+' : itemCount}
    </span>
  {/if}
</button>
