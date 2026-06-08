<script lang="ts">
  import AddToCartButton from "$lib/components/cart/AddToCartButton.svelte";
  import BookPurchaseAction from "$lib/components/Shop/Books/BookPurchaseAction.svelte";
  import CoverFallback from "$lib/components/Shop/CoverFallback.svelte";
  import { getImageUrl } from "$lib/payload";
  import { normalizeProduct, type ProductType } from "$lib/utils/productCard";

  interface Props {
    product: any;
    productType: ProductType;
    basePath?: string;
    loading?: boolean;
  }

  let { product, productType, basePath, loading = false }: Props = $props();

  const norm = $derived(normalizeProduct(product, productType, basePath));
  const coverUrl = $derived(getImageUrl(norm.imageSource, { fallback: "" }));
  // Clean title (without the "(Paperback)" suffix norm.name carries) for the
  // branded fallback plate.
  const plateTitle = $derived(product?.title || product?.name || norm.name);

  let imageError = $state(false);
  const showImage = $derived(Boolean(norm.imageSource) && Boolean(coverUrl) && !imageError);
</script>

{#if loading}
  <div class="bg-card rounded-2xl border border-border/50 overflow-hidden animate-pulse">
    <div class="aspect-[2/3] w-full bg-muted"></div>
    <div class="p-4 space-y-3">
      <div class="h-5 bg-muted rounded w-3/4"></div>
      <div class="h-4 bg-muted rounded w-1/2"></div>
      <div class="h-6 bg-muted rounded w-1/3"></div>
    </div>
  </div>
{:else}
  <div
    class="group bg-card rounded-2xl border border-border/50 overflow-hidden shadow-soft transition-all duration-300 hover:shadow-medium hover:-translate-y-1 h-full flex flex-col"
  >
    <!-- Cover: the whole image is a link to the detail page -->
    <div class="relative {norm.aspectClass} w-full overflow-hidden bg-muted">
      <a href={norm.href} class="block w-full h-full" aria-label="View {norm.name}">
        {#if showImage}
          <img
            src={coverUrl}
            alt={norm.name}
            loading="lazy"
            onerror={() => (imageError = true)}
            class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        {:else}
          <CoverFallback title={plateTitle} subtitle={norm.subtitle} />
        {/if}
        <!-- Hover wash + hint reinforce that the cover is clickable -->
        <span
          class="absolute inset-0 bg-primary/45 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          aria-hidden="true"
        ></span>
        <span
          class="absolute bottom-4 left-1/2 -translate-x-1/2 translate-y-2 group-hover:translate-y-0
                 opacity-0 group-hover:opacity-100 transition-all duration-300
                 bg-white/95 text-foreground text-xs font-bold uppercase tracking-wide
                 px-4 py-2 rounded-full whitespace-nowrap"
          aria-hidden="true"
        >
          View details
        </span>
      </a>

      <!-- Sale / stock badges -->
      {#if norm.comparePriceLabel}
        <div class="absolute top-3 left-3 bg-secondary text-secondary-foreground px-3 py-1 text-xs font-medium rounded-full">
          Sale
        </div>
      {/if}
      {#if !norm.inStock}
        <div class="absolute top-3 left-3 bg-muted/90 text-muted-foreground px-3 py-1 text-xs font-medium rounded-full">
          Out of stock
        </div>
      {/if}

      <!-- Quick action: gold cart FAB (direct add) or "Select options" for variants -->
      {#if norm.canAddDirectly}
        <div class="quick-cart">
          {#if productType === "books"}
            <BookPurchaseAction
              book={product}
              className="cart-fab"
              iconOnly={true}
              label={`Add ${norm.name} to cart`}
            />
          {:else}
            <AddToCartButton
              productId={norm.productId}
              {productType}
              className="cart-fab"
              iconOnly={true}
              label={`Add ${norm.name} to cart`}
            />
          {/if}
        </div>
      {:else}
        <a
          href={norm.href}
          class="absolute top-3 right-3 z-10 bg-primary text-primary-foreground text-xs font-semibold px-3 py-2 rounded-full shadow-lg hover:bg-primary/90 transition-colors"
        >
          Select options
        </a>
      {/if}
    </div>

    <!-- Content -->
    <div class="p-4 flex flex-col flex-1">
      <a href={norm.href} class="block group/title">
        <h3 class="font-semibold text-foreground line-clamp-2 transition-colors duration-200 group-hover/title:text-primary">
          {norm.name}
        </h3>
      </a>

      {#if norm.subtitle}
        <p class="text-sm text-muted-foreground line-clamp-1 mt-1">{norm.subtitle}</p>
      {/if}

      <div class="flex items-center gap-2 mt-2">
        <span class="text-lg font-bold text-primary">{norm.priceLabel}</span>
        {#if norm.comparePriceLabel}
          <span class="text-sm text-muted-foreground line-through">{norm.comparePriceLabel}</span>
        {/if}
      </div>
    </div>
  </div>
{/if}
