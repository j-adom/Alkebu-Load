<script>
    import BookList from '$lib/components/Shop/Books/BookList.svelte'
    import Meta from '$lib/components/Meta.svelte'
    import { urlFor } from '$lib/payload';

    let { data } = $props();

    // Use $derived to make these reactive to data changes
    const genre = $derived(data.genre);
    const books = $derived(data.books || []);
    const pagination = $derived(data.pagination || { page: 1, totalPages: 1, totalDocs: 0, limit: 24 });
    const currentPage = $derived(pagination.page || 1);
    const pageSize = $derived(pagination.limit || 24);
    const totalDocs = $derived(pagination.totalDocs || 0);
    const categories = $derived(data.categories || []);
    const sort = $derived(data.currentSort || 'newest');
    const settings = $derived(data.settings || {});

    const bannerUrl = $derived(settings?.banner ? urlFor(settings.banner).width(1920).height(300).auto('format').url() : '');
    const metadata = $derived(data.seo || {
        title: `${genre?.name || 'Genre'} Books | Alkebu-Lan Images`,
        description: `Explore our collection of ${genre?.name || 'genre'} books`,
        url: `/shop/books/genres/${genre?.slug || ''}`
    });
</script>

<Meta {metadata}/>

<section class="page-header" style={bannerUrl ? `background-image: url(${bannerUrl});` : ''}>
    <div class="container">
        <h2><small>Genre:</small><br>{genre?.name || 'Books'}</h2>
        <ul class="flex items-center gap-2 text-sm text-white/80">
            <li><a href="/">Home</a></li>
            <li><a href="/shop/">Shop</a></li>
            <li><a href="/shop/books/" class="shop_style">Books</a></li>
            <li><span>{genre?.name || 'Genre'}</span></li>
        </ul>
    </div>
</section>

<section class="container product mx-auto">
    <BookList
        books={books}
        categories={categories}
        totalDocs={totalDocs}
        totalPages={pagination.totalPages || 1}
        currentPage={currentPage}
        pageSize={pageSize}
        sort={sort}
        currentCategory=""
    />
</section>