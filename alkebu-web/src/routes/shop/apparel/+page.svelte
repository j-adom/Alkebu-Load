<script>
    import ApparelList from '$lib/components/Shop/Apparel/ApparelList.svelte'
    import { urlFor } from '$lib/payload';


    import { page } from '$app/stores'
    import Meta from '$lib/components/Meta.svelte'

   let { data } = $props();
    const settings = data.settings

	const {prodCount, products, categories, featured} = data.prods

	let perPage = 12;
    let pageCount = $state(Math.ceil(prodCount/perPage))

   // @ts-ignore
     let currentPage = $derived(parseInt($page.url.searchParams.get('p')) || 1)
    
    let sort = $page.url.searchParams.get('sort') || ''

    let baseURL = `/shop/apparel/`
    let metaURL = currentPage > 1 ? baseURL + '?p=' + currentPage  
                :  baseURL 
    let metaImg ="https://cdn.sanity.io/images/nrl6nc45/production/25b2b2cfb677a7b6f7deb6b83ab4775c9a17053d-4160x2340.jpg?&w=400&h=300&auto=format"

    let thisPage = currentPage > 1 ? `| Page ${currentPage} ` : ''

    const metadata = {
		title: `Book Catalogue ${thisPage}| Alkebu-Lan Images`,
		description: `Check out our range of Apparel promoting pan-African culture and positivity`,
		image: metaImg,
		imageAlt: 'Alkebu-Lan Images T-Shirts',
		url: metaURL
    }
</script>

<Meta {metadata} />

<section class="page-header" style="background-image: url({urlFor(settings.banner).width(1920).height(300).auto('format').url()});">
    <div class="container">
        <h2>Clothing Rack</h2>
        <ul class="thm-breadcrumb list-unstyled">
            <li><a href="/">Home</a></li>
            <li><a href="/shop/" class="shop_style">Shop</a></li>
            <li><span>Apparel</span></li>
        </ul>
    </div>
</section>

<section class="product">
    <ApparelList {products} {prodCount} {categories} {featured} {sort} {currentPage} {perPage} />
</section>