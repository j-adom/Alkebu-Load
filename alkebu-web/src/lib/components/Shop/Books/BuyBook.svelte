<script lang="ts">
  import AddToCartButton from '$lib/components/cart/AddToCartButton.svelte';

  interface Props {
    book: any;
    quantity?: number;
  }

  let { book = $bindable(), quantity = 1 }: Props = $props();

  const productId = $derived(book?.id || book?._id || '');
  const binding = $derived(
    book?.binding || book?.defaultBookVariant?.binding || book?.editions?.[0]?.binding || 'paperback',
  );
  const weight = $derived(book?.weight || (binding?.toLowerCase() === 'hardcover' ? 2 : 1));
  const customization = $derived.by(() => (binding ? { binding } : undefined));
</script>

<AddToCartButton
  productId={productId}
  productType="books"
  quantity={quantity}
  customization={customization}
  className="btn-primary"
  label="Add to Cart"
/>
