<script lang="ts">
  import Meta from '$lib/components/Meta.svelte';
  import ProductCard from '$lib/components/Shop/ProductCard.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  let { data } = $props();

  const products = $derived(data.products ?? []);
  const pagination = $derived(
    data.pagination ?? { page: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false, totalDocs: 0 },
  );
  const categories = $derived(data.categories ?? []);
  const collections = $derived(data.collections ?? []);
  const currentCategory = $derived(data.currentCategory ?? '');
  const currentCollection = $derived(data.currentCollection ?? '');
  const currentSort = $derived(data.currentSort ?? '-createdAt');
  const seo = $derived(data.seo);

  // Matches the fixed page size used by +page.server.ts's loader.
  const PER_PAGE = 24;

  const sortOptions = [
    { value: '-createdAt', label: 'Newest' },
    { value: 'name', label: 'Name A-Z' },
    { value: '-name', label: 'Name Z-A' },
  ];

  function buildHref(overrides: Record<string, string | number | undefined>): string {
    const params = new URLSearchParams($page.url.searchParams);
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined || value === '') {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    }
    const query = params.toString();
    return `/shop/health-and-beauty${query ? `?${query}` : ''}`;
  }

  function handleFilterChange(event: Event, key: string): void {
    const value = (event.currentTarget as HTMLSelectElement).value;
    goto(buildHref({ [key]: value || undefined, page: 1 }));
  }

  const rangeStart = $derived(products.length ? (pagination.page - 1) * PER_PAGE + 1 : 0);
  const rangeEnd = $derived(Math.min(pagination.page * PER_PAGE, pagination.totalDocs));
</script>

<Meta metadata={seo} />

<section class="page-header-modern">
  <div class="container mx-auto px-4">
    <nav class="flex items-center gap-2 text-sm text-white/80 mb-4">
      <a href="/" class="hover:text-white transition-colors">Home</a>
      <span class="text-white/60">›</span>
      <a href="/shop/" class="hover:text-white transition-colors">Shop</a>
      <span class="text-white/60">›</span>
      <span class="text-white font-medium">Health & Beauty</span>
    </nav>
    <h1 class="text-3xl md:text-4xl font-bold font-display">Health & Beauty</h1>
  </div>
</section>

<section class="section bg-background">
  <div class="container mx-auto px-4">
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
      <p class="text-muted-foreground">
        Showing {rangeStart}-{rangeEnd} of {pagination.totalDocs} results
      </p>

      <div class="flex flex-wrap gap-3">
        <select
          class="filter-select"
          value={currentCollection}
          onchange={(e) => handleFilterChange(e, 'collection')}
        >
          <option value="">All Collections</option>
          {#each collections as collection}
            <option value={collection.value}>{collection.label}</option>
          {/each}
        </select>

        <select
          class="filter-select"
          value={currentCategory}
          onchange={(e) => handleFilterChange(e, 'category')}
        >
          <option value="">All Categories</option>
          {#each categories as category}
            <option value={category.slug}>{category.name}</option>
          {/each}
        </select>

        <select class="filter-select" value={currentSort} onchange={(e) => handleFilterChange(e, 'sort')}>
          {#each sortOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </div>
    </div>

    {#if products.length === 0}
      <div class="flex flex-col items-center text-center py-16 px-4">
        <i class="far fa-spa text-5xl text-primary/40 mb-4" aria-hidden="true"></i>
        <h3 class="text-xl font-bold text-foreground mb-2">Nothing here yet</h3>
        <p class="text-muted-foreground max-w-md mb-6">
          We couldn't find any products matching this selection. Try a different category or browse
          the full collection.
        </p>
        <a href="/shop/health-and-beauty" class="btn-primary">Browse all Health &amp; Beauty</a>
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {#each products as product (product.id)}
          <ProductCard {product} productType={product.productType} basePath="/shop/health-and-beauty" />
        {/each}
      </div>
    {/if}

    <Pagination
      currentPage={pagination.page}
      totalPages={pagination.totalPages}
      buildHref={(p) => buildHref({ page: p })}
    />
  </div>
</section>

<style>
  .filter-select {
    border: 1px solid hsl(var(--border));
    border-radius: 0.5rem;
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    background: hsl(var(--background));
    color: hsl(var(--foreground));
  }

  .filter-select:focus {
    outline: none;
    border-color: hsl(var(--primary));
    box-shadow: 0 0 0 2px color-mix(in srgb, hsl(var(--primary)) 30%, transparent);
  }
</style>
