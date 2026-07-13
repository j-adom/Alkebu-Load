<script lang="ts">
  import { formatCents } from '$lib/utils/currency';
  import { resolveDefaultVariation, type VariantOption } from '$lib/utils/variant';

  /**
   * Wellness / oils-incense products carry two independent variant axes —
   * scent and size — and the two are NOT independently priced: a "1/4 oz"
   * bottle is $5 while a "2 oz" bottle of the exact same scent is $25. The
   * picker must resolve scent + size down to a single `variations[]` row so
   * the backend (`cartProductDetails.ts` → resolveWellnessVariation) can find
   * it again by `sku`. If the two ever disagree, the backend throws rather
   * than silently pricing at $0.00 — so this component must always emit the
   * exact `sku` of the row it displays.
   */

  interface Props {
    variations: VariantOption[];
    /** Fires whenever the resolved variation changes, including on mount. */
    onchange?: (variation: VariantOption | null) => void;
  }

  let { variations = [], onchange }: Props = $props();

  const norm = (value?: string | null): string => (typeof value === 'string' ? value.trim() : '');

  const isInStock = (variation: VariantOption): boolean =>
    (variation?.stock ?? 0) > 0 && variation?.isAvailable !== false;

  // All distinct scents across every variation, alphabetical.
  const scents = $derived.by(() => {
    const set = new Set<string>();
    for (const variation of variations) {
      const scent = norm(variation.scent);
      if (scent) set.add(scent);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  });

  const hasScentAxis = $derived(scents.length > 0);

  function scentHasStock(scent: string): boolean {
    return variations.some((v) => norm(v.scent) === scent && isInStock(v));
  }

  // Variations matching the current scent (or all of them, if scent isn't an
  // axis on this product) — the pool the size selector resolves against.
  function poolForScent(scent: string): VariantOption[] {
    if (!hasScentAxis) return variations;
    return variations.filter((v) => norm(v.scent) === scent);
  }

  // All distinct sizes across every variation, ordered by ascending price —
  // e.g. "1/4 oz" ($5) before "2 oz" ($25) — without parsing fraction
  // strings like "1/4 oz" ourselves.
  const sizes = $derived.by(() => {
    const set = new Set<string>();
    for (const variation of variations) {
      const size = norm(variation.variantName);
      if (size) set.add(size);
    }
    const minPriceFor = (size: string): number => {
      const prices = variations
        .filter((v) => norm(v.variantName) === size)
        .map((v) => Number(v.price) || 0)
        .filter((p) => p > 0);
      return prices.length ? Math.min(...prices) : Number.POSITIVE_INFINITY;
    };
    return Array.from(set).sort((a, b) => minPriceFor(a) - minPriceFor(b) || a.localeCompare(b));
  });

  const hasSizeAxis = $derived(sizes.length > 0);
  // Gate on variations.length, not on whether scent/size happen to be
  // populated — a single-variation soap can still have a populated `scent`
  // field, and showing a picker with nothing to pick violates the
  // single-variation → no-picker requirement.
  const hasPicker = $derived(variations.length > 1);

  function defaultSize(pool: VariantOption[]): string {
    if (!sizes.length) return '';
    const inStockSize = sizes.find((size) => pool.some((v) => norm(v.variantName) === size && isInStock(v)));
    if (inStockSize) return inStockSize;
    const existingSize = sizes.find((size) => pool.some((v) => norm(v.variantName) === size));
    return existingSize ?? sizes[0];
  }

  // $state initializers run once at component creation (including during
  // SSR), so the first render already highlights the same combination
  // `resolveDefaultVariation` picks — the same pure function a parent page
  // uses to seed its own initial price, so the two never disagree.
  const initialVariation = resolveDefaultVariation(variations);
  let selectedScent = $state(norm(initialVariation?.scent));
  let selectedSize = $state(norm(initialVariation?.variantName));

  // Not every scent comes in every size — a size that doesn't exist (or is
  // out of stock) for the currently selected scent must be disabled, not
  // hidden, so a shopper searching for a scent can see it exists rather than
  // conclude it never did.
  function sizeInfo(size: string): { exists: boolean; inStock: boolean } {
    const pool = poolForScent(selectedScent);
    const match = pool.find((v) => norm(v.variantName) === size);
    return { exists: Boolean(match), inStock: match ? isInStock(match) : false };
  }

  function chooseScent(scent: string): void {
    if (scent === selectedScent) return;
    selectedScent = scent;
    // Re-anchor the size selection to something valid for the new scent
    // instead of silently leaving a stale, now-invalid combination selected.
    selectedSize = defaultSize(poolForScent(scent));
    scentQuery = '';
    scentOpen = false;
  }

  function chooseSize(size: string): void {
    selectedSize = size;
  }

  const currentVariation = $derived.by<VariantOption | null>(() => {
    if (!variations.length) return null;
    if (!hasScentAxis && !hasSizeAxis) return variations[0];

    return (
      variations.find(
        (v) =>
          (!hasScentAxis || norm(v.scent) === selectedScent) &&
          (!hasSizeAxis || norm(v.variantName) === selectedSize),
      ) ?? null
    );
  });

  $effect(() => {
    onchange?.(currentVariation);
  });

  // Scent search — 100+ scents is too many for a plain <select>, so this is
  // a filterable combobox instead.
  let scentQuery = $state('');
  let scentOpen = $state(false);
  let scentBoxEl: HTMLDivElement | undefined = $state();

  const filteredScents = $derived.by(() => {
    const query = scentQuery.trim().toLowerCase();
    if (!query) return scents;
    return scents.filter((scent) => scent.toLowerCase().includes(query));
  });

  function handleWindowClick(event: MouseEvent): void {
    if (!scentOpen) return;
    if (scentBoxEl && event.target instanceof Node && !scentBoxEl.contains(event.target)) {
      scentOpen = false;
    }
  }

  function handleScentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      scentOpen = false;
    }
  }
