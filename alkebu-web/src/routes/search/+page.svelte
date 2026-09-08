<script lang="ts">
  import { page } from '$app/stores';
  import { afterNavigate, goto, invalidateAll } from '$app/navigation';
  import { browser } from '$app/environment';
  import PayloadImage from '$lib/components/PayloadImage.svelte';
  import { trackEvent } from '$lib/analytics';
  import { formatCurrency } from '$lib/utils/currency';
  import { cleanResultDescription, getBookMeta } from '$lib/utils/searchPresentation.js';
  import { Search, BookOpen, ShoppingBag, Sparkles, Home, ArrowRight, RotateCcw } from 'lucide-svelte';

  type SearchPageData = {
    searchStatus?: 'idle' | 'success' | 'error';
    typeFilter?: string;
    availableTypes?: Array<{ label: string; value: string }>;
    results?: any[];
    searchTime?: number;
    pagination?: {
      page?: number;
      totalPages?: number;
      totalDocs?: number | null;
      hasMore?: boolean;
    };
    seo?: Record<string, any>;
  };

  let { data } = $props<{ data: SearchPageData }>();

  let searchInput = $state<HTMLInputElement | undefined>();
  let searchQuery = $state('');
  let typeFilter = $state('all');
  let isSubmitting = $state(false);
  const initialSearchQuery = $derived($page.url.searchParams.get('q') || '');
  const initialTypeFilter = $derived((data.typeFilter as string) || ($page.url.searchParams.get('type') as string) || 'all');
  const availableTypes = $derived(data.availableTypes || []);
  const seo = $derived(data.seo || {});
  const searchStatus = $derived(data.searchStatus || (initialSearchQuery ? 'success' : 'idle'));
  const isLoading = $derived(isSubmitting);
  const typeLabel = (value: string) => availableTypes.find((t: any) => t.value === value)?.label || value;
  const isString = (val: unknown): val is string => typeof val === 'string';
  const resultDescription = (result: any) => cleanResultDescription(result.description, result.title, result.author);
  const bookMeta = (result: any) => getBookMeta(result.metadata || {});

  $effect(() => {
    searchQuery = initialSearchQuery;
    typeFilter = initialTypeFilter;
  });

  afterNavigate(() => {
    isSubmitting = false;
  });

  const handleSearch = () => {
    if (browser) {
      const trimmedQuery = searchQuery.trim();
      if (!trimmedQuery) return;

      const params = new URLSearchParams();
      params.set('q', trimmedQuery);
      if (typeFilter && typeFilter !== 'all') {
        params.set('type', typeFilter);
      }
      trackEvent('search_submit', {
        query: trimmedQuery,
        type: typeFilter,
      });
      const nextUrl = `/search${params.toString() ? `?${params}` : ''}`;
      isSubmitting = true;
      if (`${$page.url.pathname}${$page.url.search}` === nextUrl) {
        invalidateAll().finally(() => {
          isSubmitting = false;
        });
        return;
      }
      goto(nextUrl, {
        replaceState: false
      });
    }
  };

  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    handleSearch();
  };

  let results = $derived(data.results || []);
  let pagination = $derived(data.pagination || { page: 1, totalPages: 1, totalDocs: 0 });
  const hasResults = $derived(results.length > 0);

  const loadMore = () => {
    if (!browser || !pagination.hasMore) return;
    const params = new URLSearchParams($page.url.searchParams);
    params.set('page', String((pagination.page || 1) + 1));
    isSubmitting = true;
    goto(`/search?${params.toString()}`, { replaceState: false });
  };
</script>

