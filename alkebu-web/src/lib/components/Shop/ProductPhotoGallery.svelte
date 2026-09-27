<script lang="ts">
  import PayloadImage from '$lib/components/PayloadImage.svelte';
  let { images = [], productName }: { images: any[]; productName: string } = $props();
  let selected = $state(0);
  const active = $derived(images[selected] ?? images[0]);
</script>

<div class="product-photos">
  {#if active}
    <figure>
      <div class="photo-stage">
        <PayloadImage image={active} alt={active.alt || productName} loading="eager"
          fetchpriority="high" sizes="(min-width: 1024px) 55vw, 100vw" />
      </div>
      <figcaption aria-live="polite">
        <span>{active.caption || active.alt || productName}</span>
        {#if images.length > 1}<span class="photo-count">{selected + 1} / {images.length}</span>{/if}
      </figcaption>
    </figure>
    {#if images.length > 1}
      <div class="photo-options" aria-label="Product photos">
        {#each images as image, index}
          <button type="button" class:chosen={selected === index} aria-pressed={selected === index}
            aria-label="View photo {index + 1}: {image.alt || productName}" onclick={() => selected = index}>
            <PayloadImage {image} alt="" loading="lazy" sizes="112px" />
          </button>
        {/each}
      </div>
    {/if}
  {:else}
    <div class="photo-empty"><p>{productName}</p><span>Product photography coming soon</span></div>
  {/if}
</div>

<style>
  .photo-stage { aspect-ratio: 4 / 3; display: flex; align-items: center; background: hsl(var(--muted)); border-radius: var(--radius); overflow: hidden; }
  .photo-stage :global(img) { width: 100%; height: 100%; object-fit: contain; }
  figure { margin: 0; }
  figcaption { display: flex; gap: 1rem; justify-content: space-between; margin: 1rem 0; font-size: .875rem; line-height: 1.6; color: hsl(var(--foreground) / .8); }
  .photo-count { white-space: nowrap; font-variant-numeric: tabular-nums; }
  .photo-options { display: flex; gap: .75rem; overflow-x: auto; padding: .25rem; scrollbar-color: hsl(var(--accent)) hsl(var(--muted)); }
  button { flex: 0 0 112px; aspect-ratio: 4 / 3; padding: 3px; border: 2px solid transparent; border-radius: 8px; overflow: hidden; background: hsl(var(--muted)); cursor: pointer; }
  button :global(img) { width: 100%; height: 100%; object-fit: cover; border-radius: 4px; }
  button:hover { border-color: hsl(var(--foreground) / .5); }
  button.chosen { border-color: hsl(var(--accent)); }
  button:focus-visible { outline: 3px solid hsl(var(--foreground)); outline-offset: 2px; }
  .photo-empty { aspect-ratio: 4 / 3; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 1rem; padding: 2rem; background: hsl(var(--muted)); border-radius: var(--radius); text-align: center; }
  .photo-empty p { font-family: var(--font-display); font-size: 2rem; }
  .photo-empty span { color: hsl(var(--foreground) / .8); }
  @media (min-width: 1024px) { .product-photos { position: sticky; top: 7rem; } }
</style>
