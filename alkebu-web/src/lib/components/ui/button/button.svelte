<script>
	import { Button as ButtonPrimitive } from "bits-ui";
	import { buttonVariants } from "./index.js";
	import { cn } from "$lib/utils";
	/**
	 * @typedef {Object} Props
	 * @property {any} [class]
	 * @property {string} [variant]
	 * @property {string} [size]
	 * @property {any} [builders]
	 * @property {import('svelte').Snippet} [children]
	 */

	/** @type {Props & { [key: string]: any }} */
	let {
		class: className = undefined,
		variant = "default",
		size = "default",
		builders = [],
		children,
		onclick,
		onkeydown,
		...rest
	} = $props();
	
</script>

<ButtonPrimitive.Root
	{builders}
	class={cn(buttonVariants({ variant, size, className }))}
	type="button"
	{onclick}
	{onkeydown}
	{...rest}
>
	{@render children?.()}
</ButtonPrimitive.Root>
