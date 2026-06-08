<script>
	import ProductCard from '$lib/components/Shop/ProductCard.svelte'
	import * as Card from "$lib/components/ui/card/index.js"
	import { ChevronLeft, ChevronRight } from 'lucide-svelte'
    import * as Carousel from '$lib/components/ui/carousel/carousel.svelte';

	let { books } = $props();

	function shuffle(array) {
		var currentIndex = array.length, temporaryValue, randomIndex;

		// While there remain elements to shuffle...
		while (0 !== currentIndex) {

			// Pick a remaining element...
			randomIndex = Math.floor(Math.random() * currentIndex);
			currentIndex -= 1;

			// And swap it with the current element.
			temporaryValue = array[currentIndex];
			array[currentIndex] = array[randomIndex];
			array[randomIndex] = temporaryValue;
		}

		return array;
	}
	
	let shuffledBooks = $derived(shuffle([...books]).slice(0, 11))
</script>

<style>
        /* .control :global(svg) {
		width: 100%;
		height: 100%;
		color: hsl(var(--primary));
        border: 2px solid hsl(var(--primary));
        background-color: hsl(var(--muted));
		border-radius: 32px;
    } */

    
</style>
<client:only>
<Carousel.Root
  opts={{
    align: "start"
  }}
  class="w-full max-w-sm"
>
  <Carousel.Content>
    {#each shuffledBooks as book}
        <Carousel.Item class="md:basis-1/3 lg:basis-1/4">
            <ProductCard product={book} productType="books" basePath="/shop/books" />
		</Carousel.Item>
    {/each}
  </Carousel.Content>
  <Carousel.Previous />
  <Carousel.Next />
</Carousel.Root>
</client:only>