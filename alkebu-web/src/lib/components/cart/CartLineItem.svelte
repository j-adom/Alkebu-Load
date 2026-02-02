<script lang="ts">
  import PayloadImage from '$lib/components/PayloadImage.svelte';
  import { cart } from '$lib/stores/cart';
  import { formatCurrency } from '$lib/utils/currency';

  interface Props {
    item: any;
  }

  let { item }: Props = $props();

  const product = $derived(item?.product || null);
  const title = $derived(item?.productTitle || product?.title || 'Product');
  const slug = $derived(() => {
    const value = product?.slug;
    if (!value) return null;
    return typeof value === 'string' ? value : value?.slug || value?.current || null;
  });
  const productPath = $derived(() => {
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

  const customizationEntries = $derived(() => {
    if (!item?.customization || typeof item.customization !== 'object') return [];
    return Object.entries(item.customization).filter(
      ([, value]) => value !== null && value !== undefined && value !== '',
    );
  });
</script>

<article class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
  <div class="flex flex-col gap-4 md:flex-row">
    <div class="w-full rounded-lg bg-gray-50 p-3 md:w-32">
      {#if image?.url}
        <PayloadImage image={image} alt={title} maxWidth={320} class="rounded-md" />
      {:else}
        <div class="flex h-28 items-center justify-center rounded-md bg-gray-100 text-sm text-gray-500">
          No image
        </div>
      {/if}
    </div>

    <div class="flex flex-1 flex-col gap-3">
      <div class="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
        <div>
          {#if productPath}
            <a href={productPath} class="text-lg font-semibold leading-tight text-thm-black hover:text-thm-primary">
              {title}
            </a>
          {:else}
            <p class="text-lg font-semibold leading-tight text-thm-black">{title}</p>
          {/if}
          <p class="text-sm text-gray-500 capitalize">
            {item?.productType?.replace(/-/g, ' ') || 'Product'}
          </p>

          {#if customizationEntries.length}
            <ul class="mt-2 text-sm text-gray-600">
              {#each customizationEntries as [key, value]}
                <li><span class="font-medium capitalize">{key}:</span> {value as string}</li>
              {/each}
            </ul>
          {/if}
        </div>

        <div class="text-right">
          <p class="text-sm text-gray-500">Unit price</p>
          <p class="text-lg font-semibold">{formatCurrency(unitPrice)}</p>
        </div>
      </div>

      <div class="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="rounded-full border border-gray-300 px-3 py-1 text-lg leading-none text-gray-700 disabled:opacity-50"
            onclick={() => updateQuantity(quantity - 1)}
            disabled={isUpdating || quantity <= 1}
            aria-label="Decrease quantity"
          >
            -
          </button>
          <div class="min-w-[3rem] text-center text-lg font-semibold">{quantity}</div>
          <button
            type="button"
            class="rounded-full border border-gray-300 px-3 py-1 text-lg leading-none text-gray-700 disabled:opacity-50"
            onclick={() => updateQuantity(quantity + 1)}
            disabled={isUpdating}
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>

        <div class="text-right">
          <p class="text-sm text-gray-500">Subtotal</p>
          <p class="text-xl font-semibold">{formatCurrency(lineTotal)}</p>
          <button
            type="button"
            class="mt-1 text-sm text-red-600 hover:text-red-500"
            onclick={removeItem}
            disabled={isUpdating}
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  </div>

  {#if errorMessage}
    <p class="mt-3 text-sm text-red-600">{errorMessage}</p>
  {/if}
</article>
