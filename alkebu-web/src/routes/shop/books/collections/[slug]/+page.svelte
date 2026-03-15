<script>
    import BookList from '$lib/components/Shop/Books/BookList.svelte'
    import Meta from '$lib/components/Meta.svelte'
    import { page } from '$app/stores'
    import { bookGenres } from '$lib/data/catalog';

    let { data } = $props();

    const collection = $derived(data.collection || {});
    const books = $derived(data.books || []);
    const pagination = $derived(data.pagination || { page: 1, totalPages: 1, totalDocs: books.length, limit: 24 });
    const currentPage = $derived(pagination.page || 1);
    const pageSize = $derived(pagination.limit || 24);
    const totalDocs = $derived(pagination.totalDocs || books.length);
    const sort = $derived(data.currentSort || 'newest');
    const slug = $derived($page.params.slug);

    const baseURL = $derived(`/shop/books/collections/${slug}/`);
    const metaURL = $derived(currentPage > 1 ? `${baseURL}?p=${currentPage}` : baseURL);
    const metaImg = "https://cdn.sanity.io/images/nrl6nc45/production/87f3a18c04e9e50a99b0e4e46b0e08a0e9c0ae57-4160x2340.jpg?&w=400&h=300&auto=format";
    const thisPage = $derived(currentPage > 1 ? `| Page ${currentPage} ` : '');
    const metadata = $derived.by(() => data.seo || {
		title: `Collection: ${collection?.name || 'Books'} ${thisPage}| Alkebu-Lan Images`,
        description: `A curated selection of books from the collection ${collection?.name || 'Books'}.`,
		image: metaImg,
		imageAlt: 'bookshelf',
        url: metaURL,
    });
</script>

<Meta {metadata}/>

<section class="page-header">
    <div class="container">
        <h2><small>Collection:</small><br>{collection?.name || 'Books'}</h2>
        <ul class="flex items-center gap-2 text-sm text-white/80">
            <li><a href="/shop/">Shop</a></li>
            <li><a href="/shop/books/" class="shop_style">Books</a></li>
            <li><span>Collections</span></li>
        </ul>
    </div>
</section>

<section class="product mx-auto">
    <BookList
        {books}
        categories={bookGenres}
        totalDocs={totalDocs}
        totalPages={pagination.totalPages || 1}
        {currentPage}
        pageSize={pageSize}
        {sort}
        currentCategory=""
    />
</section>