<svelte:head>
  <title>{seo?.title}</title>
  <meta name="description" content={seo?.description} />
  {#if seo?.canonical}
    <link rel="canonical" href={seo.canonical} />
  {/if}
  {#if seo?.noIndex}
    <meta name="robots" content="noindex,nofollow" />
  {/if}
</svelte:head>

<!-- Search Header Section -->
<section class="relative {searchQuery ? 'py-10 md:py-14' : 'py-14 md:py-20'} bg-gradient-to-br from-kente-forest via-kente-indigo to-kente-forest overflow-hidden">
  <div class="absolute inset-0 bg-black/30"></div>
  <div class="container relative z-10 mx-auto px-4">
    <div class="max-w-3xl mx-auto text-center">
      <h1 class="{searchQuery ? 'text-3xl md:text-4xl mb-3' : 'text-4xl md:text-5xl mb-4'} font-bold text-white font-display">Search Our Collection</h1>
      <p class="text-white/80 text-lg mb-7">Find books, products, events, and businesses</p>

      <!-- Search Form -->
      <form class="bg-white/10 backdrop-blur-md rounded-2xl p-2" onsubmit={handleSubmit} aria-label="Search the collection">
        <div class="flex flex-col sm:flex-row gap-2">
          <div class="relative flex-1">
            <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <label for="collection-search" class="sr-only">Search the collection</label>
            <input
              id="collection-search"
              bind:this={searchInput}
              bind:value={searchQuery}
              type="text"
              placeholder="Search for books, products, events, businesses..."
              autocomplete="off"
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
            type="submit"
            class="btn-primary"
            disabled={isLoading}
          >
            <Search class="w-5 h-5" />
            {isLoading ? 'Searching…' : 'Search'}
          </button>
        </div>
      </form>
    </div>
  </div>
</section>

<!-- Results Section -->
<section class="section bg-background">
  <div class="container mx-auto px-4">
    <div class="max-w-6xl mx-auto" aria-busy={isLoading}>
      {#if searchQuery}
        <!-- Results Header -->
        <div class="mb-7 flex items-center justify-between flex-wrap gap-3">
          <h2 class="text-2xl font-bold" aria-live="polite">
            {#if searchStatus === 'error'}
              Search unavailable
            {:else if hasResults}
              {#if pagination.hasMore}
                Showing <span class="text-primary">{results.length}</span> results for "{searchQuery}"
              {:else}
                Found <span class="text-primary">{pagination.totalDocs ?? results.length}</span> result{(pagination.totalDocs ?? results.length) === 1 ? '' : 's'} for "{searchQuery}"
              {/if}
              {#if typeFilter !== 'all'}
                <span class="text-muted-foreground font-normal">in {availableTypes.find((t: any) => t.value === typeFilter)?.label || typeFilter}</span>
              {/if}
            {:else if isLoading}
              Searching for "{searchQuery}"…
            {:else}
              No results found for "{searchQuery}"
            {/if}
          </h2>
        </div>

        {#if isLoading}
          <div class="rounded-2xl border border-border bg-muted/20 px-6 py-14 text-center" role="status" aria-live="polite">
            <div class="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-4 border-primary/20 border-t-primary"></div>
            <p class="text-lg font-medium text-foreground">Searching the collection…</p>
            <p class="mt-1 text-muted-foreground">Matching books, products, and local resources.</p>
          </div>
        {:else if searchStatus === 'error'}
          <div class="rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-14 text-center" role="alert">
            <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <RotateCcw class="h-8 w-8 text-destructive" />
            </div>
            <p class="text-lg font-medium text-foreground">We couldn’t complete that search.</p>
            <p class="mt-2 mb-6 text-muted-foreground">Your search is still here. Please try again in a moment.</p>
            <button type="button" class="btn-outline btn-sm" onclick={handleSearch}>
              <RotateCcw class="h-4 w-4" />
              Try again
            </button>
          </div>
        {:else if hasResults}
          <div class="grid grid-cols-1 gap-3 mb-8 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
            {#each results as result}
              <a
                href={result.url}
                class="group card-modern flex items-center gap-4 p-3 md:block md:p-0"
                onclick={() => trackEvent('search_result_click', {
                  query: searchQuery,
                  result_type: result.type,
                  result_title: result.title,
                  result_url: result.url,
                })}
              >
                <div class="relative h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-muted md:h-auto md:w-auto md:rounded-none {result.type === 'books' ? 'md:aspect-[2/3] md:bg-muted/70 md:p-3' : 'md:aspect-[4/3]'}">
                  {#if isString(result.image)}
                    <img src={result.image} alt={result.title} class="h-full w-full {result.type === 'books' ? 'object-contain' : 'object-cover'} transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                  {:else if result.image?.[0] || result.image?.url}
                    <PayloadImage
                      image={Array.isArray(result.image) ? result.image[0] : result.image}
                      alt={result.title}
                      maxWidth={400}
                      class="h-full w-full {result.type === 'books' ? 'object-contain' : 'object-cover'} transition-transform duration-500 group-hover:scale-105"
                    />
                  {:else}
                    <div class="flex h-full w-full items-center justify-center text-center text-xs text-muted-foreground">No image</div>
                  {/if}
                  <span class="absolute top-3 left-3 badge-primary uppercase">
                    {typeLabel(result.type)}
                  </span>
                </div>
                <div class="min-w-0 flex-1 space-y-1.5 p-0 md:p-5 md:space-y-2">
                  <h3 class="text-base font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 md:text-lg">
                    {result.title}
                  </h3>
                  {#if result.author}
                    <p class="text-sm text-muted-foreground">by {result.author}</p>
                  {/if}
                  {#if resultDescription(result) && result.type !== 'books'}
                    <p class="text-sm text-muted-foreground line-clamp-2">{resultDescription(result)}</p>
                  {:else if result.type === 'books' && bookMeta(result).length > 0}
                    <p class="text-xs text-muted-foreground">{bookMeta(result).join(' · ')}</p>
                  {/if}
                  {#if result.price}
                    <p class="text-base font-bold text-primary">{formatCurrency(result.price)}</p>
                  {/if}
                </div>
              </a>
            {/each}
          </div>
          {#if pagination.hasMore}
            <div class="mb-8 flex justify-center">
              <button type="button" class="btn-outline" onclick={loadMore} disabled={isLoading}>
                {isLoading ? 'Loading…' : 'Show more results'}
                <ArrowRight class="h-4 w-4" />
              </button>
            </div>
          {/if}
        {:else}
          <!-- No Results -->
          <div class="text-center py-16 bg-muted/30 rounded-2xl">
            <div class="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Search class="w-8 h-8 text-muted-foreground" />
            </div>
            <p class="text-foreground text-lg mb-2">No results found for “{searchQuery}”.</p>
            <p class="text-muted-foreground mb-6">Try a broader keyword or browse a collection:</p>
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
