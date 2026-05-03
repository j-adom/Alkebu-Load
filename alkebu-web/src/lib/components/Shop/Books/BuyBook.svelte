<script lang="ts">
  import BookPurchaseAction from './BookPurchaseAction.svelte';

  interface Props {
    book: any;
    quantity?: number;
  }

  let { book = $bindable(), quantity = 1 }: Props = $props();

  const binding = $derived(
    book?.binding || book?.defaultBookVariant?.binding || book?.editions?.[0]?.binding || 'paperback',
  );
  const isbn = $derived(book?.defaultBookVariant?.isbn || book?.editions?.[0]?.isbn || book?.editions?.[0]?.isbn10 || '');
  const customization = $derived.by(() => ({
    ...(binding ? { binding } : {}),
    ...(isbn ? { isbn } : {}),
  }));
</script>

<BookPurchaseAction
  {book}
  {quantity}
  {customization}
  className="btn-primary"
/>
