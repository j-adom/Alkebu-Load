<script lang="ts">
  import Meta from '$lib/components/Meta.svelte';
  import PayloadImage from '$lib/components/PayloadImage.svelte';
  import AddToCartButton from '$lib/components/cart/AddToCartButton.svelte';
  import ApparelCard from '$lib/components/Shop/Apparel/ApparelCard.svelte';
  import { formatCurrency } from '$lib/utils/currency';
  import { getImageUrl } from '$lib/payload';

  const normalizePrice = (value?: number | null) => {
    if (typeof value !== 'number') return null;
    return value > 1000 ? value / 100 : value;
  };

  const toPlainText = (content: any) => {
    if (!content) return '';
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content
        .map((block: any) => block?.children?.map((child: any) => child?.text).join(' ') || '')
        .join('\n')
        .trim();
    }
    return '';
  };

  let { data } = $props();
  const product = $derived(data.product);
  const seo = $derived(data.seo);
  const relatedProducts = $derived(data.relatedProducts ?? []);

  const productName = $derived(product?.name || product?.title || 'Product');
  const productId = $derived(product?.id || product?._id);
  const description = $derived(
    toPlainText(product?.shortDescription) ||
    toPlainText(product?.description) ||
    'Celebrate culture and style with this Alkebu-Lan Images piece.'
  );

  const gallery = $derived.by(() => {
    const uploads = Array.isArray(product?.images)
      ? product.images.map((img: any) => img?.image || img).filter(Boolean)
      : [];

    const scraped = Array.isArray(product?.scrapedImageUrls)
      ? product.scrapedImageUrls.map((img: any) => ({
          url: img?.url,
          alt: productName
        })).filter(Boolean)
      : [];

    return [...uploads, ...scraped];
  });

  const heroImage = $derived(Array.isArray(gallery) ? gallery[0] : undefined);
  const secondaryImages = $derived(Array.isArray(gallery) ? gallery.slice(1, 5) : []);

  const basePrice = $derived(
    normalizePrice(product?.price) ??
    normalizePrice(product?.pricing?.retailPrice) ??
    normalizePrice(product?.variations?.[0]?.price) ??
    0
  );

  const variations = $derived(product?.variations || []);
  const availableTypes = $derived(product?.availableProductTypes || []);
  const availableSizes = $derived(product?.availableSizes || []);
  const availableColors = $derived(product?.availableColors?.map((c: any) => c.colorName || c) || []);

  let selectedType = $state(variations.find((v: any) => v.isAvailable)?.productType || availableTypes[0]);
  let selectedSize = $state(variations.find((v: any) => v.isAvailable)?.size || availableSizes[0]);
  let selectedColor = $state(variations.find((v: any) => v.isAvailable)?.color || availableColors[0]);

  const selectedVariation = $derived.by(() =>
    variations.find((variation: any) =>
      (!selectedType || variation.productType === selectedType) &&
      (!selectedSize || variation.size === selectedSize) &&
      (!selectedColor || variation.color === selectedColor)
    ) || variations[0]
  );

  const displayPrice = $derived(normalizePrice(selectedVariation?.price) ?? basePrice);
  const inStock = $derived(selectedVariation?.isAvailable !== false);

  const customization = $derived.by(() => ({
    productType: selectedType,
    size: selectedSize,
    color: selectedColor,
    variationSku: selectedVariation?.sku
  }));

  const tags = $derived(product?.tags?.map((tag: any) => tag.tag).filter(Boolean) || []);
  const collections = $derived(product?.collections?.map((c: any) => c.collectionName).filter(Boolean) || []);

  const metadata = $derived.by(() => seo ?? {
    title: `${productName} | Alkebu-Lan Images`,
    description,
    image: heroImage ? getImageUrl(heroImage, { size: 'card' }) : undefined,
    imageAlt: productName,
    url: `/shop/apparel/${product?.slug || ''}`
  });
</script>

<Meta metadata={metadata} />

<section
  class="page-header"
  style={heroImage ? `background-image: linear-gradient(90deg, rgba(23,23,23,0.65), rgba(23,23,23,0.45)), url(${getImageUrl(heroImage, { size: 'hero' })});` : ''}
>
  <div class="container">
    <h2>{productName}</h2>
    <ul class="flex items-center gap-2 text-sm text-white/80">
      <li><a href="/">Home</a></li>
      <li><a href="/shop" class="shop_style">Shop</a></li>
      <li><a href="/shop/apparel">Apparel</a></li>
      <li><span>{productName}</span></li>
    </ul>
  </div>
</section>

