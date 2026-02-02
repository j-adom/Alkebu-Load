<script>
	import { cn } from "$lib/utils";
	let { class: className = undefined, children, ...rest } = $props();
	
</script>

<p class={cn("text-muted-foreground text-sm", className)} {...rest}>
	{@render children?.()}
</p>
