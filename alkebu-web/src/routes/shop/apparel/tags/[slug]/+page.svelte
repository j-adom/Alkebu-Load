<script lang="ts">
    import { page } from '$app/stores';
    import PayloadImage from '$lib/components/PayloadImage.svelte';
    import ApparelCard from '$lib/components/Shop/Apparel/ApparelCard.svelte';
    import { Search } from 'lucide-svelte';

    let { data } = $props();
    
    let { tag, products, pagination, currentSort, seo } = $derived(data);
    
    const sortOptions = [
        { value: '-createdAt', label: 'Newest' },
        { value: 'createdAt', label: 'Oldest' },
        { value: 'title', label: 'Name A-Z' },
        { value: '-title', label: 'Name Z-A' },
        { value: 'pricing.basePrice', label: 'Price: Low to High' },
        { value: '-pricing.basePrice', label: 'Price: High to Low' }
    ];

    function updateSort(newSort: string) {
        const url = new URL($page.url);
        if (newSort === '-createdAt') {
            url.searchParams.delete('sort');
        } else {
            url.searchParams.set('sort', newSort);
        }
        url.searchParams.delete('p'); // Reset to page 1 when changing sort
        window.location.href = url.toString();
    }

    function goToPage(pageNum: number) {
        const url = new URL($page.url);
        if (pageNum === 1) {
            url.searchParams.delete('p');
        } else {
            url.searchParams.set('p', pageNum.toString());
        }
        window.location.href = url.toString();
    }
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

<!-- Page Header -->
<section class="page-header">
    <div class="container">
        <div class="row">
            <div class="col-12">
                <h1>Apparel Tagged: {tag?.name || 'Tag'}</h1>
                {#if tag?.description}
                    <p class="lead">{tag.description}</p>
                {/if}
                <nav aria-label="breadcrumb">
                    <ol class="breadcrumb">
                        <li class="breadcrumb-item"><a href="/">Home</a></li>
                        <li class="breadcrumb-item"><a href="/shop">Shop</a></li>
                        <li class="breadcrumb-item"><a href="/shop/apparel">Apparel</a></li>
                        <li class="breadcrumb-item"><a href="/shop/apparel/tags">Tags</a></li>
                        <li class="breadcrumb-item active" aria-current="page">{tag?.name}</li>
                    </ol>
                </nav>
            </div>
        </div>
    </div>
</section>

<!-- Products Section -->
<section class="products-section py-5">
    <div class="container">
        <!-- Filter Bar -->
        <div class="row mb-4">
            <div class="col-md-6">
                <p class="text-muted mb-0">
                    Showing {((pagination.page - 1) * 24) + 1}-{Math.min(pagination.page * 24, pagination.totalDocs)} 
                    of {pagination.totalDocs} items
                </p>
            </div>
            <div class="col-md-6">
                <div class="d-flex justify-content-end align-items-center">
                    <label for="sort-select" class="me-2">Sort by:</label>
                    <select 
                        id="sort-select" 
                        class="form-select form-select-sm" 
                        style="width: auto;"
                        value={currentSort}
                        onchange={(e) => updateSort(e.target.value)}
                    >
                        {#each sortOptions as option}
                            <option value={option.value}>{option.label}</option>
                        {/each}
                    </select>
                </div>
            </div>
        </div>

        <!-- Products Grid -->
        {#if products.length > 0}
            <div class="row">
                {#each products as product}
                    <div class="col-lg-3 col-md-4 col-sm-6 mb-4">
                        <ApparelCard {product} />
                    </div>
                {/each}
            </div>

            <!-- Pagination -->
            {#if pagination.totalPages > 1}
                <div class="row mt-5">
                    <div class="col-12">
                        <nav aria-label="Page navigation">
                            <ul class="pagination justify-content-center">
                                {#if pagination.hasPrevPage}
                                    <li class="page-item">
                                        <button 
                                            class="page-link" 
                                            onclick={() => goToPage(pagination.page - 1)}
                                        >
                                            Previous
                                        </button>
                                    </li>
                                {/if}

                                {#each Array(Math.min(5, pagination.totalPages)) as _, i}
                                    {@const pageNum = Math.max(1, pagination.page - 2) + i}
                                    {#if pageNum <= pagination.totalPages}
                                        <li class="page-item {pageNum === pagination.page ? 'active' : ''}">
                                            <button 
                                                class="page-link" 
                                                onclick={() => goToPage(pageNum)}
                                            >
                                                {pageNum}
                                            </button>
                                        </li>
                                    {/if}
                                {/each}

                                {#if pagination.hasNextPage}
                                    <li class="page-item">
                                        <button 
                                            class="page-link" 
                                            onclick={() => goToPage(pagination.page + 1)}
                                        >
                                            Next
                                        </button>
                                    </li>
                                {/if}
                            </ul>
                        </nav>
                    </div>
                </div>
            {/if}
        {:else}
            <div class="row">
                <div class="col-12 text-center py-5">
                    <div class="no-products">
                        <Search size="48" class="text-muted mb-3" />
                        <h3>No apparel found</h3>
                        <p class="text-muted">No apparel items found with the tag "{tag?.name}".</p>
                        <a href="/shop/apparel" class="btn btn-primary">Browse All Apparel</a>
                    </div>
                </div>
            </div>
        {/if}
    </div>
</section>

<style>
    .page-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 4rem 0 2rem;
    }
    
    .breadcrumb {
        background: transparent;
        margin: 0;
    }
    
    .breadcrumb-item a {
        color: rgba(255,255,255,0.8);
        text-decoration: none;
    }
    
    .breadcrumb-item a:hover {
        color: white;
    }
    
    .breadcrumb-item.active {
        color: rgba(255,255,255,0.9);
    }
    
    .no-products {
        padding: 3rem 1rem;
    }
    
    .page-link {
        border: none;
        background: none;
        color: #667eea;
    }
    
    .page-link:hover {
        background-color: #f8f9fa;
        color: #5a6fd8;
    }
    
    .page-item.active .page-link {
        background-color: #667eea;
        border-color: #667eea;
        color: white;
    }
</style>