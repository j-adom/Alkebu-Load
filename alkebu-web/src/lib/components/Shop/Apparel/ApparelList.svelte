<script>
    import ApparelCard from './ApparelCard.svelte'
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

    console.log(products);
    

    const numArray = [1,2,3,4,5]
    let range = $derived(pageCount < 6 ? [...Array(pageCount).keys()].map(i=>i+1)
                :currentPage < 3 ? numArray.map(num => num += 1)
                : currentPage > (pageCount - 3) ? numArray.map(num => (pageCount - 6) + num ) 
                : numArray.map(num => num += (currentPage -3 ))) 

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
    
<div class="container w-full mx-12 px-12">
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
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {#each products as product}
                    <ApparelCard {product} />
                {/each}
            </div>
        </div>
        {#if prodCount >= perPage}
            <nav aria-label="Page navigation example">
                <ul class="flex justify-end rounded-sm list-none">
                    <li class="page-item" class:d-none="{currentPage <= 1}">
                        <a rel=prefetch class="page-link" href="{$page.url.pathname}?{sortQuery}p={currentPage - 1}#productList" tabindex="-1">Previous</a>
                    </li>
                    {#if pageCount > 6} 
                        <li class="page-item" class:disabled="{currentPage === 1}">
                            <a rel=prefetch class="page-link" href="{$page.url.pathname}?{sortQuery}p=1#productList" tabindex="-1">1</a>
                        </li> 
                        {#if range[0] > 2}
                            <p>...</p>
                        {/if}  
                    {/if}
                    {#each range as pageNum}
                            <li class="page-item" class:disabled="{currentPage === pageNum}">
                                <a rel=prefetch class="page-link" href="{$page.url.pathname}?{sortQuery}p={pageNum}#productList">
                                    {pageNum}
                                </a>
                            </li>
                    {/each}
                    {#if pageCount > 6}
                        {#if range[4] < (pageCount -1)}
                            <p>...</p>
                        {/if}  
                        <li class="page-item" class:disabled="{currentPage === pageCount}">
                            <a rel=prefetch class="page-link" href="{$page.url.pathname}?{sortQuery}p={pageCount}#productList" tabindex="-1">{pageCount}</a>
                        </li>
                    {/if}
                    <li class="page-item" class:d-none="{currentPage == pageCount}">
                        <a rel=prefetch class="page-link" href="{$page.url.pathname}?{sortQuery}p={currentPage + 1}#productList">Next</a>
                    </li>
                </ul>
            </nav>
        {/if}
    </div>
</div>
</div> 
</div>

<style>
    
    .page-link {
        color: var(--thm-primary)
    }
    .disabled a, .page-link:hover{
        background-color: var(--thm-primary);
        color: var(--thm-base)
        
    }
    .dropdown{
        padding-top: 10px; 
        --indicatorTop: 2px;
        --clearSelectTop: 2px;
        --borderFocusColor: var(--thm-primary);
        --itemHoverBG: var(--thm-base)
    }
    
    
</style>