<script>
    import ProductCard from '$lib/components/Shop/ProductCard.svelte'
    import Pagination from '$lib/components/Pagination.svelte'
    import Select from 'svelte-select'
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { Search } from 'lucide-svelte'
    import FeaturedBar from '$lib/components/Shop/FeaturedBar.svelte'

    /**
     * @typedef {Object} Props
     * @property {any} featured
     * @property {any} products
     * @property {any} currentPage
     * @property {any} prodCount
     * @property {any} pageCount
     * @property {any} categories
     * @property {any} sort
     * @property {number} [perPage]
     */

    /** @type {Props} */
    let {
        featured,
        products,
        currentPage,
        prodCount,
        pageCount,
        categories,
        sort = $bindable(),
        perPage = 12
    } = $props();
    let sortQuery = sort.length ? `sort=${sort}&` : ''
    let sortElements = [
        {value: 'name', label: 'Title A-Z'},
        {value: '-name', label: 'Title Z-A'},
        {value: '-createdAt', label: 'Recently Added'},
        {value: '-updatedAt', label: 'Recently Updated'},
        {value: 'price', label: 'Lowest Price'},
        {value: '-price', label: 'Highest Price'},
        {value: '-isFeatured', label: 'Featured Products'}
    ]

    function handleSelect(event) {
        sort = event.detail.value
        let href = $page.url.pathname + '?sort=' + sort + '&p=1#productList'
        goto(href)
    }
</script>
    
<div class="container w-full mx-auto px-4 md:px-8 lg:px-12">
    <div class="flex flex-col md:flex-row gap-3">
        <div class="basis-1 md:basis-1/2 lg:basis-1/4">
            <div class="sidebar-wrapper style2">
                <!--Start single sidebar-->
                <div class="single-sidebar wow fadeInUp animated" data-wow-delay="0.1s"
                    data-wow-duration="1200ms">
                    <div class="sidebar-search-box">
                        <form class="search-form" action="/search" method="GET">
                            <input placeholder="Search" type="search" name="q" >
                            <button type="submit">
                                <Search size="24" />
                            </button>
                        </form>
                    </div>
                </div>
                <!--End single sidebar-->
                <!--Start sidebar categories Box-->
                <!-- <div class="price_sidebar wow fadeInUp animated" data-wow-delay="0.3s"
                    data-wow-duration="1200ms">
                    <h3>Price</h3>
                    <div class="price-ranger">
                        <div id="slider-range"></div>
                        <div class="ranger-min-max-block">
                            <input type="text" readonly class="min">
                            <span>-</span>
                            <input type="text" readonly class="max">
                            <input type="submit" value="Filter">
                        </div>
                    </div>
                </div> -->
                <!--End sidebar categories Box-->
                <!--Start sidebar categories Box-->
                <div class="single-sidebar wow fadeInUp animated" data-wow-delay="0.3s"
                    data-wow-duration="1200ms">
                    <div class="categories-box">
                        <div class="title">
                            <h3>Categories</h3>
                        </div>
                        <ul class="categories clearfix">
                        {#each categories as category}
                            <li><a href="/shop/apparel/categories/{category.slug?.current || category.slug}/">{category.name}</a></li>
                        {/each}
                        </ul>
                    </div>
                </div>
                <!--End sidebar categories Box-->
                <!--Start single sidebar-->
                <FeaturedBar {featured}/>
                <!--End single sidebar-->

            </div>
        </div>
        <!--End Sidebar Wrapper-->
        <div class="basis-1 lg:basis-3/4">
            <div class="product-items">
                <div class="flex">
                        <div class="showing-result-shorting w-full">
                            <div class="left">
                                <div class="showing" id="productList">
                                    <p>Showing products {(currentPage-1)*perPage+1}-{Math.min(currentPage *perPage, prodCount)} of {prodCount} Results</p>
                                </div>
                            </div>
                            <div class="right">
                                <div class="shorting">
                                    <div class='dropdown bootstrap-select'>
                                        <Select items={sortElements}  placeholder="Sort results by:" showChevron={true} onselect={handleSelect}/>
                                    </div>
                                </div>
                            </div>
                        </div>
                </div>
        <div class="all_products">
            {#if products.length === 0}
                <div class="flex flex-col items-center text-center py-16 px-4">
                    <i class="far fa-shirt text-5xl text-primary/40 mb-4" aria-hidden="true"></i>
                    <h3 class="text-xl font-bold text-foreground mb-2">Nothing here yet</h3>
                    <p class="text-muted-foreground max-w-md mb-6">
                        We couldn't find any items matching this selection. Try a
                        different category or browse the full apparel &amp; jewelry collection.
                    </p>
                    <a href="/shop/apparel" class="btn-primary">Browse all apparel</a>
                </div>
            {:else}
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {#each products as product}
                        <ProductCard product={product} productType="fashion-jewelry" basePath="/shop/apparel" />
                    {/each}
                </div>
            {/if}
        </div>
        <Pagination
            currentPage={Number(currentPage)}
            totalPages={Number(pageCount)}
            buildHref={(p) => `${$page.url.pathname}?${sortQuery}p=${p}#productList`}
        />
    </div>
</div>
</div> 
</div>

<style>
    .dropdown{
        padding-top: 10px; 
        --indicatorTop: 2px;
        --clearSelectTop: 2px;
        --borderFocusColor: hsl(var(--primary));
        --itemHoverBG: hsl(var(--muted))
    }
    
    
</style>
