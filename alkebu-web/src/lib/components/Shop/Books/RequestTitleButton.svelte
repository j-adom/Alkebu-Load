<script lang="ts">
  import { Mail } from 'lucide-svelte';
  import { buildBookInquiryHref } from '$lib/utils/bookAvailability';

  interface Props {
    book: any;
    className?: string;
    iconOnly?: boolean;
    label?: string;
  }

  let {
    book,
    className = 'btn-outline',
    iconOnly = false,
    label = 'Request this title',
  }: Props = $props();

  const href = $derived(buildBookInquiryHref(book));
  const accessibleLabel = $derived(iconOnly ? label : undefined);

  function handleClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    window.location.assign(href);
  }
</script>

<button
  type="button"
  class={className}
  onclick={handleClick}
  aria-label={accessibleLabel}
>
  {#if iconOnly}
    <Mail size={20} />
  {:else}
    <span class="inline-flex items-center gap-2">
      <Mail size={18} />
      {label}
    </span>
  {/if}
</button>
