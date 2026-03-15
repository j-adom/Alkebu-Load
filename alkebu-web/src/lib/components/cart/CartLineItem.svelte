<script lang="ts">
  import PayloadImage from '$lib/components/PayloadImage.svelte';
  import { cart } from '$lib/stores/cart';
  import { formatCents } from '$lib/utils/currency';
  import { Minus, Plus, Trash2, Loader2 } from 'lucide-svelte';

  interface Props {
    item: any;
  }

  let { item }: Props = $props();

  const product = $derived(item?.product || null);
  const title = $derived(item?.productTitle || product?.title || 'Product');
  const slug = $derived.by(() => {
    const value = product?.slug;
    if (!value) return null;
    return typeof value === 'string' ? value : value?.slug || value?.current || null;
  });
  const productPath = $derived.by(() => {
    if (!slug) return null;
    switch (item?.productType) {
      case 'apparel':
      case 'fashion-jewelry':
      case 'fashionJewelry':
        return `/shop/apparel/${slug}`;
      case 'wellness':
      case 'wellnessLifestyle':
        return `/shop/health-and-beauty/${slug}`;
      default:
        return `/shop/books/${slug}`;
    }
  });

  const image = $derived(
    item?.image ||
      product?.images?.[0] ||
      product?.featuredImage ||
      product?.coverImage ||
      null,
  );

  const unitPrice = $derived(item?.unitPrice || product?.pricing?.retailPrice || 0);
  const quantity = $derived(item?.quantity || 0);
  const lineTotal = $derived(item?.totalPrice || unitPrice * quantity);

  let isUpdating = $state(false);
  let errorMessage = $state<string | null>(null);

  async function updateQuantity(nextQuantity: number) {
    if (nextQuantity < 1 || isUpdating) return;
    isUpdating = true;
    errorMessage = null;

    const result = await cart.updateQuantity(item.id, nextQuantity);
    isUpdating = false;

    if (!result.success) {
      errorMessage = result.error || 'Unable to update quantity';
    }
  }

  async function removeItem() {
    if (isUpdating) return;
    isUpdating = true;
    errorMessage = null;

    const result = await cart.removeItem(item.id);
    isUpdating = false;

    if (!result.success) {
      errorMessage = result.error || 'Unable to remove item';
    }
  }

  const customizationEntries = $derived.by(() => {
    if (!item?.customization || typeof item.customization !== 'object') return [];
    return Object.entries(item.customization).filter(
      ([, value]) => value !== null && value !== undefined && value !== '',
    );
  });
</script>

<article class="card-modern p-4 {isUpdating ? 'opacity-70' : ''}">
  <div class="flex flex-col gap-4 sm:flex-row">
    <!-- Product Image -->
    <div class="w-full sm:w-28 shrink-0">
      <div class="aspect-square rounded-xl bg-muted overflow-hidden">
        {#if image?.url}
          <PayloadImage image={image} alt={title} maxWidth={320} class="w-full h-full object-cover" />
        {:else}
          <div class="flex h-full items-center justify-center text-sm text-muted-foreground">
            No image
          </div>
        {/if}
      </div>
    </div>

    <!-- Product Details -->
    <div class="flex-1 flex flex-col gap-3">
      <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div class="flex-1">
          {#if productPath}
            <a href={productPath} class="font-semibold text-foreground hover:text-primary transition-colors line-clamp-2">
              {title}
            </a>
          {:else}
            <p class="font-semibold text-foreground line-clamp-2">{title}</p>
          {/if}
          <p class="text-sm text-muted-foreground capitalize mt-0.5">
            {item?.productType?.replace(/-/g, ' ') || 'Product'}
          </p>

          {#if customizationEntries.length}
            <ul class="mt-2 text-sm text-muted-foreground space-y-0.5">
              {#each customizationEntries as [key, value]}
                <li><span class="font-medium capitalize">{key}:</span> {value as string}</li>
              {/each}
            </ul>
          {/if}
        </div>

        <div class="text-sm sm:text-right">
          <span class="text-muted-foreground">@ </span>
          <span class="font-medium">{formatCents(unitPrice)}</span>
        </div>
      </div>

      <!-- Quantity Controls & Subtotal -->
      <div class="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-border">
        <!-- Quantity Selector -->
        <div class="inline-flex items-center rounded-xl bg-muted/50">
          <button
            type="button"
            class="p-2 text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
            onclick={() => updateQuantity(quantity - 1)}
            disabled={isUpdating || quantity <= 1}
            aria-label="Decrease quantity"
          >
            <Minus size={16} />
          </button>
          <span class="min-w-[2.5rem] text-center font-semibold">
            {#if isUpdating}
              <Loader2 size={16} class="animate-spin mx-auto" />
            {:else}
              {quantity}
            {/if}
          </span>
          <button
            type="button"
            class="p-2 text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
            onclick={() => updateQuantity(quantity + 1)}
            disabled={isUpdating}
            aria-label="Increase quantity"
          >
            <Plus size={16} />
          </button>
        </div>

        <!-- Subtotal & Remove -->
        <div class="flex items-center gap-4">
          <div class="text-right">
            <p class="text-xs text-muted-foreground">Subtotal</p>
            <p class="text-lg font-bold text-primary">{formatCents(lineTotal)}</p>
          </div>
          <button
            type="button"
            class="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10"
            onclick={removeItem}
            disabled={isUpdating}
            aria-label="Remove item"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  </div>

  {#if errorMessage}
    <p class="mt-3 text-sm text-destructive animate-fade-in">{errorMessage}</p>
  {/if}
</article>
