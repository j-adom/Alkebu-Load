<script lang="ts">
  import { cart } from '$lib/stores/cart';
  import { cartDrawer } from '$lib/stores/cartDrawer';

  type Customization = Record<string, unknown> | undefined;

  interface Props {
    productId?: string;
    productType?: string;
    quantity?: number;
    customization?: Customization;
    className?: string;
    disabled?: boolean;
    iconOnly?: boolean;
    label?: string;
    loadingLabel?: string;
    successLabel?: string;
    iconClass?: string;
    onsuccess?: (detail: { productId?: string }) => void;
    onerror?: (detail: { message: string }) => void;
  }

  let {
    productId,
    productType = 'books',
    quantity = 1,
    customization,
    className = 'thm-btn',
    disabled = false,
    iconOnly = false,
    label = 'Add to Cart',
    loadingLabel = 'Adding…',
    successLabel = 'Added!',
    iconClass = 'icon-shopping-cart',
    onsuccess,
    onerror,
  }: Props = $props();

  let isAdding = $state(false);
  let showSuccessState = $state(false);
  let errorMessage = $state<string | null>(null);

  async function handleAdd() {
    if (disabled || !productId || isAdding) return;

    isAdding = true;
    errorMessage = null;
    showSuccessState = false;

    const result = await cart.addItem(
      productId,
      productType,
      quantity,
      customization,
    );

    isAdding = false;

    if (!result.success) {
      const message = result.error || 'Unable to add item to cart';
      errorMessage = message;
      onerror?.({ message });
      return;
    }

    showSuccessState = true;
    cartDrawer.open();
    onsuccess?.({ productId });

    setTimeout(() => {
      showSuccessState = false;
    }, 2000);
  }

  const buttonText = $derived.by(() => {
    if (isAdding) return loadingLabel;
    if (showSuccessState) return successLabel;
    return label;
  });

  const computedDisabled = $derived(disabled || !productId || isAdding);
  const accessibleLabel = $derived(iconOnly ? label : undefined);
</script>

<button
  type="button"
  class={className}
  disabled={computedDisabled}
  onclick={handleAdd}
  aria-live="polite"
  aria-label={accessibleLabel}
>
  {#if iconOnly}
    <span class={iconClass} aria-hidden="true"></span>
  {:else}
    {buttonText}
  {/if}
</button>

{#if errorMessage}
  <p class="mt-1 text-sm text-red-600">{errorMessage}</p>
{/if}