<section class="product-detail py-12">
  <div class="container mx-auto px-6 lg:px-12">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-10">
      <!-- Images -->
      <div>
        {#if heroImage}
          <div class="rounded-xl overflow-hidden shadow bg-white mb-4">
            <PayloadImage image={heroImage} alt={productName} maxWidth={900} />
          </div>
          {#if secondaryImages.length}
            <div class="grid grid-cols-4 gap-3">
              {#each secondaryImages as image}
                <div class="rounded-lg overflow-hidden border border-gray-100 bg-white">
                  <PayloadImage {image} alt={productName} maxWidth={200} />
                </div>
              {/each}
            </div>
          {/if}
        {:else}
          <div class="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
            <i class="fas fa-image text-4xl text-gray-400"></i>
          </div>
        {/if}
      </div>

      <!-- Details -->
      <div class="space-y-5">
        {#if product?.brand}
          <p class="text-sm uppercase tracking-wide text-primary font-semibold">
            {product.brand}
          </p>
        {/if}
        <h1 class="text-3xl lg:text-4xl font-bold text-foreground leading-tight">{productName}</h1>
        {#if product?.shortDescription}
          <p class="text-lg text-gray-700">{product.shortDescription}</p>
        {/if}

        <div class="flex items-center gap-4">
          <p class="text-4xl font-semibold text-primary">{formatCurrency(displayPrice)}</p>
          {#if !inStock}
            <span class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-50 text-red-700">
              <i class="fas fa-times-circle mr-2"></i> Out of Stock
            </span>
          {:else}
            <span class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-50 text-green-700">
              <i class="fas fa-check-circle mr-2"></i> In Stock
            </span>
          {/if}
        </div>

        {#if variations.length || availableTypes.length || availableSizes.length || availableColors.length}
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {#if availableTypes.length}
              <label class="flex flex-col gap-2 text-sm font-semibold text-gray-700">
                Product Type
                <select class="form-select" bind:value={selectedType}>
                  {#each availableTypes as type}
                    <option value={type}>{type}</option>
                  {/each}
                </select>
              </label>
            {/if}

            {#if availableSizes.length}
              <label class="flex flex-col gap-2 text-sm font-semibold text-gray-700">
                Size
                <select class="form-select" bind:value={selectedSize}>
                  {#each availableSizes as size}
                    <option value={size}>{size.toUpperCase ? size.toUpperCase() : size}</option>
                  {/each}
                </select>
              </label>
            {/if}

            {#if availableColors.length}
              <label class="flex flex-col gap-2 text-sm font-semibold text-gray-700">
                Color
                <select class="form-select" bind:value={selectedColor}>
                  {#each availableColors as color}
                    <option value={color}>{color}</option>
                  {/each}
                </select>
              </label>
            {/if}
          </div>
        {/if}

        <div class="flex flex-col sm:flex-row gap-3">
          <AddToCartButton
            productId={productId}
            productType="fashion-jewelry"
            customization={customization}
            className="btn-primary text-center min-w-[200px]"
            disabled={!inStock}
            label={inStock ? 'Add to Cart' : 'Unavailable'}
          />
          <div class="flex flex-wrap gap-3 text-sm text-gray-600">
            {#if product?.style}
              <span class="badge">Style: {product.style}</span>
            {/if}
            {#if product?.primaryType}
              <span class="badge">Primary: {product.primaryType}</span>
            {/if}
            {#if product?.targetAudience?.length}
              <span class="badge">For {product.targetAudience.join(', ')}</span>
            {/if}
          </div>
        </div>

        <div class="bg-muted rounded-lg p-6 space-y-4">
          <h3 class="text-xl font-semibold text-foreground">Product Details</h3>
          <p class="text-gray-700 leading-relaxed whitespace-pre-line">{description}</p>

          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-700">
            {#if product?.vendor?.name}
              <div>
                <dt class="font-semibold">Vendor</dt>
                <dd>{product.vendor.name}</dd>
              </div>
            {/if}
            {#if product?.sizingNotes}
              <div>
                <dt class="font-semibold">Sizing</dt>
                <dd>{product.sizingNotes}</dd>
              </div>
            {/if}
            {#if availableColors.length}
              <div>
                <dt class="font-semibold">Available Colors</dt>
                <dd class="flex flex-wrap gap-2">
                  {#each availableColors as color}
                    <span class="inline-flex items-center px-3 py-1 rounded-full bg-white border text-xs">
                      {color}
                    </span>
                  {/each}
                </dd>
              </div>
            {/if}
            {#if availableSizes.length}
              <div>
                <dt class="font-semibold">Available Sizes</dt>
                <dd>{availableSizes.join(', ')}</dd>
              </div>
            {/if}
            {#if collections.length}
              <div>
                <dt class="font-semibold">Collections</dt>
                <dd>{collections.join(', ')}</dd>
              </div>
            {/if}
            {#if tags.length}
              <div>
                <dt class="font-semibold">Tags</dt>
                <dd class="flex flex-wrap gap-2">
                  {#each tags as tag}
                    <span class="inline-flex items-center px-3 py-1 rounded-full bg-white border text-xs">
                      #{tag}
                    </span>
                  {/each}
                </dd>
              </div>
            {/if}
            {#if product?.categories?.length}
              <div>
                <dt class="font-semibold">Categories</dt>
                <dd>{product.categories.join(', ')}</dd>
              </div>
            {/if}
          </dl>
        </div>
      </div>
    </div>
  </div>
</section>

{#if relatedProducts.length}
  <section class="py-12 bg-muted">
    <div class="container mx-auto px-6 lg:px-12">
      <div class="flex items-center justify-between mb-6">
        <div>
          <p class="text-primary font-semibold uppercase text-xs">You may also like</p>
          <h2 class="text-2xl font-bold text-foreground">Related Apparel</h2>
        </div>
        <a href="/shop/apparel" class="text-primary text-sm font-semibold">Browse all</a>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {#each relatedProducts as product}
          <ApparelCard {product} />
        {/each}
      </div>
    </div>
  </section>
{/if}

<style>
  .page-header {
    background-size: cover;
    background-position: center;
    color: white;
    padding: 4rem 0 2.5rem;
  }

  .form-select {
    display: block;
    width: 100%;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    transition: border-color 150ms ease, box-shadow 150ms ease;
  }

  .form-select:focus {
    outline: none;
    border-color: hsl(var(--primary));
    box-shadow: 0 0 0 2px color-mix(in srgb, hsl(var(--primary)) 30%, transparent);
  }

  .badge {
    background: #f3f4f6;
    padding: 0.4rem 0.75rem;
    border-radius: 999px;
  }
</style>
