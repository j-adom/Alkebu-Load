<script lang="ts">
  import Meta from '$lib/components/Meta.svelte';
  import BookList from '$lib/components/Shop/Books/BookList.svelte';

  let { data } = $props();

  const author = $derived(data.author);
  const books = $derived(data.books || []);
  const pagination = $derived.by(() => data.pagination || { page: 1, totalPages: 1, totalDocs: books.length, limit: 24 });
  const currentPage = $derived(pagination.page || 1);
  const pageSize = $derived(pagination.limit || 24);
  const totalDocs = $derived(pagination.totalDocs || books.length);
  const sort = $derived(data.currentSort || 'newest');

  const metadata = $derived.by(() => data.seo || {
    title: `Books by ${author?.name || 'Author'}`,
    description: `Explore titles by ${author?.name || 'this author'}.`,
    url: `/shop/books/authors/${author?.slug || ''}`
  });
</script>

<Meta {metadata} />

<section class="page-header">
  <div class="container">
    <h2><small>Author:</small><br>{author?.name}</h2>
    <ul class="flex items-center gap-2 text-sm text-white/80">
      <li><a href="/shop/">Shop</a></li>
      <li><a href="/shop/books/" class="shop_style">Books</a></li>
      <li><span>Authors</span></li>
    </ul>
  </div>
</section>

<section class="product mx-auto">
  <BookList
    books={books}
    categories={[]} 
    totalDocs={totalDocs}
    totalPages={pagination.totalPages || 1}
    currentPage={currentPage}
    pageSize={pageSize}
    sort={sort}
    currentCategory={''}
  />
</section>
