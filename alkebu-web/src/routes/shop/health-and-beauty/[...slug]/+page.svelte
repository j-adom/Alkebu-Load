<script lang="ts">
  import Meta from '$lib/components/Meta.svelte';
  import PayloadImage from '$lib/components/PayloadImage.svelte';
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
    return product.heroImage ? [product.heroImage, ...images] : images;
  });
  const heroImage = $derived(gallery[0]);
  const secondaryImages = $derived(gallery.slice(1, 5));

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

<!-- Page Header -->
<section
  class="page-header"
  style={heroImage ? `background-image: linear-gradient(90deg, rgba(23,23,23,0.65), rgba(23,23,23,0.45)), url(${heroImage.url});` : ''}
>
  <div class="container">
    <h2>{productName}</h2>
    <ul class="flex items-center gap-2 text-sm text-white/80">
      <li><a href="/">Home</a></li>
      <li><a href="/shop">Shop</a></li>
      <li><a href="/shop/health-and-beauty">Health & Beauty</a></li>
      <li><span>{productName}</span></li>
    </ul>
  </div>
</section>

<!-- Product Detail -->
{#key product.id}
  <section class="product-detail py-12">
    <div class="container mx-auto px-6 lg:px-12">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <!-- Product Images -->
        <div>
          <div class="sticky top-24">
            {#if heroImage}
              <div class="mb-4 rounded-lg overflow-hidden bg-white shadow-lg">
                <PayloadImage image={heroImage} alt={productName} maxWidth={600} />
              </div>

              {#if secondaryImages.length}
                <div class="grid grid-cols-4 gap-2">
                  {#each secondaryImages as image}
                    <div class="rounded overflow-hidden cursor-pointer hover:opacity-75 transition-opacity">
                      <PayloadImage {image} alt={productName} maxWidth={150} />
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
            {#if product.brand}
              <p class="text-sm text-primary mb-2 uppercase tracking-wide font-semibold">
                {product.brand}
              </p>
            {/if}

            <h1 class="text-3xl lg:text-4xl font-bold mb-4 text-foreground">
              {productName}
            </h1>

            {#if product.shortDescription}
              <p class="text-xl text-gray-600 mb-4">{product.shortDescription}</p>
            {/if}

            <!-- Price -->
            <div class="mb-6">
              <p class="text-4xl font-bold text-primary">{formatCents(displayPriceCents)}</p>
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
  .page-header {
    background-size: cover;
    background-position: center;
    color: white;
    padding: 4rem 0 2.5rem;
  }
</style>
