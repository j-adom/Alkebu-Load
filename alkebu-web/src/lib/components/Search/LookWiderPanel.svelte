<script lang="ts">
  import { enhance } from '$app/forms';
  import { PUBLIC_TURNSTILE_SITE_KEY } from '$env/static/public';
  import { Globe, Loader2 } from 'lucide-svelte';
  import { formatCurrency } from '$lib/utils/currency';

  type LookWiderResult = {
    ean: string;
    title: string;
    author?: string;
    binding?: string;
    price?: number;
    available: boolean;
  };

  type LookWiderState = {
    query?: string;
    scope?: string;
    results?: LookWiderResult[];
    error?: string;
  };

  interface Props {
    query: string;
    outcome?: LookWiderState | null;
  }

  let { query, outcome = null }: Props = $props();

  const SCOPES = [
    { value: '', label: 'Anything' },
    { value: 'title', label: 'Title' },
    { value: 'author', label: 'Author' },
    { value: 'topic', label: 'Topic' },
  ];

  let scope = $state('');
  let submitting = $state(false);
  let turnstileReady = $state(false);
  let widgetEl = $state<HTMLDivElement>();
  let widgetId: string | undefined;

  const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

  // Load Turnstile on demand; reuse it if another page (e.g. contact) already loaded it.
  $effect(() => {
    const w = window as any;
    if (w.turnstile) {
      turnstileReady = true;
      return;
    }
    let script = document.querySelector<HTMLScriptElement>(`script[src="${TURNSTILE_SRC}"]`);
    if (!script) {
      script = document.createElement('script');
      script.src = TURNSTILE_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
    const onLoad = () => (turnstileReady = true);
    script.addEventListener('load', onLoad);
    return () => script?.removeEventListener('load', onLoad);
  });

  // Explicit render: the widget injects a hidden `cf-turnstile-response` input into the form.
  $effect(() => {
    if (!turnstileReady || !widgetEl) return;
    const turnstile = (window as any).turnstile;
    widgetId = turnstile.render(widgetEl, { sitekey: PUBLIC_TURNSTILE_SITE_KEY, theme: 'light' });
    return () => {
      if (widgetId) turnstile.remove(widgetId);
      widgetId = undefined;
    };
  });

  const results = $derived(outcome?.results ?? null);

  const requestHref = (result: LookWiderResult) => {
    const params = new URLSearchParams({
      subject: `Request this title: ${result.title}`,
      message: [
        "I'd like you to bring in this title for me.",
        '',
        `Title: ${result.title}`,
        result.author ? `Author: ${result.author}` : '',
        `ISBN: ${result.ean}`,
        result.binding ? `Binding: ${result.binding}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    });
    return `/contact?${params.toString()}`;
  };
</script>

<section class="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-6 md:p-8" aria-labelledby="look-wider-heading">
  <div class="flex items-start gap-4">
    <div class="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 sm:flex">
      <Globe class="h-6 w-6 text-primary" />
    </div>
    <div class="min-w-0 flex-1">
      <h2 id="look-wider-heading" class="text-xl font-semibold text-foreground">Not on our shelves yet?</h2>
      <p class="mt-1 text-muted-foreground">
        Want us to look across the wider world of books, and bring it in for you?
      </p>

      <form
        method="POST"
        action="?/lookWider"
        class="mt-5 space-y-4"
        use:enhance={() => {
          submitting = true;
          return async ({ update }) => {
            await update({ reset: false, invalidateAll: false });
            submitting = false;
            // Tokens are single-use: get a fresh one for the next search.
            if (widgetId) (window as any).turnstile?.reset(widgetId);
          };
        }}
      >
        <label class="block">
          <span class="sr-only">Search all books for</span>
          <input
            name="query"
            value={outcome?.query ?? query}
            minlength="2"
            maxlength="120"
            required
            class="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-foreground"
          />
        </label>

        <fieldset class="flex flex-wrap gap-2">
          <legend class="sr-only">Search by</legend>
          {#each SCOPES as option (option.value)}
            <label
              class="cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors {scope === option.value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-foreground hover:border-primary'}"
            >
              <input type="radio" name="scope" value={option.value} bind:group={scope} class="sr-only" />
              {option.label}
            </label>
          {/each}
        </fieldset>

        <div bind:this={widgetEl}></div>

        <button type="submit" class="btn-primary" disabled={submitting}>
          {#if submitting}
            <Loader2 class="h-4 w-4 animate-spin" />
            Searching…
          {:else}
            Search all books
          {/if}
        </button>
      </form>

      {#if outcome?.error}
        <p class="mt-4 text-sm text-destructive" role="alert">{outcome.error}</p>
      {/if}
    </div>
  </div>

  {#if submitting}
    <div class="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {#each [0, 1, 2] as i (i)}
        <div class="h-28 animate-pulse rounded-xl bg-muted"></div>
      {/each}
    </div>
  {:else if results}
    {#if results.length === 0}
      <p class="mt-6 text-muted-foreground">
        We couldn't find that anywhere either. <a href="/contact" class="text-primary underline">Tell us what you're looking for</a>
        and we'll keep an eye out.
      </p>
    {:else}
      <ul class="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3" aria-live="polite">
        {#each results as result (result.ean)}
          <li class="card-modern flex flex-col gap-2 p-4">
            <h3 class="line-clamp-2 font-semibold text-foreground">{result.title}</h3>
            {#if result.author}
              <p class="text-sm text-muted-foreground">by {result.author}</p>
            {/if}
            {#if result.binding}
              <p class="text-xs text-muted-foreground">{result.binding}</p>
            {/if}
            {#if result.price}
              <p class="font-bold text-primary">{formatCurrency(result.price)}</p>
            {/if}
            <p class="text-sm text-foreground">
              <span class="text-primary">●</span> We'll bring it in for you · Ships in 3–8 days
            </p>
            <a href={requestHref(result)} class="btn-outline btn-sm mt-auto self-start">Request this title</a>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</section>
