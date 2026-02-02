<script>
	import ArrowLeft from "lucide-svelte/icons/arrow-left";
	import { getEmblaContext } from "./context.js";
	import { cn } from "$lib/utils";
	import { Button } from "$lib/components/ui/button/index.js";
	
	/**
	 * @typedef {Object} Props
	 * @property {any} [class]
	 * @property {string} [variant]
	 * @property {string} [size]
	 */

	/** @type {Props & { [key: string]: any }} */
	let { class: className = undefined, variant = "outline", size = "icon", ...rest } = $props();
	const { orientation, canScrollPrev, scrollPrev, handleKeyDown } =
		getEmblaContext("<Carousel.Previous/>");
</script>

<Button
	{variant}
	{size}
	class={cn(
		"absolute h-8 w-8 touch-manipulation rounded-full",
		$orientation === "horizontal"
			? "-left-12 top-1/2 -translate-y-1/2"
			: "-top-12 left-1/2 -translate-x-1/2 rotate-90",
		className
	)}
	disabled={!$canScrollPrev}
	onclick={scrollPrev}
	onkeydown={handleKeyDown}
	{...rest}
>
	<ArrowLeft class="h-4 w-4" />
	<span class="sr-only">Previous slide</span>
</Button>
