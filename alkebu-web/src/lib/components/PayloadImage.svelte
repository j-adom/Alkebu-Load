<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { fade } from 'svelte/transition';

  interface Props {
    image: any;
    maxWidth?: number;
    alt?: string | undefined;
    sizes?: string;
    [key: string]: any
  }

  let {
    image,
    maxWidth = 1200,
    alt = undefined,
    sizes = '100vw',
    ...rest
  }: Props = $props();

  let imageRef: HTMLImageElement = $state();
  let loaded = $state(false);

  let aspectRatio = $derived(image?.width && image?.height ? image.width / image.height : 16 / 9);
  
  // Generate responsive image URLs for Payload
  let src = $derived(image?.url);
  let srcset = $derived(image?.sizes ? Object.entries(image.sizes)
    .map(([key, size]: [string, any]) => `${size.url} ${size.width}w`)
    .join(', ') : '');

  onMount(() => {
    if (imageRef) {
      imageRef.onload = () => {
        loaded = true;
      };
    }
  });
</script>

{#if browser && image && src}
  <img
    in:fade
    loading="lazy"
    {src}
    srcset={srcset || src}
    {sizes}
    alt={alt || image.alt || image.title || ''}
    class:loaded
    bind:this={imageRef}
    style="aspect-ratio: {aspectRatio};"
    {...rest}
  />
{/if}

<style>
  img {
    transition: opacity 0.3s ease;
    opacity: 0;
    width: 100%;
    height: auto;
    object-fit: cover;
  }

  img.loaded {
    opacity: 1;
  }
</style>