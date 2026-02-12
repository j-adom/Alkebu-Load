<script lang="ts">
  import BookCard from './Books/BookCard.svelte';
  import * as Carousel from '$lib/components/ui/carousel';

  interface Props {
    books: any[];
    title?: string;
  }

  let { books, title = 'Related Books' }: Props = $props();

  // Use carousel if more than 4 books, otherwise use grid
  const useCarousel = $derived(books.length > 4);
</script>

{#if books && books.length > 0}
  <section class="related-books-section py-12">
    <div class="container mx-auto px-4">
      <h2 class="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">
        {title}
      </h2>

      {#if useCarousel}
        <!-- Carousel for more than 4 items -->
        <div class="relative">
          <Carousel.Root
            opts={{
              align: 'start',
              loop: false,
              slidesToScroll: 1,
              dragFree: true,
              breakpoints: {
                '(min-width: 640px)': { slidesToScroll: 2 },
                '(min-width: 1024px)': { slidesToScroll: 3 },
                '(min-width: 1280px)': { slidesToScroll: 4 }
              }
            }}
            class="w-full"
          >
            <Carousel.Content class="-ml-2 md:-ml-4">
              {#each books as book (book.id)}
                <Carousel.Item class="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                  <BookCard {book} />
                </Carousel.Item>
              {/each}
            </Carousel.Content>

            <!-- Navigation arrows -->
            <Carousel.Previous
              class="absolute -left-4 sm:-left-12 top-1/2 -translate-y-1/2 h-10 w-10 bg-white border-2 border-gray-300 hover:bg-gray-50 hover:border-primary shadow-lg"
            />
            <Carousel.Next
              class="absolute -right-4 sm:-right-12 top-1/2 -translate-y-1/2 h-10 w-10 bg-white border-2 border-gray-300 hover:bg-gray-50 hover:border-primary shadow-lg"
            />
          </Carousel.Root>
        </div>
      {:else}
        <!-- Grid for 4 or fewer items -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {#each books as book (book.id)}
            <BookCard {book} />
          {/each}
        </div>
      {/if}
    </div>
  </section>
{/if}

<style>
  .related-books-section {
    background-color: var(--color-surface, #f9fafb);
  }
</style>
