<script lang="ts">
  import { BookOpen } from 'lucide-svelte';

  interface Props {
    title?: string;
    subtitle?: string;
  }

  let { title = '', subtitle = '' }: Props = $props();
</script>

<!-- Branded stand-in for products with no cover image. Fills the card's
     aspect frame; reads like an intentional "library plate", not a broken image. -->
<div class="cover-fallback">
  <span class="cf-spine" aria-hidden="true"></span>
  <span class="cf-pattern" aria-hidden="true"></span>

  <p class="cf-brand">Alkebu-Lan Images</p>
  <p class="cf-title">{title}</p>
  <span class="cf-rule" aria-hidden="true"></span>
  {#if subtitle}
    <p class="cf-sub">{subtitle}</p>
  {/if}

  <span class="cf-glyph" aria-hidden="true"><BookOpen size={20} /></span>
</div>

<style>
  .cover-fallback {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 8% 9% 13%;
    overflow: hidden;
    background: linear-gradient(158deg, hsl(146 33% 24%) 0%, hsl(150 40% 13%) 100%);
    color: #f4ead2;
    /* size children relative to the card's own width, not the viewport */
    container-type: inline-size;
  }
  /* faux book spine */
  .cf-spine {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 5px;
    background: linear-gradient(hsl(var(--primary)), hsl(var(--primary-strong)));
  }
  /* faint kente-stripe texture */
  .cf-pattern {
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.08;
    background-image: repeating-linear-gradient(
      45deg,
      hsl(var(--primary)) 0 2px,
      transparent 2px 16px
    );
  }
  .cf-brand {
    position: relative;
    max-width: 100%;
    margin: 0 0 5%;
    font-size: clamp(6px, 3cqi, 10px);
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: hsl(var(--primary));
  }
  .cf-title {
    position: relative;
    margin: 0;
    max-width: 100%;
    font-family: 'Lora', Georgia, serif;
    font-weight: 600;
    font-size: clamp(0.7rem, 6.4cqi, 1.15rem);
    line-height: 1.2;
    overflow-wrap: anywhere;
    hyphens: auto;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .cf-rule {
    display: block;
    width: 28px;
    height: 2px;
    margin: 6% auto;
    border-radius: 2px;
    background: hsl(var(--primary));
  }
  .cf-sub {
    position: relative;
    margin: 0;
    max-width: 100%;
    font-size: clamp(8px, 3.2cqi, 12px);
    letter-spacing: 0.02em;
    color: rgba(244, 234, 210, 0.82);
    overflow-wrap: anywhere;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .cf-glyph {
    position: absolute;
    bottom: 5%;
    line-height: 0;
    color: hsl(var(--primary));
    opacity: 0.85;
  }
</style>
