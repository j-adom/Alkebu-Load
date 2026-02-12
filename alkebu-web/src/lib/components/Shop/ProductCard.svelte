<script lang="ts">
  import AddToCartButton from "$lib/components/cart/AddToCartButton.svelte";
  import { formatCurrency } from "$lib/utils/currency";
  import { getImageUrl } from "$lib/payload";
  import { ShoppingCart, Eye } from "lucide-svelte";

  interface Props {
    product: any;
    productType:
      | "books"
      | "wellness-lifestyle"
      | "fashion-jewelry"
      | "oils-incense";
    basePath?: string;
    loading?: boolean;
  }

  let { product, productType, basePath, loading = false }: Props = $props();

  // Determine the display name based on product type
  const productName = $derived(
    product?.name || product?.title || "Unknown Product",
  );

  // Get price - handle different price structures
  const priceCents = $derived(
    product?.pricing?.retailPrice ??
      product?.editions?.[0]?.pricing?.retailPrice ??
      product?.price ??
      0,
  );
  const price = $derived((priceCents || 0) / 100);

  // Get compare price for sale display
  const comparePriceCents = $derived(
    product?.pricing?.comparePrice ??
      product?.editions?.[0]?.pricing?.comparePrice ??
      0,
  );
  const comparePrice = $derived((comparePriceCents || 0) / 100);
  const isOnSale = $derived(comparePrice > price && comparePrice > 0);

  // Get image
  const imageSource = $derived(
    product?.images?.[0]?.image ||
      product?.images?.[0] ||
      (product?.scrapedImageUrls?.[0]?.url
        ? { url: product.scrapedImageUrls[0].url }
        : null),
  );

  const productId = $derived(product?.id || product?._id);

  // Build the product path
  const slug = $derived(
    !product?.slug
      ? ""
      : typeof product.slug === "string"
        ? product.slug
        : product.slug?.current || "",
  );

  const productPath = $derived(
    !slug ? basePath || "/shop" : `${basePath || "/shop"}/${slug}`,
  );

  const coverUrl = $derived(
    getImageUrl(imageSource, {
      fallback: "/assets/images/resources/placeholder-product.jpg",
    }),
  );

  // Get subtitle based on product type
  const subtitle = $derived(
    productType === "books" && product?.authors?.length
      ? "by " + product.authors.map((a: any) => a.name || a).join(", ")
      : productType === "fashion-jewelry" && product?.brand
        ? product.brand.name || product.brand
        : product?.category || "",
  );

  // Check stock status
  const inStock = $derived(product?.inventory?.inStock !== false);
</script>

{#if loading}
  <!-- Loading Skeleton -->
  <div
    class="bg-card rounded-2xl border border-border/50 overflow-hidden animate-pulse"
  >
    <div class="aspect-[3/4] w-full bg-muted"></div>
    <div class="p-4 space-y-3">
      <div class="h-5 bg-muted rounded w-3/4"></div>
      <div class="h-4 bg-muted rounded w-1/2"></div>
      <div class="h-6 bg-muted rounded w-1/3"></div>
    </div>
  </div>
{:else}
  <!-- Product Card with group class for hover effects -->
  <div
    class="group bg-card rounded-2xl border border-border/50 overflow-hidden shadow-soft transition-all duration-300 hover:shadow-medium hover:-translate-y-1"
  >
    <!-- Image Container -->
    <div class="relative aspect-[3/4] w-full overflow-hidden bg-muted">
      <a href={productPath} class="block w-full h-full">
        <img
          src={coverUrl}
          alt={productName}
          loading="lazy"
          class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </a>

      <!-- Sale Badge -->
      {#if isOnSale}
        <div
          class="absolute top-3 left-3 bg-secondary text-secondary-foreground px-3 py-1 text-xs font-medium rounded-full"
        >
          Sale
        </div>
      {/if}

      <!-- Stock Badge -->
      {#if !inStock}
        <div
          class="absolute top-3 right-3 bg-muted/90 text-muted-foreground px-3 py-1 text-xs font-medium rounded-full"
        >
          Out of Stock
        </div>
      {/if}

      <!-- Quick Add Button - Clean floating button design -->
      {#if inStock}
        <div
          class="absolute bottom-0 left-0 right-0 p-3 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300"
        >
          <div class="flex gap-2">
            <AddToCartButton
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-lg transition-all hover:shadow-glow"
              {productId}
              {productType}
              iconOnly={false}
              label="Add to Cart"
            />
            <a
              href={productPath}
              class="bg-white/95 hover:bg-white text-foreground p-2.5 rounded-xl shadow-lg transition-all flex items-center justify-center"
              aria-label="View {productName}"
            >
              <Eye size={18} />
            </a>
          </div>
        </div>
      {/if}
    </div>

    <!-- Content -->
    <div class="p-4">
      <a href={productPath} class="block group/title">
        <h3
          class="font-semibold text-foreground line-clamp-2 transition-colors duration-200 group-hover/title:text-primary"
        >
          {productName}
        </h3>
      </a>

      {#if subtitle}
        <p class="text-sm text-muted-foreground line-clamp-1 mt-1">
          {subtitle}
        </p>
      {/if}

      <div class="flex items-center gap-2 mt-2">
        <span class="text-lg font-bold text-primary">
          {formatCurrency(price)}
        </span>
        {#if isOnSale}
          <span class="text-sm text-muted-foreground line-through">
            {formatCurrency(comparePrice)}
          </span>
        {/if}
      </div>
    </div>
  </div>
{/if}
