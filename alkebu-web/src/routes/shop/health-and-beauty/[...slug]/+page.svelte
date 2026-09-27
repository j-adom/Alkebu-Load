<script lang="ts">
  import Meta from '$lib/components/Meta.svelte';
  import ProductPhotoGallery from '$lib/components/Shop/ProductPhotoGallery.svelte';
  import { getWellnessPhotography } from '$lib/utils/wellnessPhotography';
  import LexicalRenderer from '$lib/components/LexicalRenderer.svelte';
  import AddToCartButton from '$lib/components/cart/AddToCartButton.svelte';
  import ProductCard from '$lib/components/Shop/ProductCard.svelte';
  import VariantPicker from '$lib/components/Shop/VariantPicker.svelte';
  import { resolveDefaultVariation, type VariantOption } from '$lib/utils/variant';
  import { formatCents } from '$lib/utils/currency';

  let { data } = $props();
  const product = $derived(data.product || {});
  const productType = $derived(data.productType as 'wellness-lifestyle' | 'oils-incense');
  const seo = $derived(data.seo);
  const relatedProducts = $derived(data.relatedProducts ?? []);

  const productName = $derived(product.name || product.title || 'Product');
  const variations = $derived<VariantOption[]>(Array.isArray(product.variations) ? product.variations : []);

  // Seeded synchronously (not via an on-mount effect) so the price shown
  // here matches VariantPicker's own default on the very first render,
  // including during SSR — otherwise this would flash $0.00 before
  // client-side JS runs the picker's mount effect. VariantPicker's onchange
  // takes over from here for every change after that (scent/size clicks).
  let selectedVariation = $state<VariantOption | null>(resolveDefaultVariation(variations));

  // `$state` initializers only run once, at component creation. A
  // client-side navigation between two products under this same
  // `[...slug]` route swaps `data.product` without remounting this
  // component — `{#key product.id}` below only remounts the markup, not
  // this script's state — so without this effect the page would briefly
  // show the NEW product's name/image with the OLD product's price and SKU.
  // Re-seed the selection whenever `variations` (derived from `product`)
  // changes identity. This runs client-side only (effects don't execute
  // during SSR), which is fine: the initializer above already gives SSR and
  // first paint the correct value.
  $effect(() => {
    selectedVariation = resolveDefaultVariation(variations);
  });

  const displayPriceCents = $derived(selectedVariation?.price ?? 0);
  const inStock = $derived(
    selectedVariation ? (selectedVariation.stock ?? 0) > 0 && selectedVariation.isAvailable !== false : false,
  );

  const gallery = $derived.by(() => {
    const images = Array.isArray(product.images)
      ? product.images.map((img: any) => img?.image || img).filter(Boolean)
      : [];
    const combined = [product.heroImage, ...images, ...getWellnessPhotography(product)];
    return combined.filter((image, index) => image?.url &&
      combined.findIndex((other) => other?.url === image.url) === index);
  });

  const ingredients = $derived(
    Array.isArray(product.ingredients)
      ? product.ingredients.map((i: any) => i?.ingredient || i).filter(Boolean)
      : [],
  );
  const categories = $derived(Array.isArray(product.categories) ? product.categories : []);

  const customization = $derived.by(() => ({
    variationSku: selectedVariation?.sku,
  }));

  const canAddToCart = $derived(Boolean(selectedVariation?.sku) && inStock);
</script>

<Meta metadata={seo} />

<nav class="product-breadcrumb container mx-auto px-6 lg:px-12" aria-label="Breadcrumb">
  <a href="/">Home</a><span aria-hidden="true">/</span>
  <a href="/shop">Shop</a><span aria-hidden="true">/</span>
  <a href="/shop/health-and-beauty">Health &amp; Beauty</a>
</nav>

