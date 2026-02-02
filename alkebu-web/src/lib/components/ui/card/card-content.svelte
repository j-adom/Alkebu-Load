<script>
	import { cn } from "$lib/utils";
	let { class: className = undefined, children, ...rest } = $props();
	
</script>

<div class={cn("p-6", className)} {...rest}>
	{@render children?.()}
</div>
