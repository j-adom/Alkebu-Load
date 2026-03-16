<script lang="ts">
  import AddToCartButton from '$lib/components/cart/AddToCartButton.svelte';
  import RequestTitleButton from './RequestTitleButton.svelte';
  import { getBookAvailabilityStatus, isBookPurchasable } from '$lib/utils/bookAvailability';

  type Customization = Record<string, unknown> | undefined;

  interface Props {
    book: any;
    quantity?: number;
    customization?: Customization;
    className?: string;
    disabled?: boolean;
    iconOnly?: boolean;
    label?: string;
    requestLabel?: string;
  }

  let {
    book,
    quantity = 1,
    customization,
    className = 'btn-primary',
    disabled = false,
    iconOnly = false,
    label = 'Add to Cart',
    requestLabel = 'Request this title',
  }: Props = $props();

  const productId = $derived(book?.id || book?._id);
  const availabilityStatus = $derived(getBookAvailabilityStatus(book));
  const showAddToCart = $derived(isBookPurchasable(book));
  const showRequestButton = $derived(availabilityStatus === 'request-only');
</script>

{#if showAddToCart}
  <AddToCartButton
    {productId}
    productType="books"
    {quantity}
    {customization}
    {className}
    {disabled}
    {iconOnly}
    {label}
  />
{:else if showRequestButton}
  <RequestTitleButton
    {book}
    {className}
    {iconOnly}
    label={requestLabel}
  />
{/if}
