<script>
    import BookList from "$lib/components/Shop/Books/BookList.svelte";
    import { urlFor } from "$lib/payload";
    import Meta from "$lib/components/Meta.svelte";

    let { data } = $props();

    // Use $derived to make these reactive to data changes
    const settings = $derived(data.settings || {});
    const products = $derived(data.products || []);
    const pagination = $derived(
        data.pagination || { page: 1, totalPages: 1, totalDocs: 0, limit: 24 },
    );
    const currentPage = $derived(pagination.page || 1);
    const pageSize = $derived(pagination.limit || 24);
    const totalDocs = $derived(pagination.totalDocs || 0);
    const categories = $derived(data.categories || []);
    const sort = $derived(data.sort || "newest");
    const currentCategory = $derived(data.currentCategory || "");

    const bannerUrl = $derived(
        settings?.banner
            ? urlFor(settings.banner)
                  .width(1920)
                  .height(300)
                  .auto("format")
                  .url()
            : "",
    );
    const metadata = $derived(
        data.seo || {
            title: "Books | Alkebu-Lan Images",
            description:
                "Browse our catalog of books from Black authors and about Black stories.",
            url: "/shop/books",
        },
    );
</script>

<Meta {metadata} />

<section class="page-header-modern">
    <div class="container mx-auto px-4">
        <nav class="flex items-center gap-2 text-sm text-white/80 mb-4">
            <a href="/" class="hover:text-white transition-colors">Home</a>
            <span class="text-white/60">›</span>
            <a href="/shop/" class="hover:text-white transition-colors">Shop</a>
            <span class="text-white/60">›</span>
            <span class="text-white font-medium">Books</span>
        </nav>
        <h1 class="text-3xl md:text-4xl font-bold font-display">
            Book Catalogue
        </h1>
    </div>
</section>

<section class="container product mx-auto">
    <BookList
        books={products}
        {categories}
        {totalDocs}
        totalPages={pagination.totalPages || 1}
        {currentPage}
        {pageSize}
        {sort}
        {currentCategory}
    />
</section>
