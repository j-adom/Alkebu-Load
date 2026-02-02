<script lang="ts">
  import AddToCartButton from "$lib/components/cart/AddToCartButton.svelte";
  import { formatCurrency } from "$lib/utils/currency";
  import { getImageUrl } from "$lib/payload";

  interface Props {
    book: any;
  }

  let { book }: Props = $props();

  const primaryEdition = $derived(book?.editions?.find((edition: any) => edition.isPrimary) || book?.editions?.[0] || {});
  const binding = $derived((primaryEdition?.binding || book?.binding || 'Paperback').toString());
  const priceCents = $derived(book?.pricing?.retailPrice ?? primaryEdition?.pricing?.retailPrice ?? 0);
  const price = $derived((priceCents || 0) / 100);
  const imageSource = $derived(
    book?.images?.[0]?.image ||
    book?.images?.[0] ||
    (book?.scrapedImageUrls?.[0]?.url ? { url: book.scrapedImageUrls[0].url } : null)
  );
  const productId = $derived(book?.id || book?._id);
  const slug = $derived.by(() => {
    if (!book?.slug) return '';
    if (typeof book.slug === 'string') return book.slug;
    return book.slug?.current || '';
  });
  const isbn = $derived(primaryEdition?.isbn13 || primaryEdition?.isbn || book?.isbn13 || book?.isbn || '');
  const productPath = $derived.by(() => {
    if (!slug) return '/shop/books';
    return isbn ? `/shop/books/${slug}/${isbn}` : `/shop/books/${slug}`;
  });
  const coverUrl = $derived(getImageUrl(imageSource, { fallback: '' }));

  let imageError = $state(false);
  let imageLoaded = $state(false);

  function handleImageError() {
    imageError = true;
  }

  function handleImageLoad() {
    imageLoaded = true;
    imageError = false;
  }
</script>

<style>
  .placeholder-cover {
    width: 100%;
    aspect-ratio: 2/3;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    background: linear-gradient(135deg, var(--thm-primary, #5b8c51) 0%, var(--thm-black, #404a3d) 100%);
    border-radius: 0.25rem;
    position: relative;
    overflow: hidden;
  }

  .placeholder-cover::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: repeating-linear-gradient(
      45deg,
      transparent,
      transparent 10px,
      rgba(255, 255, 255, 0.05) 10px,
      rgba(255, 255, 255, 0.05) 20px
    );
    pointer-events: none;
  }

  .placeholder-title {
    color: white;
    font-size: 1.25rem;
    font-weight: 700;
    text-align: center;
    line-height: 1.4;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    z-index: 1;
    word-break: break-word;
    hyphens: auto;
  }

  .book-image {
    width: 100%;
    object-fit: cover;
    border-radius: 0.25rem;
  }
</style>

<div class="flex flex-col text-center all_products_single ">
  <div class="all_product_item_image">
    {#if !coverUrl || imageError}
      <div class="placeholder-cover">
        <div class="placeholder-title">{book.title}</div>
      </div>
    {:else}
      <img
        src={coverUrl}
        alt={book.title}
        class="book-image"
        loading="lazy"
        onerror={handleImageError}
        onload={handleImageLoad}
      />
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
    <h4>
      <a href={productPath}>
        {book.title} ({binding})
      </a>
    </h4>
    <h2>
      {#if book.authors?.length} 
        by&nbsp;
        {#each book.authors as author, i}
          {#if author.slug}
            <a href="/shop/books/authors/{author.slug}">{author.name}</a>{i < book.authors.length - 1 ? ', ' : ''}
          {:else}
            {author.name}{i < book.authors.length - 1 ? ', ' : ''}
          {/if}
        {/each}
      {/if}
    </h2>
    <p class="text-2xl">{formatCurrency(price)}</p>
  </div>
