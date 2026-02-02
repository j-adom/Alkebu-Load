<script lang="ts">
  import AddToCartButton from "$lib/components/cart/AddToCartButton.svelte";
  import { formatCurrency } from "$lib/utils/currency";
  import { getImageUrl } from "$lib/payload";
  import { ShoppingBag, Eye, Heart } from 'lucide-svelte';

  interface Props {
    product: any;
    productType: 'books' | 'wellness-lifestyle' | 'fashion-jewelry' | 'oils-incense';
    basePath?: string;
    loading?: boolean;
  }

  let { product, productType, basePath, loading = false }: Props = $props();

  // Determine the display name based on product type
  const productName = $derived(product?.name || product?.title || 'Unknown Product');

  // Get price - handle different price structures
  const priceCents = $derived(
    product?.pricing?.retailPrice ??
    product?.editions?.[0]?.pricing?.retailPrice ??
    product?.price ??
    0
  );
  const price = $derived((priceCents || 0) / 100);

  // Get compare price for sale display
  const comparePriceCents = $derived(
    product?.pricing?.comparePrice ??
    product?.editions?.[0]?.pricing?.comparePrice ??
    0
  );
  const comparePrice = $derived((comparePriceCents || 0) / 100);
  const isOnSale = $derived(comparePrice > price && comparePrice > 0);

  // Get image
  const imageSource = $derived(
    product?.images?.[0]?.image ||
    product?.images?.[0] ||
    (product?.scrapedImageUrls?.[0]?.url ? { url: product.scrapedImageUrls[0].url } : null)
  );

  const productId = $derived(product?.id || product?._id);

  // Build the product path
  const slug = $derived(() => {
    if (!product?.slug) return '';
    if (typeof product.slug === 'string') return product.slug;
    return product.slug?.current || '';
  });

  const productPath = $derived(() => {
    if (!slug) return basePath || '/shop';
    return `${basePath || '/shop'}/${slug}`;
  });

  const coverUrl = $derived(getImageUrl(imageSource, { fallback: '/assets/images/resources/placeholder-product.jpg' }));

  // Get subtitle based on product type
  const subtitle = $derived(() => {
    if (productType === 'books') {
      if (product?.authors?.length) {
        return 'by ' + product.authors.map((a: any) => a.name || a).join(', ');
      }
    } else if (productType === 'fashion-jewelry') {
      if (product?.brand) {
        return product.brand.name || product.brand;
      }
    }
    return product?.category || '';
  });

  // Check stock status
  const inStock = $derived(product?.inventory?.inStock !== false);
</script>

{#if loading}
  <!-- Loading Skeleton -->
  <div class="product-card animate-pulse">
    <div class="product-card-image bg-muted"></div>
    <div class="product-card-content">
      <div class="h-5 bg-muted rounded w-3/4 mb-2"></div>
      <div class="h-4 bg-muted rounded w-1/2 mb-3"></div>
      <div class="h-6 bg-muted rounded w-1/3"></div>
    </div>
  </div>
{:else}
  <div class="product-card">
    <!-- Image Container -->
    <div class="product-card-image relative">
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
        <div class="absolute top-3 left-3 badge-secondary">
          Sale
        </div>
      {/if}
      
      <!-- Stock Badge -->
      {#if !inStock}
        <div class="absolute top-3 right-3 bg-muted/90 text-muted-foreground px-2 py-1 text-xs rounded-full">
          Out of Stock
        </div>
      {/if}
      
      <!-- Hover Overlay -->
      <div class="product-card-overlay">
        <!-- Quick Actions -->
        <div class="product-card-actions">
          <AddToCartButton
            className="btn-primary btn-sm flex-1"
            productId={productId}
            {productType}
            iconOnly={false}
            label="Add to Cart"
          />
          <a 
            href={productPath} 
            class="btn btn-sm bg-white/90 text-foreground hover:bg-white"
            aria-label="Quick view {productName}"
          >
            <Eye size={18} />
          </a>
        </div>
      </div>
    </div>
    
    <!-- Content -->
    <div class="product-card-content">
      <a href={productPath} class="block">
        <h3 class="product-card-title">
          {productName}
        </h3>
      </a>
      
      {#if subtitle}
        <p class="text-sm text-muted-foreground line-clamp-1">
          {subtitle}
        </p>
      {/if}
      
      <div class="flex items-center gap-2 mt-2">
        <span class="product-card-price">
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
