<script>
  import { onMount } from 'svelte';
  import { enhance } from '$app/forms';
  import { PUBLIC_TURNSTILE_SITE_KEY } from '$env/static/public';
  import Meta from '$lib/components/Meta.svelte';
  import { trackEvent } from '$lib/analytics';
  import { ArrowRight, Send } from 'lucide-svelte';

  let { data, form } = $props();
  const page = $derived(data.page);
  const metadata = $derived(
    data.seo ?? {
      title: page.seo.title,
      description: page.seo.description,
      image: '/assets/images/resources/logo.png',
      imageAlt: 'Alkebu-Lan Images Logo',
      url: page.path,
    }
  );
  const values = $derived(form?.values ?? {});
  const detailValues = $derived(values?.[page.form.detailGroup] ?? {});
  const fieldErrors = $derived(form?.fieldErrors ?? {});

  const optionLabel = (option) => option.replaceAll('_', ' ');
  const errorsFor = (field) => fieldErrors[field.name] ?? fieldErrors[`${page.form.detailGroup}.${field.name}`];
  const errorId = (field) => `error-${page.form.detailGroup}-${field.name}`;

  // Anti-spam: backend silently drops submissions younger than its minimum
  // time-to-submit, keyed off this timestamp. Set on mount so it reflects when
  // the visitor actually saw the form, not when the edge cached the page.
  let renderedAt = $state(Date.now());
  onMount(() => {
    renderedAt = Date.now();
  });

  // Conversion funnel instrumentation (Rybbit): page view is automatic;
  // form-start fires once on first focus, outcomes fire when `form` updates.
  let formStarted = false;
  const onFormFocus = () => {
    if (formStarted) return;
    formStarted = true;
    trackEvent('partnership_form_start', { track: page.type });
  };

  let statusRegion = $state(null);
  $effect(() => {
    if (form?.success) {
      trackEvent('partnership_form_submit_success', { track: page.type });
    } else if (form?.error) {
      trackEvent('partnership_form_submit_error', {
        track: page.type,
        reason: Object.keys(form?.fieldErrors ?? {}).length ? 'validation' : 'server',
      });
    }
    if (form?.success || form?.error) {
      statusRegion?.focus();
    }
  });
</script>

<svelte:head>
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
</svelte:head>

<Meta {metadata} />

