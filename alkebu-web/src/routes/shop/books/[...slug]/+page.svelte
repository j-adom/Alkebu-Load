<script lang="ts">
  import BookDetailPage from '$lib/components/Shop/Books/BookDetailPage.svelte';

  let { data } = $props();
  const book = $derived(data.book);
  const seo = $derived(data.seo);
  const settings = $derived(data.settings);
  const booksByAuthor = $derived(data.booksByAuthor || []);
  const relatedBooks = $derived(data.relatedBooks || []);
</script>

<BookDetailPage {book} {seo} {settings} {booksByAuthor} {relatedBooks} />
