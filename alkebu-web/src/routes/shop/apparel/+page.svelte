<script>
    import ApparelList from "$lib/components/Shop/Apparel/ApparelList.svelte";
    import { urlFor } from "$lib/payload";

    import { page } from "$app/stores";
    import Meta from "$lib/components/Meta.svelte";

    let { data } = $props();
    const settings = data.settings;

    const { prodCount, products, categories, featured } = data.prods;

    let perPage = 12;
    let pageCount = $state(Math.ceil(prodCount / perPage));

    // @ts-ignore
    let currentPage = $derived(parseInt($page.url.searchParams.get("p")) || 1);

    let sort = $page.url.searchParams.get("sort") || "";

    let baseURL = `/shop/apparel/`;
    let metaURL = currentPage > 1 ? baseURL + "?p=" + currentPage : baseURL;
    let metaImg =
        "https://cdn.sanity.io/images/nrl6nc45/production/25b2b2cfb677a7b6f7deb6b83ab4775c9a17053d-4160x2340.jpg?&w=400&h=300&auto=format";

    let thisPage = currentPage > 1 ? `| Page ${currentPage} ` : "";

    const metadata = {
        title: `Book Catalogue ${thisPage}| Alkebu-Lan Images`,
        description: `Check out our range of Apparel promoting pan-African culture and positivity`,
        image: metaImg,
        imageAlt: "Alkebu-Lan Images T-Shirts",
        url: metaURL,
    };
</script>

<Meta {metadata} />

<section class="page-header-modern">
    <div class="container mx-auto px-4">
        <nav class="flex items-center gap-2 text-sm text-white/80 mb-4">
            <a href="/" class="hover:text-white transition-colors">Home</a>
            <span class="text-white/60">›</span>
            <a href="/shop/" class="hover:text-white transition-colors">Shop</a>
            <span class="text-white/60">›</span>
            <span class="text-white font-medium">Apparel</span>
        </nav>
        <h1 class="text-3xl md:text-4xl font-bold font-display">
            Clothing Rack
        </h1>
    </div>
</section>

<section class="product">
    <ApparelList
        {products}
        {prodCount}
        {categories}
        {featured}
        {sort}
        {currentPage}
        {perPage}
    />
</section>
