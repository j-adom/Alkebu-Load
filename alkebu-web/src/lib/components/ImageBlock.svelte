<script lang="ts">
  import PayloadImage from './PayloadImage.svelte';
  
  interface Props {
    portableText: any;
  }

  let { portableText }: Props = $props();
  let {value} = $derived(portableText);
</script>

{#if value?.asset || value?.url}
  <figure>
    <PayloadImage image={value} alt={value.caption || value.alt || ''} />
    {#if value.caption}
      <figcaption>{value.caption}</figcaption>
    {/if}
  </figure>
{/if}