<script lang="ts">
  import BookDetailPage from '$lib/components/Shop/Books/BookDetailPage.svelte';

  let { data } = $props();
  const book = data.book;
  const seo = data.seo;
  const settings = data.settings;
  const booksByAuthor = data.booksByAuthor || [];
  const relatedBooks = data.relatedBooks || [];
</script>

<BookDetailPage {book} {seo} {settings} {booksByAuthor} {relatedBooks} />
