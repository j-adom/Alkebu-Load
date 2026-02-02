<script>
	import { run, createBubbler } from 'svelte/legacy';

	const bubble = createBubbler();
	import { writable } from "svelte/store";
	import { onDestroy } from "svelte";
	import { setEmblaContext } from "./context.js";
	import { cn } from "$lib/utils";
	/**
	 * @typedef {Object} Props
	 * @property {any} [opts]
	 * @property {any} [plugins]
	 * @property {any} [api]
	 * @property {string} [orientation]
	 * @property {any} [class]
	 * @property {import('svelte').Snippet} [children]
	 */

	/** @type {Props & { [key: string]: any }} */
	let {
		opts = {},
		plugins = [],
		api = $bindable(undefined),
		orientation = "horizontal",
		class: className = undefined,
		children,
		...rest
	} = $props();
	
	const apiStore = writable(undefined);
	const orientationStore = writable(orientation);
	const canScrollPrev = writable(false);
	const canScrollNext = writable(false);
	const optionsStore = writable(opts);
	const pluginStore = writable(plugins);
	const scrollSnapsStore = writable([]);
	const selectedIndexStore = writable(0);
	run(() => {
		orientationStore.set(orientation);
	});
	run(() => {
		pluginStore.set(plugins);
	});
	run(() => {
		optionsStore.set(opts);
	});
	function scrollPrev() {
		api?.scrollPrev();
	}
	function scrollNext() {
		api?.scrollNext();
	}


    export function Content(Content) {
        throw new Error('Function not implemented.');
    }
	function scrollTo(index, jump) {
		api?.scrollTo(index, jump);
	}
	function onSelect(api2) {
		if (!api2) return;
		canScrollPrev.set(api2.canScrollPrev());
		canScrollNext.set(api2.canScrollNext());
		selectedIndexStore.set(api2.selectedScrollSnap());
	}
	run(() => {
		if (api) {
			onSelect(api);
			api.on("select", onSelect);
			api.on("reInit", onSelect);
		}
	});
	function handleKeyDown(e) {
		if (e.key === "ArrowLeft") {
			e.preventDefault();
			scrollPrev();
		} else if (e.key === "ArrowRight") {
			e.preventDefault();
			scrollNext();
		}
	}
	setEmblaContext({
		api: apiStore,
		scrollPrev,
		scrollNext,
		orientation: orientationStore,
		canScrollNext,
		canScrollPrev,
		handleKeyDown,
		options: optionsStore,
		plugins: pluginStore,
		onInit,
		scrollSnaps: scrollSnapsStore,
		selectedIndex: selectedIndexStore,
		scrollTo,
	});
	function onInit(event) {
		api = event.detail;
		apiStore.set(api);
		scrollSnapsStore.set(api.scrollSnapList());
	}
	onDestroy(() => {
		api?.off("select", onSelect);
	});
</script>

<div
	class={cn("relative", className)}
	onmouseenter={bubble('mouseenter')}
	onmouseleave={bubble('mouseleave')}
	role="region"
	aria-roledescription="carousel"
	{...rest}
>
	{@render children?.()}
</div>
