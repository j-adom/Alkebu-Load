<script lang="ts">
  import { fade } from 'svelte/transition';

  interface Props {
    image: any;
    maxWidth?: number;
    alt?: string | undefined;
    sizes?: string;
    loading?: 'eager' | 'lazy';
    fetchpriority?: 'high' | 'low' | 'auto';
    [key: string]: any
  }

  let {
    image,
    maxWidth = 1200,
    alt = undefined,
    sizes = '100vw',
    loading = 'lazy',
    fetchpriority = undefined,
    ...rest
  }: Props = $props();

  let aspectRatio = $derived(image?.width && image?.height ? image.width / image.height : 16 / 9);
  
  // Generate responsive image URLs for Payload
  let src = $derived(image?.url);
  let srcset = $derived(image?.sizes ? Object.entries(image.sizes)
    .map(([key, size]: [string, any]) => `${size.url} ${size.width}w`)
    .join(', ') : '');

</script>

{#if image && src}
  <img
    in:fade
    {loading}
    {fetchpriority}
    {src}
    srcset={srcset || src}
    {sizes}
    alt={alt || image.alt || image.title || ''}
    style="aspect-ratio: {aspectRatio};"
    {...rest}
  />
{/if}

<style>
  img {
    width: 100%;
    height: auto;
    object-fit: cover;
  }
</style>
