<script lang="ts">
  import * as Carousel from "$lib/components/ui/carousel";
  import { formatCurrency } from "$lib/utils/currency";
  import { getImageUrl } from "$lib/payload";
  import AddToCartButton from "$lib/components/cart/AddToCartButton.svelte";

  interface Props {
    books: any[];
    title?: string;
  }

  let { books = [], title = "More by this Author" }: Props = $props();

  // Get ISBN for book link
  function getBookISBN(book: any): string {
    const primaryEdition =
      book?.editions?.find((e: any) => e.isPrimary) || book?.editions?.[0];
    return primaryEdition?.isbn || primaryEdition?.isbn10 || book.id || "";
  }

  // Build book URL with slug and ISBN
  function getBookUrl(book: any): string {
    const isbn = getBookISBN(book);
    return book?.slug && isbn
      ? `/shop/books/${book.slug}/${isbn}`
      : `/shop/books`;
  }
</script>

{#if books.length > 0}
  <section class="section bg-muted/30">
    <div class="container mx-auto px-4">
      <!-- Section Header -->
      <div class="text-center mb-12">
        <p class="text-primary font-semibold uppercase tracking-wide mb-2">
          Keep Shopping
        </p>
        <h2 class="text-3xl md:text-4xl font-bold font-display mb-4">
          {title}
        </h2>
        <div class="w-20 h-1 bg-primary mx-auto mb-4"></div>
        <p class="text-muted-foreground">Swipe or use arrows to browse</p>
      </div>

      <Carousel.Root
        opts={{
          align: "start",
          loop: false,
          slidesToScroll: 1,
          breakpoints: {
            "(min-width: 640px)": { slidesToScroll: 2 },
            "(min-width: 1024px)": { slidesToScroll: 4 },
          },
        }}
        class="w-full"
      >
        <Carousel.Content class="-ml-2 md:-ml-4">
          {#each books as book (book.id)}
            <Carousel.Item
              class="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/4"
            >
              <a href={getBookUrl(book)} class="block h-full">
                <div
                  class="group bg-card rounded-2xl border border-border/50 overflow-hidden shadow-soft transition-all duration-300 hover:shadow-medium hover:-translate-y-1 h-full"
                >
                  <!-- Book Cover -->
                  <div class="relative aspect-[3/4] overflow-hidden bg-muted">
                    <img
                      src={getImageUrl(
                        book?.images?.[0]?.image ||
                          book?.images?.[0] ||
                          (book?.scrapedImageUrls?.[0]?.url
                            ? { url: book.scrapedImageUrls[0].url }
                            : null),
                        {
                          fallback:
                            "/assets/images/resources/placeholder-book.jpg",
                        },
                      )}
                      alt={book.title}
                      class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <!-- Quick Add Button -->
                    <div
                      class="absolute bottom-0 left-0 right-0 p-3 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300"
                    >
                      <AddToCartButton
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-lg"
                        productId={book.id || book._id}
                        productType="books"
                        iconOnly={false}
                        label="Add to Cart"
                      />
                    </div>
                  </div>

                  <!-- Book Info -->
                  <div class="p-4 text-center">
                    <h4
                      class="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors mb-1"
                    >
                      {book.title}
                    </h4>
                    {#if book.authors?.length}
                      <p
                        class="text-sm text-muted-foreground mb-2 line-clamp-1"
                      >
                        by {book.authors.map((a: any) => a.name).join(", ")}
                      </p>
                    {/if}
                    <p class="text-lg font-bold text-primary">
                      {formatCurrency(
                        (book?.pricing?.retailPrice ||
                          book?.editions?.[0]?.pricing?.retailPrice ||
                          0) / 100,
                      )}
                    </p>
                  </div>
                </div>
              </a>
            </Carousel.Item>
          {/each}
        </Carousel.Content>

        <!-- Navigation arrows -->
        <Carousel.Previous
          class="absolute -left-4 sm:-left-12 top-1/3 -translate-y-1/2 h-12 w-12 bg-card border-2 border-border hover:bg-primary hover:border-primary hover:text-primary-foreground shadow-medium transition-all"
        />
        <Carousel.Next
          class="absolute -right-4 sm:-right-12 top-1/3 -translate-y-1/2 h-12 w-12 bg-card border-2 border-border hover:bg-primary hover:border-primary hover:text-primary-foreground shadow-medium transition-all"
        />
      </Carousel.Root>
    </div>
  </section>
{/if}