</script>

<svelte:window onclick={handleWindowClick} />

{#if hasPicker}
  <div class="variant-picker">
    {#if hasScentAxis}
      <div class="variant-field" bind:this={scentBoxEl}>
        <label class="variant-label" for="scent-search">
          Scent{selectedScent ? `: ${selectedScent}` : ''}
        </label>
        <div class="scent-combobox">
          <input
            id="scent-search"
            type="text"
            class="scent-input"
            placeholder="Search {scents.length} scents…"
            role="combobox"
            aria-expanded={scentOpen}
            aria-controls="scent-listbox"
            aria-autocomplete="list"
            autocomplete="off"
            bind:value={scentQuery}
            onfocus={() => (scentOpen = true)}
            onclick={() => (scentOpen = true)}
            onkeydown={handleScentKeydown}
          />
          {#if scentOpen}
            <ul class="scent-listbox" role="listbox" id="scent-listbox">
              {#if filteredScents.length === 0}
                <li class="scent-empty">No scents match "{scentQuery}"</li>
              {/if}
              {#each filteredScents as scent (scent)}
                {@const available = scentHasStock(scent)}
                <li>
                  <button
                    type="button"
                    role="option"
                    aria-selected={scent === selectedScent}
                    aria-disabled={!available}
                    class="scent-option"
                    class:selected={scent === selectedScent}
                    class:unavailable={!available}
                    disabled={!available}
                    onclick={() => chooseScent(scent)}
                  >
                    <span>{scent}</span>
                    {#if !available}<span class="tag">Sold out</span>{/if}
                  </button>
                </li>
              {/each}
            </ul>
          {/if}
        </div>
      </div>
    {/if}

    {#if hasSizeAxis}
      <div class="variant-field">
        <span class="variant-label" id="size-label">Size</span>
        <div class="size-options" role="listbox" aria-labelledby="size-label">
          {#each sizes as size (size)}
            {@const info = sizeInfo(size)}
            {@const disabled = !info.exists || !info.inStock}
            <button
              type="button"
              role="option"
              aria-selected={size === selectedSize}
              aria-disabled={disabled}
              class="size-option"
              class:selected={size === selectedSize}
              class:unavailable={disabled}
              {disabled}
              title={!info.exists
                ? `${size} isn't available for this scent`
                : !info.inStock
                  ? `${size} is sold out`
                  : undefined}
              onclick={() => chooseSize(size)}
            >
              {size}
              {#if !info.exists}
                <span class="tag">N/A</span>
              {:else if !info.inStock}
                <span class="tag">Sold out</span>
              {/if}
            </button>
          {/each}
        </div>
      </div>
    {/if}

    {#if currentVariation}
      <p class="variant-status">
        <span class="variant-price">{formatCents(currentVariation.price)}</span>
        {#if !isInStock(currentVariation)}
          <span class="variant-oos">Out of stock</span>
        {/if}
      </p>
    {:else}
      <p class="variant-status variant-oos">This scent and size combination isn't available.</p>
    {/if}
  </div>
{/if}

<style>
  .variant-picker {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .variant-field {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .variant-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: hsl(var(--foreground));
  }

  .scent-combobox {
    position: relative;
  }

  .scent-input {
    width: 100%;
    border: 1px solid hsl(var(--border));
    border-radius: 0.5rem;
    padding: 0.6rem 0.85rem;
    font-size: 0.9rem;
    background: hsl(var(--background));
    color: hsl(var(--foreground));
  }

  .scent-input:focus {
    outline: none;
    border-color: hsl(var(--primary));
    box-shadow: 0 0 0 2px color-mix(in srgb, hsl(var(--primary)) 30%, transparent);
  }

  .scent-listbox {
    position: absolute;
    z-index: 20;
    top: calc(100% + 0.35rem);
    left: 0;
    right: 0;
    max-height: 16rem;
    overflow-y: auto;
    margin: 0;
    padding: 0.35rem;
    list-style: none;
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: 0.5rem;
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
  }

  .scent-empty {
    padding: 0.5rem 0.75rem;
    font-size: 0.85rem;
    color: hsl(var(--muted-foreground));
  }

  .scent-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: none;
    border-radius: 0.4rem;
    background: transparent;
    color: hsl(var(--foreground));
    font-size: 0.9rem;
    text-align: left;
    cursor: pointer;
  }

  .scent-option:hover:not(:disabled) {
    background: hsl(var(--muted));
  }

  .scent-option.selected {
    background: hsl(var(--primary) / 0.12);
    color: hsl(var(--primary));
    font-weight: 600;
  }

  .scent-option.unavailable,
  .size-option.unavailable {
    opacity: 0.5;
    cursor: not-allowed;
    text-decoration: line-through;
  }

  .size-options {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .size-option {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.45rem 0.8rem;
    border-radius: 999px;
    border: 1px solid hsl(var(--border));
    background: hsl(var(--background));
    color: hsl(var(--foreground));
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .size-option:hover:not(:disabled) {
    border-color: hsl(var(--primary));
    color: hsl(var(--primary));
  }

  .size-option.selected {
    background: hsl(var(--primary));
    border-color: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
  }

  .tag {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    opacity: 0.8;
  }

  .variant-status {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 0;
  }

  .variant-price {
    font-size: 1.1rem;
    font-weight: 700;
    color: hsl(var(--primary));
  }

  .variant-oos {
    font-size: 0.85rem;
    font-weight: 600;
    color: hsl(var(--destructive, 0 84% 60%));
  }
</style>
