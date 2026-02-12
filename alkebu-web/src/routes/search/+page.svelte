<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import PayloadImage from '$lib/components/PayloadImage.svelte';
  import { formatCurrency } from '$lib/utils/currency';
  import { Search, BookOpen, ShoppingBag, Sparkles, Home, ArrowRight } from 'lucide-svelte';

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
  let searchTime = $derived(data.searchTime || 0);
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

<!-- Search Header Section -->
<section class="relative py-16 md:py-20 bg-gradient-to-br from-kente-forest via-kente-indigo to-kente-forest overflow-hidden">
  <div class="absolute inset-0 bg-black/30"></div>
  <div class="container relative z-10 mx-auto px-4">
    <div class="max-w-3xl mx-auto text-center">
      <h1 class="text-4xl md:text-5xl font-bold text-white mb-4 font-display">Search Our Collection</h1>
      <p class="text-white/80 text-lg mb-8">Find books, products, events, and businesses</p>

      <!-- Search Form -->
      <div class="bg-white/10 backdrop-blur-md rounded-2xl p-2">
        <div class="flex flex-col sm:flex-row gap-2">
          <div class="relative flex-1">
            <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              bind:this={searchInput}
              bind:value={searchQuery}
              onkeydown={handleKeydown}
              type="text"
              placeholder="Search for books, products, events, businesses..."
              class="input-modern pl-12 bg-white"
            />
          </div>
          <select
            bind:value={typeFilter}
            class="select-modern bg-white sm:w-40"
            aria-label="Filter by type"
          >
            {#each availableTypes as typeOption}
              <option value={typeOption.value}>{typeOption.label}</option>
            {/each}
          </select>
          <button
            onclick={handleSearch}
            class="btn-primary"
          >
            <Search class="w-5 h-5" />
            Search
          </button>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Results Section -->
<section class="section bg-background">
  <div class="container mx-auto px-4">
    <div class="max-w-6xl mx-auto">
      {#if searchQuery}
        <!-- Results Header -->
        <div class="mb-8 flex items-center justify-between flex-wrap gap-3">
          <h2 class="text-2xl font-bold">
            {#if pagination.totalDocs > 0}
              Found <span class="text-primary">{pagination.totalDocs}</span> result{pagination.totalDocs === 1 ? '' : 's'} for "{searchQuery}"
              {#if typeFilter !== 'all'}
                <span class="text-muted-foreground font-normal">in {availableTypes.find(t => t.value === typeFilter)?.label || typeFilter}</span>
              {/if}
            {:else}
              No results found for "{searchQuery}"
            {/if}
          </h2>
          {#if searchTime > 0}
            <span class="text-sm text-muted-foreground">{searchTime}ms</span>
          {/if}
        </div>

        {#if results.length > 0}
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {#each results as result}
              <a href={result.url} class="group card-modern">
                <div class="relative aspect-[4/3] bg-muted overflow-hidden">
                  {#if isString(result.image)}
                    <img src={result.image} alt={result.title} class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                  {:else if result.image?.[0] || result.image?.url}
                    <PayloadImage
                      image={Array.isArray(result.image) ? result.image[0] : result.image}
                      alt={result.title}
                      maxWidth={400}
                      class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  {:else}
                    <div class="w-full h-full flex items-center justify-center text-muted-foreground text-sm">No image</div>
                  {/if}
                  <span class="absolute top-3 left-3 badge-primary uppercase">
                    {typeLabel(result.type)}
                  </span>
                </div>
                <div class="p-5 space-y-2">
                  <h3 class="text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                    {result.title}
                  </h3>
                  {#if result.author}
                    <p class="text-sm text-muted-foreground">by {result.author}</p>
                  {/if}
                  {#if result.description}
                    <p class="text-sm text-muted-foreground line-clamp-2">{result.description}</p>
                  {/if}
                  {#if result.price}
                    <p class="text-base font-bold text-primary">{formatCurrency(result.price)}</p>
                  {/if}
                </div>
              </a>
            {/each}
          </div>
        {:else}
          <!-- No Results -->
          <div class="text-center py-16 bg-muted/30 rounded-2xl">
            <div class="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Search class="w-8 h-8 text-muted-foreground" />
            </div>
            <p class="text-foreground text-lg mb-2">No results found for your search.</p>
            <p class="text-muted-foreground mb-6">Try different keywords or browse our collections:</p>
            <div class="flex flex-wrap justify-center gap-3">
              <a href="/shop/books" class="btn-outline btn-sm">
                <BookOpen class="w-4 h-4" />
                Browse Books
              </a>
              <a href="/shop/apparel" class="btn-outline btn-sm">
                <ShoppingBag class="w-4 h-4" />
                Browse Apparel
              </a>
              <a href="/shop/health-and-beauty" class="btn-outline btn-sm">
                <Sparkles class="w-4 h-4" />
                Health & Beauty
              </a>
              <a href="/shop/home-goods" class="btn-outline btn-sm">
                <Home class="w-4 h-4" />
                Home Goods
              </a>
            </div>
          </div>
        {/if}
      {:else}
        <!-- Empty State -->
        <div class="text-center py-16">
          <div class="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search class="w-10 h-10 text-primary" />
          </div>
          <p class="text-foreground text-xl mb-2">Enter a search term to find books, products, events, and more.</p>
          <p class="text-muted-foreground mb-8">Or explore our popular categories below:</p>
          <div class="flex flex-wrap justify-center gap-4">
            <a href="/shop/books" class="group flex items-center gap-2 text-primary font-semibold hover:gap-3 transition-all">
              Browse All Books
              <ArrowRight class="w-4 h-4" />
            </a>
            <a href="/shop" class="group flex items-center gap-2 text-primary font-semibold hover:gap-3 transition-all">
              Shop Departments
              <ArrowRight class="w-4 h-4" />
            </a>
            <a href="/blog" class="group flex items-center gap-2 text-primary font-semibold hover:gap-3 transition-all">
              Read the Blog
              <ArrowRight class="w-4 h-4" />
            </a>
          </div>
        </div>
      {/if}
    </div>
  </div>
</section>
