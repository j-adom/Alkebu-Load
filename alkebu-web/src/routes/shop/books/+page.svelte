<script>
    import BookList from '$lib/components/Shop/Books/BookList.svelte';
    import { urlFor } from '$lib/payload';
    import Meta from '$lib/components/Meta.svelte';

    let { data } = $props();

    // Use $derived to make these reactive to data changes
    const settings = $derived(data.settings || {});
    const products = $derived(data.products || []);
    const pagination = $derived(data.pagination || { page: 1, totalPages: 1, totalDocs: 0, limit: 24 });
    const currentPage = $derived(pagination.page || 1);
    const pageSize = $derived(pagination.limit || 24);
    const totalDocs = $derived(pagination.totalDocs || 0);
    const categories = $derived(data.categories || []);
    const sort = $derived(data.sort || 'newest');
    const currentCategory = $derived(data.currentCategory || '');

    const bannerUrl = $derived(settings?.banner ? urlFor(settings.banner).width(1920).height(300).auto('format').url() : '');
    const metadata = $derived(data.seo || {
        title: 'Books | Alkebu-Lan Images',
        description: 'Browse our catalog of books from Black authors and about Black stories.',
        url: '/shop/books'
    });
</script>

<Meta {metadata} />

<section class="page-header" style={bannerUrl ? `background-image: url(${bannerUrl});` : ''}>
    <div class="container">
        <h2>Book Catalogue</h2>
        <ul class="thm-breadcrumb list-unstyled">
            <li><a href="/">Home</a></li>
            <li><a href="/shop/" class="shop_style">Shop</a></li>
            <li><span>Books</span></li>
        </ul>
    </div>
</section>

<section class="container product mx-auto">
    <BookList 
        books={products} 
        categories={categories} 
        totalDocs={totalDocs} 
        totalPages={pagination.totalPages || 1} 
        currentPage={currentPage} 
        pageSize={pageSize}
        sort={sort}
        currentCategory={currentCategory}
    />
</section>
