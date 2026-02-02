<script lang="ts">
  import AddToCartButton from "$lib/components/cart/AddToCartButton.svelte";
  import { formatCurrency } from "$lib/utils/currency";
  import { getImageUrl } from "$lib/payload";

  interface Props {
    product: any;
    productType: 'books' | 'wellness-lifestyle' | 'fashion-jewelry' | 'oils-incense';
    basePath?: string;
  }

  let { product, productType, basePath }: Props = $props();

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
      // For books, show authors
      if (product?.authors?.length) {
        return 'by ' + product.authors.map((a: any) => a.name || a).join(', ');
      }
    } else if (productType === 'fashion-jewelry') {
      // For apparel, show brand
      if (product?.brand) {
        return product.brand.name || product.brand;
      }
    }
    // For other types, show category or nothing
    return product?.category || '';
  });
</script>

<div class="flex flex-col text-center all_products_single">
  <div class="all_product_item_image">
    <img src={coverUrl} alt={productName} class="w-full object-cover rounded" loading="lazy" />
    <div class="all_product_hover">
      <AddToCartButton
        className="all_product_icon add-to-cart"
        productId={productId}
        {productType}
        iconOnly={true}
        label={`Add ${productName} to cart`}
      />
    </div>
  </div>
  <h4>
    <a href={productPath}>
      {productName}
    </a>
  </h4>
  {#if subtitle}
    <h2 class="text-sm text-gray-600 dark:text-gray-400">
      {subtitle}
    </h2>
  {/if}
  <p class="text-2xl">{formatCurrency(price)}</p>
</div>
