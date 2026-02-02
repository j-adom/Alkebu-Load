<script>
	import CarouselCard from './CarouselCard.svelte'	
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
	
	let shuffledBooks = shuffle(books).slice(0,11)
</script>

<style>
        /* .control :global(svg) {
		width: 100%;
		height: 100%;
		color: var(--thm-primary);
        border: 2px solid var(--thm-primary);
        background-color: var(--thm-base);
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
            <CarouselCard {book} />
		</Carousel.Item>	
    {/each}
  </Carousel.Content>
  <Carousel.Previous />
  <Carousel.Next />
</Carousel.Root>
</client:only>
<!-- 
<Carousel perPage={{ 1000: 4, 800: 3, 500: 2 }}>
    <span class="control" slot="left-control">
        <ChevronLeft />
    </span>
    {#each shuffledBooks as book}
        <div class="slide-content">
            <CarouselCard {book} />
        </div>	
    {/each}
    <span class="control" slot="right-control">
        <ChevronRight />
    </span>
</Carousel> -->

<!-- <div class="embla" use:Carousel>
	<div class="embla__container">
		<div class="embla__viewport">
			{#each shuffledBooks as book}
				<div class="embla__slide">
					<CarouselCard {book} />
				</div>	
			{/each}
		</div>
		<button class="embla__prev">Prev</button>
		<button class="embla__next">Next</button>
	</div>
  </div> -->