<!-- Product Detail -->
{#key product.id}
  <section class="product-detail pb-12">
    <div class="container mx-auto px-6 lg:px-12">
      <div class="product-layout">
        <div class="min-w-0">
          <ProductPhotoGallery images={gallery} {productName} />
        </div>

        <!-- Product Info -->
        <div>
          <div class="mb-6">
            {#if product.brand}
              <p class="text-sm text-primary mb-2 uppercase tracking-wide font-semibold">
                {product.brand}
              </p>
            {/if}

            <h1 class="text-3xl lg:text-4xl font-display font-bold mb-4 text-foreground">
              {productName}
            </h1>

            {#if product.shortDescription}
              <p class="text-xl text-gray-600 mb-4">{product.shortDescription}</p>
            {/if}

            <!-- Price -->
            <div class="mb-6">
              <p class="text-3xl font-semibold text-foreground tabular-nums">{formatCents(displayPriceCents)}</p>
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

          <!-- Variant Picker (scent + size) — omitted entirely for single-variation products -->
          <div class="mb-8">
            <VariantPicker {variations} onchange={(v) => (selectedVariation = v)} />
          </div>

          <!-- Add to Cart -->
          <div class="mb-8">
            <AddToCartButton
              productId={product.id}
              {productType}
              {customization}
              disabled={!canAddToCart}
              className="btn-primary w-full text-center text-lg py-4"
              label={canAddToCart ? 'Add to Cart' : 'Out of Stock'}
            />
          </div>

          <!-- Description -->
          {#if product.description}
            <div class="mb-8">
              <h2 class="text-2xl font-bold mb-4 text-foreground">About This Product</h2>
              <div class="prose max-w-none text-gray-700 leading-relaxed">
                <LexicalRenderer content={product.description} />
              </div>
            </div>
          {/if}

          <!-- Product Details -->
          <div class="mb-8">
            <h3 class="text-xl font-bold mb-4 text-foreground">Product Details</h3>
            <dl class="space-y-2">
              {#if selectedVariation?.sku}
                <div class="flex justify-between py-2 border-b border-gray-200">
                  <dt class="font-medium text-gray-700">SKU:</dt>
                  <dd class="text-gray-600">{selectedVariation.sku}</dd>
                </div>
              {/if}

              {#if ingredients.length}
                <div class="flex justify-between py-2 border-b border-gray-200">
                  <dt class="font-medium text-gray-700">Ingredients:</dt>
                  <dd class="text-gray-600 text-right">{ingredients.join(', ')}</dd>
                </div>
              {/if}

              {#if categories.length}
                <div class="flex justify-between py-2 border-b border-gray-200">
                  <dt class="font-medium text-gray-700">Categories:</dt>
                  <dd class="text-gray-600 text-right">{categories.join(', ')}</dd>
                </div>
              {/if}
            </dl>
          </div>

          <!-- Additional Info -->
          {#if product.usageInstructions}
            <div class="bg-muted rounded-lg p-6 mb-6">
              <h3 class="text-lg font-bold mb-3 text-foreground">
                <i class="far fa-info-circle mr-2"></i>
                How to Use
              </h3>
              <div class="text-gray-700">
                <LexicalRenderer content={product.usageInstructions} />
              </div>
            </div>
          {/if}

          {#if product.safetyInformation}
            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 class="text-lg font-bold mb-3 text-yellow-800">
                <i class="far fa-exclamation-triangle mr-2"></i>
                Warnings & Precautions
              </h3>
              <div class="text-yellow-700 text-sm">
                <LexicalRenderer content={product.safetyInformation} />
              </div>
            </div>
          {/if}
        </div>
      </div>

      <!-- Related Products Section -->
      {#if relatedProducts.length}
        <div class="mt-16">
          <h2 class="text-2xl font-bold mb-6 text-foreground">You May Also Like</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {#each relatedProducts as related}
              <ProductCard product={related} productType={related.productType ?? productType} basePath="/shop/health-and-beauty" />
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </section>
{/key}

<style>
  .product-breadcrumb { display: flex; flex-wrap: wrap; gap: .75rem; padding-top: 2rem; padding-bottom: 2rem; font-size: .875rem; color: hsl(var(--foreground) / .8); }
  .product-breadcrumb a:hover { color: hsl(var(--foreground)); text-decoration: underline; text-underline-offset: .25em; }
  .product-breadcrumb a:focus-visible { outline: 2px solid hsl(var(--foreground)); outline-offset: 4px; }
  .product-layout { display: grid; grid-template-columns: minmax(0, 1fr); gap: 2.5rem; }
  .product-layout > div { min-width: 0; }
  .product-detail :global(h1) { text-wrap: balance; }
  .product-detail :global(dd) { overflow-wrap: anywhere; }
  @media (min-width: 1024px) { .product-layout { grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: 3.5rem; } }
</style>
