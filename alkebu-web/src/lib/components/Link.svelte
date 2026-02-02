<script>
  let { portableText, children } = $props();
</script>

<a href={portableText.mark.href} target="_blank">
  {@render children?.()}
</a>