<div style="--track-accent: {page.accent}">
  <!-- HERO — type + track symbol, no photo scrim. The Adinkra watermark is the
       page's one bold move; everything after it stays quiet. -->
  <section class="relative isolate overflow-hidden bg-background">
    <div
      aria-hidden="true"
      class="adinkra pointer-events-none absolute -right-16 top-1/2 h-[22rem] w-[22rem] -translate-y-1/2 opacity-[0.07] md:-right-8 md:h-[32rem] md:w-[32rem] lg:right-8"
      style="--symbol: url('{page.symbol}')"
    ></div>

    <div class="container relative z-10 mx-auto px-4 py-20 md:py-28">
      <div class="hero-enter mx-auto max-w-3xl text-center md:mx-0 md:text-left">
        <p class="mb-4 text-sm font-semibold uppercase tracking-wide text-primary-strong">{page.hero.eyebrow}</p>
        <h1 class="font-display text-5xl font-bold tracking-tight md:text-6xl lg:text-7xl">{page.hero.headline}</h1>
        <div class="mx-auto mt-6 h-1 w-20 bg-primary md:mx-0"></div>
        <p class="mx-auto mt-6 max-w-2xl font-serif text-xl italic leading-8 text-muted-foreground md:mx-0">{page.hero.subhead}</p>
        <div class="mt-8 flex flex-wrap items-center justify-center gap-4 md:justify-start">
          <a href="#inquiry" class="btn-primary btn-lg inline-flex items-center gap-2">
            {page.hero.cta}
            <ArrowRight class="h-5 w-5" />
          </a>
          <a
            href="tel:615-321-4111"
            class="inline-flex min-h-12 items-center px-2 text-sm font-semibold text-foreground underline-offset-4 transition-colors hover:text-kente-terracotta hover:underline"
          >
            Talk with staff
          </a>
        </div>
        <ul class="mt-10 flex flex-wrap justify-center divide-x divide-border text-sm text-muted-foreground md:justify-start">
          {#each page.hero.trustRow as item}
            <li class="px-4 first:pl-0">{item}</li>
          {/each}
        </ul>
      </div>
    </div>
  </section>

  <!-- FIT — who this is for, with the photo as evidence, not headline -->
  <section class="section bg-background">
    <div class="container mx-auto grid items-center gap-10 px-4 md:grid-cols-2">
      <div>
        <div class="text-center md:text-left">
          <p class="mb-2 text-sm font-semibold uppercase tracking-wide text-primary-strong">Who this is for</p>
          <div class="mx-auto mb-6 h-1 w-20 bg-primary md:mx-0"></div>
          <h2 class="font-display text-3xl font-bold md:text-4xl">A fit for organizations like yours</h2>
        </div>
        <ul class="mx-auto mt-8 grid max-w-sm gap-4 md:mx-0 md:max-w-none">
          {#each page.fit as item}
            <li class="flex items-start gap-3 text-lg">
              <span aria-hidden="true" class="mt-2.5 h-px w-6 shrink-0 bg-[color:var(--track-accent)]"></span>
              <span>{item}</span>
            </li>
          {/each}
        </ul>
      </div>
      <img
        src={page.hero.image}
        alt={page.hero.imageAlt}
        class="aspect-[4/3] w-full rounded-2xl object-cover shadow-medium"
        style="object-position: {page.hero.imagePosition ?? 'center'}"
        loading="lazy"
        width="720"
        height="540"
      />
    </div>
  </section>

  <!-- HOW WE HELP — three quiet blocks, track symbol as the section marker -->
  <section class="section bg-background">
    <div class="container mx-auto px-4">
      <div class="mx-auto mb-10 max-w-2xl text-center md:mx-0 md:text-left">
        <p class="mb-2 text-sm font-semibold uppercase tracking-wide text-primary-strong">How we help</p>
        <div class="mx-auto mb-6 h-1 w-20 bg-primary md:mx-0"></div>
        <h2 class="font-display text-3xl font-bold md:text-4xl">Clear support from inquiry to next steps</h2>
      </div>
      <div class="grid gap-10 md:grid-cols-3">
        {#each page.benefits as benefit}
          <article class="border-t border-border pt-6 text-center md:text-left">
            <div aria-hidden="true" class="adinkra mx-auto mb-5 h-8 w-8 md:mx-0" style="--symbol: url('{page.symbol}')"></div>
            <h3 class="font-display text-xl font-bold">{benefit.title}</h3>
            <p class="mt-3 leading-7 text-muted-foreground">{benefit.body}</p>
          </article>
        {/each}
      </div>
    </div>
  </section>

  <!-- PROCESS — numbered because it truly is a three-step intake -->
  <section class="section bg-background">
    <div class="container mx-auto px-4">
      <div class="mx-auto mb-12 max-w-2xl text-center">
        <p class="mb-2 text-sm font-semibold uppercase tracking-wide text-primary-strong">How it works</p>
        <h2 class="font-display text-3xl font-bold md:text-4xl">Three steps, start to follow-up</h2>
      </div>
      <div class="relative grid gap-10 md:grid-cols-3">
        <div aria-hidden="true" class="absolute left-0 right-0 top-9 hidden h-px bg-primary/40 md:block"></div>
        {#each page.process as step, index}
          <div class="relative text-center md:text-left">
            <p class="relative z-10 inline-block bg-background px-4 font-display text-6xl font-bold leading-none text-[color:var(--track-accent)] md:pl-0">
              0{index + 1}
            </p>
            <p class="mx-auto mt-4 max-w-xs text-lg leading-7 md:mx-0">{step}</p>
          </div>
        {/each}
      </div>
    </div>
  </section>

  {#if page.midImage}
    <!-- Evidence band — photography as proof, never as the headline -->
    <section class="section bg-background pt-0">
      <div class="container mx-auto px-4">
        <img
          src={page.midImage.src}
          alt={page.midImage.alt}
          class="h-64 w-full rounded-2xl object-cover shadow-medium md:h-80"
          loading="lazy"
          width={page.midImage.width}
          height={page.midImage.height}
        />
      </div>
    </section>
  {/if}

  <!-- INQUIRY FORM — the conversion moment, elevated -->
  <section id="inquiry" class="section bg-background">
    <div class="container mx-auto max-w-3xl px-4">
      <div class="mb-8 text-center md:text-left">
        <p class="mb-2 text-sm font-semibold uppercase tracking-wide text-primary-strong">Start the conversation</p>
        <div class="mx-auto mb-6 h-1 w-20 bg-primary md:mx-0"></div>
        <h2 class="font-display text-3xl font-bold md:text-4xl">{page.form.heading}</h2>
        <p class="mt-3 text-muted-foreground">
          Share a few details and the Alkebu-Lan Images team will follow up within two business days.
        </p>
      </div>

      <div class="card-modern border-t-2 p-6 md:p-8" style="border-top-color: var(--track-accent)">
        <div bind:this={statusRegion} tabindex="-1" aria-live="polite" class="outline-none">
          {#if form?.success}
            <div class="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{form.message}</div>
          {/if}
          {#if form?.error}
            <div class="mb-6 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{form.error}</div>
          {/if}
        </div>

        <form method="POST" class="grid gap-8" use:enhance onfocusincapture={onFormFocus}>
          <input type="hidden" name="inquiryType" value={page.type} />
          <input type="hidden" name="renderedAt" value={renderedAt} />
          <div class="hidden" aria-hidden="true">
            <label for="website">Website</label>
            <input id="website" name="website" tabindex="-1" autocomplete="off" value={values.website || ''} />
          </div>

          <fieldset class="grid gap-4 border-0 p-0">
            <legend class="mb-4 font-display text-lg font-bold">Contact</legend>
            <div class="grid gap-4 md:grid-cols-2">
              <label class="grid gap-2 text-sm font-medium">Name<input class="input-modern" name="name" autocomplete="name" value={values.name || ''} required /></label>
              <label class="grid gap-2 text-sm font-medium">Email<input class="input-modern" name="email" type="email" autocomplete="email" value={values.email || ''} required /></label>
              <label class="grid gap-2 text-sm font-medium">Phone<input class="input-modern" name="phone" type="tel" autocomplete="tel" value={values.phone || ''} /></label>
              <label class="grid gap-2 text-sm font-medium">Organization<input class="input-modern" name="organizationName" autocomplete="organization" value={values.organizationName || ''} required /></label>
            </div>
            <label class="grid gap-2 text-sm font-medium">Organization type<input class="input-modern" name="organizationType" value={values.organizationType || ''} required /></label>
          </fieldset>

          <fieldset class="grid gap-5 border-0 p-0">
            <legend class="mb-4 font-display text-lg font-bold">{page.form.detailLegend}</legend>
            {#each page.form.detailFields as field}
              {@const fieldErrorsForInput = errorsFor(field)}
              <div class="grid gap-2 text-sm font-medium">
                {#if field.type === 'checkboxes'}
                  <span id={`label-${errorId(field)}`}>{field.label}</span>
                  <div class="grid gap-2 sm:grid-cols-2" role="group" aria-labelledby={`label-${errorId(field)}`} aria-describedby={fieldErrorsForInput ? errorId(field) : undefined}>
                    {#each field.options as option}
                      <label class="flex items-center gap-2 border border-border px-3 py-2 text-sm font-normal transition-colors hover:border-kente-terracotta/60 hover:bg-primary/5">
                        <input type="checkbox" name={`${page.form.detailGroup}.${field.name}`} value={option} checked={(detailValues[field.name] || []).includes(option)} />
                        {optionLabel(option)}
                      </label>
                    {/each}
                  </div>
                {:else}
                  <label class="grid gap-2">
                    <span>{field.label}</span>
                    {#if field.type === 'textarea'}
                      <textarea class="textarea-modern" name={`${page.form.detailGroup}.${field.name}`} rows="4" required={field.required} aria-invalid={fieldErrorsForInput ? 'true' : undefined} aria-describedby={fieldErrorsForInput ? errorId(field) : undefined}>{detailValues[field.name] || ''}</textarea>
                    {:else if field.type === 'select'}
                      <select class="select-modern" name={`${page.form.detailGroup}.${field.name}`} required={field.required} value={detailValues[field.name] || ''} aria-invalid={fieldErrorsForInput ? 'true' : undefined} aria-describedby={fieldErrorsForInput ? errorId(field) : undefined}>
                        <option value="">Select one</option>
                        {#each field.options as option}
                          <option value={option}>{optionLabel(option)}</option>
                        {/each}
                      </select>
                    {:else}
                      <input class="input-modern" name={`${page.form.detailGroup}.${field.name}`} value={detailValues[field.name] || ''} required={field.required} aria-invalid={fieldErrorsForInput ? 'true' : undefined} aria-describedby={fieldErrorsForInput ? errorId(field) : undefined} />
                    {/if}
                  </label>
                {/if}
                {#if fieldErrorsForInput}
                  <p id={errorId(field)} class="text-sm font-normal text-destructive">{fieldErrorsForInput.join(' ')}</p>
                {/if}
              </div>
            {/each}
            <label class="grid gap-2 text-sm font-medium">Message<textarea class="textarea-modern" name="message" rows="5" required>{values.message || ''}</textarea></label>
          </fieldset>

          <div class="cf-turnstile" data-sitekey={PUBLIC_TURNSTILE_SITE_KEY} data-theme="light"></div>
          <button type="submit" class="btn-primary inline-flex items-center gap-2 justify-self-start"><Send class="h-5 w-5" />{page.form.submitLabel}</button>
        </form>
      </div>
    </div>
  </section>

  <!-- CROSS-LINKS — the other two tracks, each wearing its own symbol -->
  <section class="section bg-background">
    <div class="container mx-auto px-4">
      <h2 class="font-display text-2xl font-bold">Other ways to work with us</h2>
      <div class="mt-6 grid gap-4 md:grid-cols-2">
        {#each data.relatedPages as related}
          <a
            href={related.path}
            class="card-modern group flex items-start gap-4 p-5 transition-colors hover:border-kente-terracotta/60"
            style="--track-accent: {related.accent}"
          >
            <span aria-hidden="true" class="adinkra mt-1 h-10 w-10 shrink-0" style="--symbol: url('{related.symbol}')"></span>
            <span>
              <span class="block text-sm font-semibold uppercase tracking-wide text-primary-strong">{related.hero.eyebrow}</span>
              <span class="mt-1 block font-display text-lg font-bold">{related.hero.headline}</span>
              <span class="mt-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors group-hover:text-kente-terracotta">
                Learn more <ArrowRight class="h-4 w-4" />
              </span>
            </span>
          </a>
        {/each}
      </div>
    </div>
  </section>
</div>

<style>
  /* Adinkra symbols ship as flat SVG files; a mask lets the same file take any
     track accent without duplicating tinted assets. */
  .adinkra {
    background-color: var(--track-accent);
    -webkit-mask: var(--symbol) center / contain no-repeat;
    mask: var(--symbol) center / contain no-repeat;
  }

  .hero-enter {
    animation: none;
  }

  @media (prefers-reduced-motion: no-preference) {
    .hero-enter {
      animation: hero-fade 0.6s ease-out both;
    }

    @keyframes hero-fade {
      from {
        opacity: 0;
        transform: translateY(12px);
      }
      to {
        opacity: 1;
        transform: none;
      }
    }
  }
</style>
