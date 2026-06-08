<script lang="ts">
  import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
  } from 'lucide-svelte';

  interface Props {
    currentPage: number;
    totalPages: number;
    /** Builds the href for a given page (used for SEO + middle-click/open-in-new-tab). */
    buildHref: (page: number) => string;
    /** Optional client-side handler; when provided, clicks preventDefault and call this. */
    onnavigate?: (page: number) => void;
    siblingCount?: number;
    boundaryCount?: number;
  }

  let {
    currentPage,
    totalPages,
    buildHref,
    onnavigate,
    siblingCount = 2,
    boundaryCount = 1,
  }: Props = $props();

  const clamp = (p: number) => Math.min(Math.max(1, Math.round(p) || 1), totalPages);

  // First/last boundary pages + a window around the current page, with ellipses
  // inserted wherever the sequence skips. The go-to input covers far jumps.
  const items = $derived.by<Array<number | 'ellipsis'>>(() => {
    if (totalPages <= 1) return totalPages === 1 ? [1] : [];
    const cur = clamp(currentPage);
    const set = new Set<number>();
    for (let i = 1; i <= boundaryCount; i++) {
      set.add(i);
      set.add(totalPages - i + 1);
    }
    for (let i = cur - siblingCount; i <= cur + siblingCount; i++) {
      if (i >= 1 && i <= totalPages) set.add(i);
    }
    const sorted = [...set].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
    const out: Array<number | 'ellipsis'> = [];
    let prev = 0;
    for (const p of sorted) {
      if (p - prev > 1) out.push('ellipsis');
      out.push(p);
      prev = p;
    }
    return out;
  });

  const atStart = $derived(currentPage <= 1);
  const atEnd = $derived(currentPage >= totalPages);

  let gotoValue = $state('');

  function activate(page: number, event: Event) {
    if (onnavigate) {
      event.preventDefault();
      onnavigate(clamp(page));
    }
    // otherwise the <a href> performs the navigation
  }

  function handleGoto(event: Event) {
    event.preventDefault();
    const n = Number.parseInt(gotoValue, 10);
    if (Number.isNaN(n)) return;
    const target = clamp(n);
    gotoValue = '';
    if (onnavigate) onnavigate(target);
    else if (typeof window !== 'undefined') window.location.assign(buildHref(target));
  }
</script>

{#if totalPages > 1}
  <nav class="pagination" aria-label="Pagination">
    <ul class="pg-list">
      <li>
        <a
          href={buildHref(1)}
          class="pg-btn pg-arrow"
          class:disabled={atStart}
          aria-label="First page"
          aria-disabled={atStart}
          tabindex={atStart ? -1 : undefined}
          onclick={(e) => activate(1, e)}
        ><ChevronsLeft size={18} /></a>
      </li>
      <li>
        <a
          href={buildHref(currentPage - 1)}
          class="pg-btn pg-arrow"
          class:disabled={atStart}
          aria-label="Previous page"
          aria-disabled={atStart}
          tabindex={atStart ? -1 : undefined}
          onclick={(e) => activate(currentPage - 1, e)}
        ><ChevronLeft size={18} /></a>
      </li>

      {#each items as item, i}
        {#if item === 'ellipsis'}
          <li class="pg-ellipsis" aria-hidden="true">…</li>
        {:else}
          <li>
            <a
              href={buildHref(item)}
              class="pg-btn"
              class:active={item === currentPage}
              aria-label={`Page ${item}`}
              aria-current={item === currentPage ? 'page' : undefined}
              onclick={(e) => activate(item, e)}
            >{item}</a>
          </li>
        {/if}
      {/each}

      <li>
        <a
          href={buildHref(currentPage + 1)}
          class="pg-btn pg-arrow"
          class:disabled={atEnd}
          aria-label="Next page"
          aria-disabled={atEnd}
          tabindex={atEnd ? -1 : undefined}
          onclick={(e) => activate(currentPage + 1, e)}
        ><ChevronRight size={18} /></a>
      </li>
      <li>
        <a
          href={buildHref(totalPages)}
          class="pg-btn pg-arrow"
          class:disabled={atEnd}
          aria-label="Last page"
          aria-disabled={atEnd}
          tabindex={atEnd ? -1 : undefined}
          onclick={(e) => activate(totalPages, e)}
        ><ChevronsRight size={18} /></a>
      </li>
    </ul>

    <form class="pg-goto" onsubmit={handleGoto}>
      <span class="pg-count">Page {currentPage} of {totalPages}</span>
      <label class="pg-goto-field">
        <span class="sr-only">Go to page</span>
        <input
          type="number"
          min="1"
          max={totalPages}
          inputmode="numeric"
          placeholder="#"
          bind:value={gotoValue}
          class="pg-input"
        />
      </label>
      <button type="submit" class="pg-go">Go</button>
    </form>
  </nav>
{/if}

<style>
  .pagination {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    margin-top: 2rem;
  }
  .pg-list {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .pg-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 40px;
    height: 40px;
    padding: 0 0.6rem;
    border-radius: 10px;
    border: 1px solid hsl(var(--border));
    background: hsl(var(--card));
    color: hsl(var(--foreground));
    font-weight: 600;
    font-size: 14px;
    text-decoration: none;
    transition: all 0.15s ease;
  }
  .pg-btn:hover {
    border-color: hsl(var(--primary));
    color: hsl(var(--primary));
  }
  .pg-btn.active {
    background: hsl(var(--primary));
    border-color: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
  }
  .pg-btn.disabled {
    opacity: 0.4;
    pointer-events: none;
  }
  .pg-arrow {
    padding: 0;
  }
  .pg-ellipsis {
    min-width: 28px;
    text-align: center;
    color: hsl(var(--muted-foreground));
    user-select: none;
  }
  .pg-goto {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-size: 14px;
    color: hsl(var(--muted-foreground));
  }
  .pg-input {
    width: 64px;
    height: 36px;
    border: 1px solid hsl(var(--border));
    border-radius: 8px;
    padding: 0 0.5rem;
    background: hsl(var(--background));
    color: hsl(var(--foreground));
    text-align: center;
  }
  .pg-input:focus {
    outline: none;
    border-color: hsl(var(--primary));
  }
  .pg-go {
    height: 36px;
    padding: 0 0.9rem;
    border-radius: 8px;
    border: 1px solid hsl(var(--primary));
    background: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    transition: filter 0.15s ease;
  }
  .pg-go:hover {
    filter: brightness(0.95);
  }
</style>
