<script lang="ts">
  import BuyApparel from './BuyApparel.svelte';
  import PayloadImage from "$lib/components/PayloadImage.svelte";

  interface Props {
    product: any;
  }

  let { product }: Props = $props();

  // Payload FashionJewelry structure
  let weight = $derived(product.weight || 2);

  // Get price from variations array or pricing object (in cents, convert to dollars)
  let price = $derived(
    product.variations?.[0]?.price ||
    (product.pricing?.retailPrice ? product.pricing.retailPrice / 100 : 0) ||
    product.price || // Direct price field
    0
  );

  // Get images from scrapedImageUrls (our R2 uploads) or images array
  let imageUrl = $derived(
    product.scrapedImageUrls?.[0]?.url ||  // R2 URLs from migration
    product.images?.[0]?.url ||            // Media collection URLs
    product.images?.[0]?.image?.url ||     // Nested image object
    null
  );

  // Brand is now a string in Payload, not an object
  let brandName = $derived(product.brand);
  let brandSlug = $derived(product.brand ? product.brand.toLowerCase().replace(/\s+/g, '-') : null);

  // Use name instead of title for Payload
  let productTitle = $derived(product.name || product.title);
</script>

<style>

</style>

<div class="flex flex-col">
  <div class="all_products_single text-center">
    <div class="all_product_item_image">
      <a href="/shop/apparel/{product.slug}">
        {#if imageUrl}
          <img
            src={imageUrl}
            alt={productTitle}
            loading="lazy"
            class="product-image"
          />
        {:else}
          <div class="placeholder-image">No Image</div>
        {/if}
        <!-- <div class="all_product_hover">
          <BuyApparel {product}/>
        </div> -->
      </a>
    </div>
    <h4>
      <a href="/shop/apparel/{product.slug}">
        {productTitle}
      </a>
    </h4>
    <h2>
      {#if brandName && brandSlug}
        <a href="/shop/apparel/brands/{brandSlug}">{brandName}</a>
      {:else if brandName}
        {brandName}
      {/if}
    </h2>
    <p>From ${price.toFixed(2)}</p>
  </div>
</div>



