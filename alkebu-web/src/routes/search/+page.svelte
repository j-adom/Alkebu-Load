<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import PayloadImage from '$lib/components/PayloadImage.svelte';
  
  let { data } = $props();
  
  let searchInput: HTMLInputElement = $state();
  let searchQuery = $state($page.url.searchParams.get('q') || '');
  let typeFilter = $state((data.typeFilter as string) || ($page.url.searchParams.get('type') as string) || 'all');
  const availableTypes = data.availableTypes || [];
  const typeLabel = (value: string) => availableTypes.find((t: any) => t.value === value)?.label || value;
  const isString = (val: unknown): val is string => typeof val === 'string';
  
  const handleSearch = () => {
    if (browser) {
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.set('q', searchQuery.trim());
      }
      if (typeFilter && typeFilter !== 'all') {
        params.set('type', typeFilter);
      }
      goto(`/search${params.toString() ? `?${params}` : ''}`, { 
        replaceState: false 
      });
    }
  };
  
  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };
  
  let results = $derived(data.results || []);
  let pagination = $derived(data.pagination || { page: 1, totalPages: 1, totalDocs: 0 });
</script>

<svelte:head>
  <title>{data.seo?.title}</title>
  <meta name="description" content={data.seo?.description} />
  {#if data.seo?.canonical}
    <link rel="canonical" href={data.seo.canonical} />
  {/if}
  {#if data.seo?.noIndex}
    <meta name="robots" content="noindex,nofollow" />
  {/if}
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <div class="max-w-4xl mx-auto">
    
    <!-- Search Header -->
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold mb-4">Search Our Collection</h1>
      <div class="max-w-2xl mx-auto space-y-3">
        <div class="flex">
          <input
            bind:this={searchInput}
            bind:value={searchQuery}
            onkeydown={handleKeydown}
            type="text"
            placeholder="Search for books, products, events, businesses..."
            class="flex-1 px-4 py-3 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-thm-primary focus:border-thm-primary outline-none"
          />
          <select
            bind:value={typeFilter}
            class="border border-gray-300 px-3 py-3 text-sm focus:ring-2 focus:ring-thm-primary focus:border-thm-primary outline-none"
            aria-label="Filter by type"
          >
            {#each availableTypes as typeOption}
              <option value={typeOption.value}>{typeOption.label}</option>
            {/each}
          </select>
          <button
            onclick={handleSearch}
            class="px-6 py-3 bg-thm-primary text-white rounded-r-lg hover:bg-thm-black focus:ring-2 focus:ring-thm-primary outline-none"
          >
            Search
          </button>
        </div>
        <p class="text-sm text-gray-600">Search across books, apparel, health & beauty, home goods, blog, directory, and events.</p>
      </div>
    </div>

    <!-- Results -->
    {#if searchQuery}
      <div class="mb-6 flex items-center justify-between flex-wrap gap-3">
        <h2 class="text-xl font-semibold">
          {#if pagination.totalDocs > 0}
            Found {pagination.totalDocs} result{pagination.totalDocs === 1 ? '' : 's'} for "{searchQuery}"
            {#if typeFilter !== 'all'} in {availableTypes.find(t => t.value === typeFilter)?.label || typeFilter}{/if}
          {:else}
            No results found for "{searchQuery}"
          {/if}
        </h2>
      </div>

      {#if results.length > 0}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {#each results as result}
            <a href={result.url} class="group block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden">
              <div class="relative aspect-[4/3] bg-gray-100">
                {#if isString(result.image)}
                  <img src={result.image} alt={result.title} class="w-full h-full object-cover" loading="lazy" />
                {:else if result.image?.[0] || result.image?.url}
                  <PayloadImage
                    image={Array.isArray(result.image) ? result.image[0] : result.image}
                    alt={result.title}
                    maxWidth={400}
                    class="w-full h-full object-cover"
                  />
                {:else}
                  <div class="w-full h-full flex items-center justify-center text-gray-400 text-sm">No image</div>
                {/if}
                <span class="absolute top-3 left-3 rounded-full bg-thm-primary text-white text-xs font-semibold px-3 py-1 uppercase">
                  {typeLabel(result.type)}
                </span>
              </div>
              <div class="p-4 space-y-2">
                <h3 class="text-lg font-semibold text-thm-black group-hover:text-thm-primary transition-colors line-clamp-2">
                  {result.title}
                </h3>
                {#if result.description}
                  <p class="text-sm text-gray-600 line-clamp-2">{result.description}</p>
                {/if}
              </div>
            </a>
          {/each}
        </div>
      {:else}
        <div class="text-center py-12">
          <p class="text-gray-600 mb-4">No results found for your search.</p>
          <p class="text-sm text-gray-500">Try different keywords or browse our collections:</p>
          <div class="mt-4 space-x-4">
            <a href="/shop/books" class="text-thm-primary hover:underline">Browse Books</a>
            <a href="/shop/apparel" class="text-thm-primary hover:underline">Browse Apparel</a>
            <a href="/shop/health-and-beauty" class="text-thm-primary hover:underline">Health & Beauty</a>
            <a href="/shop/home-goods" class="text-thm-primary hover:underline">Home Goods</a>
          </div>
        </div>
      {/if}
    {:else}
      <div class="text-center py-12">
        <p class="text-gray-600 mb-4">Enter a search term to find books, products, events, and more.</p>
        <div class="space-x-4">
          <a href="/shop/books" class="text-thm-primary hover:underline">Browse All Books</a>
          <a href="/shop" class="text-thm-primary hover:underline">Shop Departments</a>
          <a href="/blog" class="text-thm-primary hover:underline">Read the Blog</a>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
