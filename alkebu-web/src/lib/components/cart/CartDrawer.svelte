<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowRight, ShieldCheck, ShoppingBag } from 'lucide-svelte';

  import CartLineItem from '$lib/components/cart/CartLineItem.svelte';
  import { cart, createEmptyCart } from '$lib/stores/cart';
  import { cartDrawer } from '$lib/stores/cartDrawer';
  import { formatCents } from '$lib/utils/currency';

  let cartState = $state(createEmptyCart());
  let actionError = $state<string | null>(null);
  let isClearing = $state(false);
  let isOpen = $state(false);

  const isCartEmpty = $derived(cartState.itemCount === 0);
  const hasEstimatedTotals = $derived(Boolean(cartState.hasEstimatedTotals));

  $effect(() => {
    const unsubscribe = cart.subscribe((value) => {
      cartState = value;
    });
    return unsubscribe;
  });

  $effect(() => {
    const unsubscribe = cartDrawer.subscribe((value) => {
      isOpen = value;
      if (value) {
        actionError = null;
      }
    });
    return unsubscribe;
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

  function navigateTo(path: string) {
    closeDrawer();
    window.location.href = path;
  }

  async function handleClearCart() {
    if (isCartEmpty || isClearing) return;

    isClearing = true;
    actionError = null;

    const result = await cart.clear();

    isClearing = false;

    if (!result.success) {
      actionError = result.error || 'Failed to clear cart';
    }
  }
</script>

<div
  class={`cart-overlay ${isOpen ? 'open' : ''}`}
  aria-hidden={!isOpen}
  onclick={closeDrawer}
></div>

<div
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
        <p class="text-lg font-semibold text-foreground">Your cart is empty</p>
        <p class="mt-2 text-muted-foreground">Add a few books or gifts, then come back here to review them.</p>
        <button type="button" class="btn-primary mt-6" onclick={closeDrawer}>
          Continue browsing
        </button>
      </div>
    {:else}
      <div class="cart-drawer__intro">
        <div>
          <p class="cart-drawer__eyebrow">Review order</p>
          <p class="cart-drawer__intro-text">
            Keep shopping, open the full cart, or continue to checkout when you’re ready.
          </p>
        </div>

        <button
          type="button"
          class="font-semibold text-destructive hover:text-destructive/80"
          onclick={handleClearCart}
          disabled={isClearing}
        >
          {isClearing ? 'Clearing…' : 'Clear cart'}
        </button>
      </div>

      <div class="cart-drawer__items">
        {#each cartState.items as item (item.id)}
          <CartLineItem {item} />
        {/each}
      </div>

      <div class="cart-drawer__footer">
        <section class="cart-drawer__summary">
          <div class="flex items-center justify-between text-sm">
            <span class="text-muted-foreground">Subtotal</span>
            <span class="font-semibold text-foreground">{formatCents(cartState.subtotal)}</span>
          </div>

          {#if hasEstimatedTotals}
            <div class="mt-3 space-y-2 text-sm">
              <div class="flex items-center justify-between">
                <span class="text-muted-foreground">Estimated tax</span>
                <span class="font-medium text-foreground">{formatCents(cartState.tax)}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-muted-foreground">Estimated shipping</span>
                <span class="font-medium text-foreground">{formatCents(cartState.shipping)}</span>
              </div>
            </div>
          {:else}
            <p class="mt-3 text-sm text-muted-foreground">
              Shipping and sales tax are calculated at checkout after you enter your address.
            </p>
          {/if}

          <div class="mt-4 flex items-center justify-between border-t border-border pt-4">
            <span class="text-base font-semibold text-foreground">
              {hasEstimatedTotals ? 'Estimated total' : 'Current subtotal'}
            </span>
            <span class="text-2xl font-bold text-primary">{formatCents(cartState.total)}</span>
          </div>
        </section>

        <div class="cart-drawer__benefits">
          <div class="cart-drawer__benefit">
            <ShieldCheck size={16} />
            <span>Secure Stripe checkout on the next step</span>
          </div>
          <div class="cart-drawer__benefit">
            <ShoppingBag size={16} />
            <span>You can still adjust quantities before you pay</span>
          </div>
        </div>

        {#if actionError}
          <p class="text-sm text-destructive">{actionError}</p>
        {/if}

        <div class="flex flex-col gap-3">
          <button type="button" class="btn-primary w-full" onclick={() => navigateTo('/checkout')}>
            Continue to checkout
            <ArrowRight size={18} />
          </button>

          <div class="grid grid-cols-2 gap-3">
            <button type="button" class="btn-outline w-full" onclick={() => navigateTo('/cart')}>
              View cart
            </button>
            <button type="button" class="btn-ghost w-full" onclick={closeDrawer}>
              Keep shopping
            </button>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .cart-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
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
    width: min(32rem, 100%);
    height: 100%;
    background: hsl(var(--background));
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
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid hsl(var(--border));
    background:
      linear-gradient(180deg, hsl(var(--card)) 0%, color-mix(in srgb, hsl(var(--card)) 75%, hsl(var(--muted))) 100%);
  }

  .cart-drawer__title {
    font-size: 1.5rem;
    font-weight: 700;
    color: hsl(var(--foreground));
  }

  .cart-drawer__count {
    font-size: 0.9rem;
    color: hsl(var(--muted-foreground));
  }

  .cart-drawer__close {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 9999px;
    border: 1px solid hsl(var(--border));
    background: hsl(var(--card));
    font-size: 1.5rem;
    line-height: 1;
    color: hsl(var(--foreground));
    transition: background 0.2s ease;
  }

  .cart-drawer__close:hover {
    background: hsl(var(--muted));
  }

  .cart-drawer__body {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .cart-drawer__intro {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 1.5rem 0;
  }

  .cart-drawer__eyebrow {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: hsl(var(--primary));
  }

  .cart-drawer__intro-text {
    margin-top: 0.35rem;
    font-size: 0.95rem;
    color: hsl(var(--muted-foreground));
    max-width: 24rem;
  }

  .cart-drawer__items {
    flex: 1;
    overflow-y: auto;
    padding: 1rem 1.5rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .cart-drawer__footer {
    padding: 1.25rem 1.5rem 1.5rem;
    border-top: 1px solid hsl(var(--border));
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
    background: color-mix(in srgb, hsl(var(--card)) 88%, hsl(var(--muted)));
  }

  .cart-drawer__summary {
    border: 1px solid hsl(var(--border));
    border-radius: 1.25rem;
    background: hsl(var(--card));
    padding: 1rem;
  }

  .cart-drawer__benefits {
    display: grid;
    gap: 0.5rem;
  }

  .cart-drawer__benefit {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: hsl(var(--muted-foreground));
  }

  .cart-drawer__empty {
    padding: 2rem;
    text-align: center;
  }

  @media (max-width: 640px) {
    .cart-drawer__intro {
      flex-direction: column;
    }
  }

  :global(body.cart-drawer-open) {
    overflow: hidden;
  }
</style>
