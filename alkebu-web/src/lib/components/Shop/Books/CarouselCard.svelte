<script lang="ts">
  import BookCover from './BookCover.svelte';
  import PayloadImage from "$lib/components/PayloadImage.svelte";
  import AddToCartButton from "$lib/components/cart/AddToCartButton.svelte";
  import { formatCurrency } from "$lib/utils/currency";

  interface Props {
    book: any;
  }

  let { book }: Props = $props();

  let binding = $derived(book.binding || book.editions?.[0]?.binding || 'Paperback');
  let price = $derived(book.pricing?.retailPrice || book.editions?.[0]?.price || 0);
  let images = $derived(
    book.images?.[0] || book.editions?.[0]?.images?.[0] ||
    (book.scrapedImageUrls?.[0]?.url ? { url: book.scrapedImageUrls[0].url } : null)
  );
  const productId = $derived(book.id || book._id);
  const slug = $derived.by(() => {
    if (!book?.slug) return '';
    if (typeof book.slug === 'string') return book.slug;
    return book.slug?.current || '';
  });
  const productPath = $derived.by(() => (slug ? `/shop/books/${slug}` : '/shop/books'));
</script>

<style>

    .single{
        position: relative;
        display: block;
        overflow: hidden;
        padding: 0 1rem
    }
    .single h4 a{
        color: inherit;
        transition: 500ms;
    }
    .single h4 {
    font-size: 30px;
    color: hsl(var(--foreground));
    font-weight: 700;
    margin: 0;
    text-transform: uppercase;
    line-height: 30px;
    margin-top: 27px;
    -webkit-transition: all 500ms ease;
    transition: all 500ms ease;
    }
    .single:hover h4 {
        color: hsl(var(--primary));
    }
    .single h4 a:hover {
        color: hsl(var(--primary));
    }
    .single p {
        font-size: 20px;
        color: #878986;
        margin: 0;
        line-height: 28px;
    }
</style>

    <div class="single text-center">
        <div class="all_product_item_image">
            {#if images}
                <PayloadImage 
                    image={images} 
                    alt={book.title} 
                    maxWidth={300} 
                />
            {:else} 
                <BookCover title={book.title} subtitle={book.subtitle} />
            {/if}
            <div class="all_product_hover">
                <AddToCartButton
                    className="all_product_icon add-to-cart"
                    productId={productId}
                    productType="books"
                    iconOnly={true}
                    label={`Add ${book.title} to cart`}
                />
            </div>
        </div>
        <h4><a href={productPath}>{book.title} ({binding})</a></h4>
        <p>{formatCurrency(price)}</p>
    </div>
