<script lang="ts">
  import * as Carousel from '$lib/components/ui/carousel';
  import { formatCurrency } from '$lib/utils/currency';
  import { getImageUrl } from '$lib/payload';

  interface Props {
    books: any[];
    title?: string;
  }

  let { books = [], title = 'More by this author' }: Props = $props();

  // Get ISBN for book link
  function getBookISBN(book: any): string {
    const primaryEdition = book?.editions?.find((e: any) => e.isPrimary) || book?.editions?.[0];
    return primaryEdition?.isbn || primaryEdition?.isbn10 || book.id || '';
  }

  // Build book URL with slug and ISBN
  function getBookUrl(book: any): string {
    const isbn = getBookISBN(book);
    return book?.slug && isbn ? `/shop/books/${book.slug}/${isbn}` : `/shop/books`;
  }
</script>

{#if books.length > 0}
<section class="related-books py-12 px-4 md:px-12">
  <div class="container mx-auto">
    <div class="text-center block-title">
      <p>Keep shopping</p> 
      <h3>Books by the same Author(s)</h3> 
      <div class="leaf">
        <img alt="" loading="lazy" src="assets/images/resources/leaf.png">
      </div>
      <p class="text-gray-600">Swipe or use arrows to browse</p>
  </div>

    <Carousel.Root
      opts={{
        align: 'start',
        loop: false,
        slidesToScroll: 1,
        breakpoints: {
          '(min-width: 640px)': { slidesToScroll: 2 },
          '(min-width: 1024px)': { slidesToScroll: 4 }
        }
      }}
      class="w-full"
    >
      <Carousel.Content class="-ml-2 md:-ml-4">
        {#each books as book (book.id)}
          <Carousel.Item class="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/4">
            <div class="flex flex-col text-center group">
              <div class="relative overflow-hidden rounded-lg shadow-md group-hover:-translate-y-1 group-hover:shadow-xl transition-all duration-300">
                <a href={getBookUrl(book)} class="block">
                  <img
                    src={getImageUrl(
                      book?.images?.[0]?.image ||
                      book?.images?.[0] ||
                      (book?.scrapedImageUrls?.[0]?.url ? { url: book.scrapedImageUrls[0].url } : null),
                      { fallback: '/assets/images/resources/placeholder-book.jpg' }
                    )}
                    alt={book.title}
                    class="w-full aspect-[2/3] object-cover"
                    loading="lazy"
                  />
                </a>
              </div>
              <h4 class="mt-4 text-xl font-semibold leading-tight">
                <a href={getBookUrl(book)} class="hover:text-thm-primary transition-colors no-underline text-inherit">
                  {book.title}
                </a>
              </h4>
              {#if book.authors?.length}
                <p class="text-sm text-gray-600 mt-2">
                  by {book.authors.map((a: any) => a.name).join(', ')}
                </p>
              {/if}
              <p class="text-xl font-semibold text-[var(--thm-primary)] mt-2">
                {formatCurrency((book?.pricing?.retailPrice || book?.editions?.[0]?.pricing?.retailPrice || 0) / 100)}
              </p>
            </div>
          </Carousel.Item>
        {/each}
      </Carousel.Content>

      <!-- Navigation arrows positioned on the sides -->
      <Carousel.Previous
        class="absolute -left-4 sm:-left-12 top-1/3 -translate-y-1/2 h-10 w-10 bg-white border-2 border-gray-300 hover:bg-gray-50 hover:border-thm-primary shadow-lg"
      />
      <Carousel.Next
        class="absolute -right-4 sm:-right-12 top-1/3 -translate-y-1/2 h-10 w-10 bg-white border-2 border-gray-300 hover:bg-gray-50 hover:border-thm-primary shadow-lg"
      />
    </Carousel.Root>
  </div>
</section>
{/if}
