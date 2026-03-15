<script lang="ts">
  import BookDetailPage from '$lib/components/Shop/Books/BookDetailPage.svelte';

  let { data } = $props();
  const book = $derived(data.book);
  const seo = $derived(data.seo);
  const settings = $derived(data.settings);
  const relatedBooks = $derived(data.relatedBooks || []);
  const booksByAuthor = $derived(data.booksByAuthor || []);
</script>

<BookDetailPage {book} {seo} {settings} {relatedBooks} {booksByAuthor} />
