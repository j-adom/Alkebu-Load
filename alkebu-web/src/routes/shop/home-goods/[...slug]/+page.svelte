<script lang="ts">
  import Meta from '$lib/components/Meta.svelte';
  import PayloadImage from '$lib/components/PayloadImage.svelte';
  import AddToCartButton from '$lib/components/cart/AddToCartButton.svelte';
  import { formatCurrency } from '$lib/utils/currency';

  let { data } = $props();
  const { product, productType, seo } = data;

  const price = product.pricing?.retailPrice || product.price || 0;
  const inStock = product.inventory?.trackInventory
    ? product.inventory.stockLevel > 0
    : true;
</script>

<Meta metadata={seo} />

<!-- Page Header -->
<section class="page-header" style="background-image: url({product.images?.[0]?.url || '/assets/images/resources/page-header-bg.jpg'});">
  <div class="container">
    <h2>{product.title}</h2>
    <ul class="flex items-center gap-2 text-sm text-white/80">
      <li><a href="/">Home</a></li>
      <li><a href="/shop">Shop</a></li>
      <li><a href="/shop/home-goods">Art & Imports</a></li>
      <li><span>{product.title}</span></li>
    </ul>
  </div>
</section>

<!-- Product Detail -->
<section class="product-detail py-12">
  <div class="container mx-auto px-6 lg:px-12">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">

      <!-- Product Images -->
      <div>
        <div class="sticky top-24">
          {#if product.images && product.images.length > 0}
            <div class="mb-4 rounded-lg overflow-hidden bg-white shadow-lg">
              <PayloadImage
                image={product.images[0]}
                alt={product.title}
                maxWidth={600}
              />
            </div>

            {#if product.images.length > 1}
              <div class="grid grid-cols-4 gap-2">
                {#each product.images.slice(1, 5) as image}
                  <div class="rounded overflow-hidden cursor-pointer hover:opacity-75 transition-opacity">
                    <PayloadImage
                      {image}
                      alt={product.title}
                      maxWidth={150}
                    />
                  </div>
                {/each}
              </div>
            {/if}
          {:else}
            <div class="aspect-square bg-gray-200 rounded-lg flex items-center justify-center">
              <i class="fas fa-image text-6xl text-gray-400"></i>
            </div>
          {/if}
        </div>
      </div>

      <!-- Product Info -->
      <div>
        <div class="mb-6">
          {#if product.artisan || product.artist}
            <p class="text-sm text-primary mb-2 uppercase tracking-wide font-semibold">
              By {product.artisan?.name || product.artist}
            </p>
          {/if}

          <h1 class="text-3xl lg:text-4xl font-bold mb-4 text-foreground">
            {product.title}
          </h1>

          {#if product.subtitle}
            <p class="text-xl text-gray-600 mb-4">{product.subtitle}</p>
          {/if}

          <!-- Price -->
          <div class="mb-6">
            <p class="text-4xl font-bold text-primary">{formatCurrency(price)}</p>
            {#if product.pricing?.compareAtPrice && product.pricing.compareAtPrice > price}
              <p class="text-lg text-gray-500 line-through">
                {formatCurrency(product.pricing.compareAtPrice)}
              </p>
            {/if}
          </div>

          <!-- Stock Status -->
          <div class="mb-6">
            {#if inStock}
              <span class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                <i class="fas fa-check-circle mr-2"></i>
                In Stock
              </span>
            {:else}
              <span class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 text-red-800">
                <i class="fas fa-times-circle mr-2"></i>
                Out of Stock
              </span>
            {/if}
          </div>
        </div>

        <!-- Description -->
        {#if product.description}
          <div class="mb-8">
            <h2 class="text-2xl font-bold mb-4 text-foreground">About This Item</h2>
            <div class="prose max-w-none">
              <p class="text-gray-700 leading-relaxed">{product.description}</p>
            </div>
          </div>
        {/if}

        <!-- Product Details -->
        <div class="mb-8">
          <h3 class="text-xl font-bold mb-4 text-foreground">Product Details</h3>
          <dl class="space-y-2">
            {#if product.origin || product.countryOfOrigin}
              <div class="flex justify-between py-2 border-b border-gray-200">
                <dt class="font-medium text-gray-700">Origin:</dt>
                <dd class="text-gray-600">{product.origin || product.countryOfOrigin}</dd>
              </div>
            {/if}

            {#if product.dimensions}
              <div class="flex justify-between py-2 border-b border-gray-200">
                <dt class="font-medium text-gray-700">Dimensions:</dt>
                <dd class="text-gray-600">{product.dimensions}</dd>
              </div>
            {/if}

            {#if product.materials}
              <div class="flex justify-between py-2 border-b border-gray-200">
                <dt class="font-medium text-gray-700">Materials:</dt>
                <dd class="text-gray-600">{product.materials}</dd>
              </div>
            {/if}

            {#if product.sku}
              <div class="flex justify-between py-2 border-b border-gray-200">
                <dt class="font-medium text-gray-700">SKU:</dt>
                <dd class="text-gray-600">{product.sku}</dd>
              </div>
            {/if}
          </dl>
        </div>

        <!-- Add to Cart -->
        <div class="mb-8">
          <AddToCartButton
            productId={product.id}
            productType={productType}
            disabled={!inStock}
            className="btn-primary w-full text-center text-lg py-4"
            label={inStock ? 'Add to Cart' : 'Out of Stock'}
          />
        </div>

        <!-- Cultural Significance -->
        {#if product.culturalSignificance || product.story}
          <div class="bg-muted rounded-lg p-6 mb-6">
            <h3 class="text-lg font-bold mb-3 text-foreground">
              <i class="far fa-star mr-2"></i>
              Cultural Significance
            </h3>
            <p class="text-gray-700">{product.culturalSignificance || product.story}</p>
          </div>
        {/if}

        <!-- Care Instructions -->
        {#if product.careInstructions}
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 class="text-lg font-bold mb-3 text-blue-800">
              <i class="far fa-hand-sparkles mr-2"></i>
              Care Instructions
            </h3>
            <p class="text-blue-700 text-sm">{product.careInstructions}</p>
          </div>
        {/if}
      </div>
    </div>

    <!-- Related Products Section -->
    <!-- TODO: Add related products once implemented in server -->
  </div>
</section>
