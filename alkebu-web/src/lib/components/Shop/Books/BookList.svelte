<script lang="ts">
  import ProductCard from '$lib/components/Shop/ProductCard.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { Search } from 'lucide-svelte';
  import FeaturedBar from '$lib/components/Shop/FeaturedBar.svelte';

  interface Props {
    books?: any[];
    categories?: any[];
    currentPage?: number;
    totalDocs?: number;
    totalPages?: number;
    pageSize?: number;
    sort?: string;
    currentCategory?: string;
  }

  let {
    books = [],
    categories = [],
    currentPage = 1,
    totalDocs = 0,
    totalPages = 1,
    pageSize = 12,
    sort = 'newest',
    currentCategory = '',
  }: Props = $props();

  const sortOptions = [
    { value: 'title-asc', label: 'Title A-Z' },
    { value: 'title-desc', label: 'Title Z-A' },
    { value: 'newest', label: 'Recently Added' },
    { value: 'oldest', label: 'Oldest First' }
  ];

  const startIdx = $derived(Math.min((currentPage - 1) * pageSize + 1, Math.max(totalDocs, 1)));
  const endIdx = $derived(Math.min(currentPage * pageSize, totalDocs));

  const buildHref = (targetPage: number) => {
    const params = new URLSearchParams($page.url.searchParams);
    params.set('p', targetPage.toString());
    if (sort) params.set('sort', sort);
    if (currentCategory) params.set('category', currentCategory);
    return `${$page.url.pathname}?${params.toString()}#productList`;
  };

  const navigate = async (targetPage: number) => {
    await goto(buildHref(targetPage), { replaceState: false, invalidateAll: true });
    // Scroll to product list after navigation
    const productList = document.getElementById('productList');
    if (productList) {
      productList.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  function handleSortChange(event: Event) {
    const nextSort = (event.target as HTMLSelectElement).value;
    const params = new URLSearchParams($page.url.searchParams);
    params.set('sort', nextSort);
    params.set('p', '1');
    goto(`${$page.url.pathname}?${params.toString()}#productList`);
  }

  function handlePageSizeChange(event: Event) {
    const nextPageSize = (event.target as HTMLSelectElement).value;
    const params = new URLSearchParams($page.url.searchParams);
    params.set('limit', nextPageSize);
    params.set('p', '1'); // Reset to first page when changing page size
    goto(`${$page.url.pathname}?${params.toString()}#productList`, { invalidateAll: true });
  }
</script>

<div class="container w-full mx-12 px-12">
  <div class="flex flex-col md:flex-row gap-3">
    <div class="basis-1 md:basis-1/2 lg:basis-1/4">
      <div class="sidebar-wrapper style2">
        <div class="single-sidebar wow fadeInUp animated" data-wow-delay="0.1s" data-wow-duration="1200ms">
          <div class="sidebar-search-box">
            <form class="search-form" action="/search" method="GET">
              <input placeholder="Search" type="search" name="q" />
              <button type="submit">
                <Search size="24" />
              </button>
            </form>
          </div>
        </div>

        <div class="single-sidebar wow fadeInUp animated" data-wow-delay="0.3s" data-wow-duration="1200ms">
          <div class="categories-box">
            <div class="title">
              <h3>Genres</h3>
            </div>
            <ul class="categories clearfix">
              {#if categories.length === 0}
                <li class="text-sm text-gray-500">No genres available</li>
              {:else}
                {#each categories as category}
                  <li>
                    <a href={`/shop/books/genres/${category.slug}`}>
                      {category.name}
                    </a>
                  </li>
                {/each}
              {/if}
            </ul>
          </div>
        </div>

        <FeaturedBar featured={books.slice(0, 4)} />
      </div>
    </div>

    <div class="basis-1 lg:basis-3/4">
      <div class="product-items">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4">
          <div class="showing" id="productList">
            <p>Showing products {startIdx}-{endIdx} of {totalDocs} Results</p>
          </div>
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2">
              <label class="text-sm font-medium whitespace-nowrap" for="page-size-select">Per page:</label>
              <select id="page-size-select" class="border px-3 py-2 rounded" value={pageSize} onchange={handlePageSizeChange}>
                <option value="12" selected={pageSize === 12}>12</option>
                <option value="25" selected={pageSize === 25}>25</option>
                <option value="100" selected={pageSize === 100}>100</option>
              </select>
            </div>
            <div class="flex items-center gap-2">
              <label class="text-sm font-medium whitespace-nowrap" for="sort-select">Sort by:</label>
              <select id="sort-select" class="border px-3 py-2 rounded" value={sort} onchange={handleSortChange}>
                {#each sortOptions as option}
                  <option value={option.value} selected={option.value === sort}>{option.label}</option>
                {/each}
              </select>
            </div>
          </div>
        </div>

        <div class="all_products">
          {#if books.length === 0}
            <div class="flex flex-col items-center text-center py-16 px-4">
              <i class="far fa-book-open text-5xl text-primary/40 mb-4" aria-hidden="true"></i>
              <h3 class="text-xl font-bold text-foreground mb-2">No books found here</h3>
              <p class="text-muted-foreground max-w-md mb-6">
                We couldn't find any titles matching this selection. Try a different
                category or filter, or browse the full catalog.
              </p>
              <a href="/shop/books" class="btn-primary">Browse all books</a>
            </div>
          {:else}
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {#each books as book}
                <ProductCard product={book} productType="books" basePath="/shop/books" />
              {/each}
            </div>
          {/if}
        </div>

        <Pagination {currentPage} {totalPages} {buildHref} onnavigate={navigate} />
      </div>
    </div>
  </div>
</div>
