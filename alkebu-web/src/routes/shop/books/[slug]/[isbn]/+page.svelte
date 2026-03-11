<script lang="ts">
  import BookDetailPage from '$lib/components/Shop/Books/BookDetailPage.svelte';

  let { data } = $props();
  const book = data.book;
  const seo = data.seo;
  const settings = data.settings;
  const relatedBooks = data.relatedBooks;
  const booksByAuthor = data.booksByAuthor;
</script>

<BookDetailPage {book} {seo} {settings} {relatedBooks} {booksByAuthor} />
