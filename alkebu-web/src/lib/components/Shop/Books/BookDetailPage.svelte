<script lang="ts">
  import Meta from '$lib/components/Meta.svelte';
  import AddToCartButton from '$lib/components/cart/AddToCartButton.svelte';
  import RelatedBooks from './RelatedBooks.svelte';
  import { formatCurrency } from '$lib/utils/currency';
  import { getImageUrl } from '$lib/payload';

  interface Props {
    book: any;
    seo?: any;
    settings?: any;
    booksByAuthor?: any[];
    relatedBooks?: any[];
  }

  let { book, seo = {}, settings = {}, booksByAuthor = [], relatedBooks = [] }: Props = $props();

  const authors = $derived(book?.authors || []);
  const primaryEdition = $derived(book?.editions?.find((edition: any) => edition.isPrimary) || book?.editions?.[0] || {});
  const binding = $derived((primaryEdition?.binding || 'Book').toString());
  const isbn = $derived(primaryEdition?.isbn || primaryEdition?.isbn10 || '');
  const published = $derived(primaryEdition?.datePublished || '');
  const pages = $derived(primaryEdition?.pages);
  const language = $derived(primaryEdition?.language);
  const priceCents = $derived(book?.pricing?.retailPrice ?? 0);
  const price = $derived((priceCents || 0) / 100);
  const coverUrl = $derived(
    getImageUrl(
      book?.images?.[0]?.image ||
      book?.images?.[0] ||
      (book?.scrapedImageUrls?.[0]?.url ? { url: book.scrapedImageUrls[0].url } : null),
      { fallback: '/assets/images/resources/placeholder-book.jpg' }
    )
  );
  const description = $derived(book?.synopsis || book?.description || 'No description available.');
  const subjects = $derived(book?.subjects?.map((s: any) => s.subject).filter(Boolean) || []);
  const tags = $derived(book?.tags || []);
  const categories = $derived(book?.categories || []);

  const metadata = $derived(() => ({
    title: seo?.title || `${book?.title} | Alkebu-Lan Images`,
    description: seo?.description || description,
    image: seo?.image || coverUrl,
    imageAlt: seo?.imageAlt || book?.title,
    url: seo?.canonical || `/shop/books/${book?.slug || ''}`,
  }));
</script>

<Meta metadata={metadata} />

<section class="page-header" style={settings?.banner ? `background-image: url(${getImageUrl(settings.banner)});` : ''}>
  <div class="container">
    <h2>Book Catalogue</h2>
    <ul class="thm-breadcrumb list-unstyled">
      <li><a rel="prefetch" href="/shop/">Shop</a></li>
      <li><a rel="prefetch" href="/shop/books/" class="shop_style">Books</a></li>
      <li><span>Book Details</span></li>
    </ul>
  </div>
</section>

<section class="product_detail mx-12 px-12">
  <div class="container mx-12 px-12">
    <div class="flex flex-col md:flex-row md:justify-between gap-8">
      <div class="md:w-2/5 lg:w-1/3">
        <div class="product_detail_image">
          <img loading="lazy" src={coverUrl} alt={book?.title} class="rounded shadow w-full object-cover" />
        </div>
      </div>
      <div class="md:w-3/5 lg:w-3/5 md:ml-10">
        <div class="product_detail_content space-y-3">
          <h2 class="text-3xl font-semibold">{book?.title}</h2>
          {#if book?.titleLong}<p class="text-xl text-gray-700">{book.titleLong}</p>{/if}
          <p class="text-lg">
            {#if authors.length}
              by {#each authors as author, i}
                {#if author.slug}
                  <a rel="prefetch" href={`/shop/books/authors/${author.slug}/`} class="no-underline hover:underline text-black">{author.name}</a>{i < authors.length - 1 ? ', ' : ''}
                {:else}
                  {author.name}{i < authors.length - 1 ? ', ' : ''}
                {/if}
              {/each}
            {/if}
          </p>

          <div class="flex items-center gap-4">
            <p class="product_detail_price_box text-3xl font-semibold text-[var(--thm-primary)]">
              {formatCurrency(price)}
            </p>
            <AddToCartButton
              productId={book?.id || book?._id}
              productType="books"
              className="btn-primary"
              label="Add to Cart"
            />
          </div>

          <ul class="list-unstyled category_tag_list space-y-2">
            <li>Format: {binding.charAt(0).toUpperCase() + binding.slice(1)}</li>
            {#if isbn}<li>ISBN: {isbn}</li>{/if}
            {#if published}<li>Published: {published}</li>{/if}
            {#if pages}<li>Pages: {pages}</li>{/if}
            {#if language}<li>Language: {language}</li>{/if}
            {#if categories?.length}
              <li>Categories: {categories.join(', ')}</li>
            {/if}
            {#if subjects?.length}
              <li>Subjects: {subjects.join(', ')}</li>
            {/if}
            {#if tags?.length}
              <li>Tags: {tags.join(', ')}</li>
            {/if}
          </ul>

          <div class="product_detail_text">
            <p>{description}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Books by the Same Author Section -->
{#if booksByAuthor && booksByAuthor.length > 0}
  <RelatedBooks books={booksByAuthor} title="More by this Author" />
{/if}

<!-- Related Books Section -->
{#if relatedBooks && relatedBooks.length > 0}
  <RelatedBooks books={relatedBooks} title="You May Also Like" />
{/if}
