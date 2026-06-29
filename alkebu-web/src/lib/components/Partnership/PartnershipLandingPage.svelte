<script>
  import { enhance } from '$app/forms';
  import { PUBLIC_TURNSTILE_SITE_KEY } from '$env/static/public';
  import Meta from '$lib/components/Meta.svelte';
  import { ArrowRight, CheckCircle2, ClipboardCheck, Layers3, PackageCheck, Send, Truck } from 'lucide-svelte';

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
  const benefitIcons = [PackageCheck, Layers3, Truck];

  const optionLabel = (option) => option.replaceAll('_', ' ');
  const errorsFor = (field) => fieldErrors[field.name] ?? fieldErrors[`${page.form.detailGroup}.${field.name}`];
</script>

<svelte:head>
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
</svelte:head>

<Meta {metadata} />

<section class="relative isolate overflow-hidden bg-kente-forest text-white">
  <img
    src={page.hero.image}
    alt=""
    class="absolute inset-0 h-full w-full object-cover"
    fetchpriority="high"
  />
  <div class="absolute inset-0 bg-gradient-to-r from-kente-forest via-kente-forest/88 to-kente-forest/40"></div>
  <div class="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-background to-transparent"></div>

  <div class="container relative z-10 mx-auto grid min-h-[680px] gap-10 px-4 py-20 lg:grid-cols-[1fr_0.92fr] lg:items-center lg:py-24">
    <div class="max-w-3xl">
      <p class="mb-4 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-kente-gold">
        <span class="h-px w-10 bg-kente-gold"></span>
        {page.hero.eyebrow}
      </p>
      <h1 class="font-display text-4xl font-bold leading-tight md:text-6xl">{page.hero.headline}</h1>
      <p class="mt-6 max-w-2xl text-lg leading-8 text-white/84">{page.hero.body}</p>
      <div class="mt-8 flex flex-wrap items-center gap-4">
        <a href="#inquiry" class="btn-primary btn-lg inline-flex items-center gap-2">
          {page.hero.cta}
          <ArrowRight class="h-5 w-5" />
        </a>
        <a href="tel:615-321-4111" class="inline-flex min-h-12 items-center border border-white/25 px-5 text-sm font-semibold text-white transition-colors hover:border-kente-gold hover:text-kente-gold">
          Talk with staff
        </a>
      </div>
    </div>

    <div class="relative lg:justify-self-end">
      <div class="absolute -right-2 -top-8 z-20 flex h-28 w-28 items-center justify-center rounded-full bg-primary p-4 text-center text-sm font-black uppercase leading-tight text-primary-foreground shadow-strong md:h-32 md:w-32">
        {page.hero.badge}
      </div>
      <div class="border border-white/15 bg-white/12 p-4 shadow-strong backdrop-blur-md md:p-5">
        <div class="grid gap-3 sm:grid-cols-2">
          {#each page.hero.tiles as tile}
            <div class="flex min-h-20 items-center gap-3 bg-background/95 p-4 text-foreground shadow-soft">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                <CheckCircle2 class="h-5 w-5" />
              </span>
              <span class="text-sm font-bold uppercase tracking-wide">{tile}</span>
            </div>
          {/each}
        </div>
        <div class="mt-4 bg-kente-forest/92 p-5 text-white">
          <h2 class="font-display text-2xl font-bold">Who this is for</h2>
          <div class="mt-4 grid gap-3">
            {#each page.fit as item}
              <div class="flex items-start gap-3 text-white/88">
                <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-kente-gold" />
                <span>{item}</span>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section bg-background">
  <div class="container mx-auto px-4">
    <div class="mb-10 max-w-2xl">
      <p class="mb-2 text-sm font-semibold uppercase tracking-wide text-primary-strong">Built for practical partnership</p>
      <h2 class="font-display text-3xl font-bold md:text-4xl">Clear support from inquiry to next steps</h2>
    </div>
    <div class="grid gap-6 md:grid-cols-3">
      {#each page.benefits as benefit, index}
        {@const Icon = benefitIcons[index % benefitIcons.length]}
        <article class="group border border-border bg-card p-6 shadow-soft transition-transform hover:-translate-y-1 hover:shadow-medium">
          <div class="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <Icon class="h-7 w-7" />
          </div>
          <h3 class="font-display text-xl font-bold">{benefit.title}</h3>
          <p class="mt-3 text-sm leading-6 text-muted-foreground">{benefit.body}</p>
        </article>
      {/each}
    </div>
  </div>
</section>

<section class="section bg-[#f7f1e5]">
  <div class="container mx-auto px-4">
    <div class="mx-auto max-w-3xl text-center">
      <p class="mb-2 text-sm font-semibold uppercase tracking-wide text-primary-strong">How it works</p>
      <h2 class="font-display text-3xl font-bold md:text-4xl">Simple next steps</h2>
    </div>
    <div class="mt-10 grid gap-5 md:grid-cols-3">
      {#each page.process as step, index}
        <div class="relative bg-background p-6 shadow-soft">
          <div class="absolute -top-5 left-6 flex h-10 w-10 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground shadow-medium">
            {index + 1}
          </div>
          <p class="mt-5 font-semibold leading-7">{step}</p>
        </div>
      {/each}
    </div>
  </div>
</section>

<section id="inquiry" class="section bg-background">
  <div class="container mx-auto px-4">
    <div class="grid overflow-hidden border border-border bg-card shadow-medium lg:grid-cols-[0.78fr_1.22fr]">
      <aside class="bg-kente-forest p-8 text-white md:p-10">
        <p class="mb-2 text-sm font-semibold uppercase tracking-wide text-kente-gold">Let's work together</p>
        <h2 class="font-display text-3xl font-bold">{page.form.heading}</h2>
        <p class="mt-4 text-white/78">Share a few details and the Alkebu-Lan Images team will follow up with next steps.</p>

        <div class="mt-8 border-t border-white/15 pt-7">
          <h3 class="flex items-center gap-2 text-lg font-bold"><ClipboardCheck class="h-5 w-5 text-kente-gold" />What happens next</h3>
          <div class="mt-5 grid gap-4">
            {#each page.process as step, index}
              <div class="flex gap-3 text-sm text-white/84">
                <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/12 text-xs font-bold text-kente-gold">{index + 1}</span>
                <span>{step}</span>
              </div>
            {/each}
          </div>
        </div>
      </aside>

      <div class="p-6 md:p-8">
        {#if form?.success}
          <div class="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{form.message}</div>
        {/if}
        {#if form?.error}
          <div class="mb-6 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{form.error}</div>
        {/if}

        <form method="POST" class="grid gap-5" use:enhance>
          <input type="hidden" name="inquiryType" value={page.type} />
          <div class="hidden" aria-hidden="true">
            <label for="website">Website</label>
            <input id="website" name="website" tabindex="-1" autocomplete="off" value={values.website || ''} />
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <label class="grid gap-2 text-sm font-medium">Name<input class="input-modern" name="name" value={values.name || ''} required /></label>
            <label class="grid gap-2 text-sm font-medium">Email<input class="input-modern" name="email" type="email" value={values.email || ''} required /></label>
            <label class="grid gap-2 text-sm font-medium">Phone<input class="input-modern" name="phone" type="tel" value={values.phone || ''} /></label>
            <label class="grid gap-2 text-sm font-medium">Organization<input class="input-modern" name="organizationName" value={values.organizationName || ''} required /></label>
          </div>

          <label class="grid gap-2 text-sm font-medium">Organization type<input class="input-modern" name="organizationType" value={values.organizationType || ''} required /></label>

          {#each page.form.detailFields as field}
            {@const fieldErrorsForInput = errorsFor(field)}
            <div class="grid gap-2 text-sm font-medium">
              <span>{field.label}</span>
              {#if field.type === 'textarea'}
                <textarea class="textarea-modern" name={`${page.form.detailGroup}.${field.name}`} rows="4" required={field.required}>{detailValues[field.name] || ''}</textarea>
              {:else if field.type === 'select'}
                <select class="select-modern" name={`${page.form.detailGroup}.${field.name}`} required={field.required} value={detailValues[field.name] || ''}>
                  <option value="">Select one</option>
                  {#each field.options as option}
                    <option value={option}>{optionLabel(option)}</option>
                  {/each}
                </select>
              {:else if field.type === 'checkboxes'}
                <div class="grid gap-2 sm:grid-cols-2">
                  {#each field.options as option}
                    <label class="flex items-center gap-2 border border-border px-3 py-2 text-sm font-normal transition-colors hover:border-primary/50 hover:bg-primary/5">
                      <input type="checkbox" name={`${page.form.detailGroup}.${field.name}`} value={option} checked={(detailValues[field.name] || []).includes(option)} />
                      {optionLabel(option)}
                    </label>
                  {/each}
                </div>
              {:else}
                <input class="input-modern" name={`${page.form.detailGroup}.${field.name}`} value={detailValues[field.name] || ''} required={field.required} />
              {/if}
              {#if fieldErrorsForInput}
                <p class="text-sm text-destructive">{fieldErrorsForInput.join(' ')}</p>
              {/if}
            </div>
          {/each}

          <label class="grid gap-2 text-sm font-medium">Message<textarea class="textarea-modern" name="message" rows="5" required>{values.message || ''}</textarea></label>
          <div class="cf-turnstile" data-sitekey={PUBLIC_TURNSTILE_SITE_KEY} data-theme="light"></div>
          <button type="submit" class="btn-primary inline-flex items-center gap-2 justify-self-start"><Send class="h-5 w-5" />{page.form.submitLabel}</button>
        </form>
      </div>
    </div>
  </div>
</section>

<section class="section bg-muted/30">
  <div class="container mx-auto px-4">
    <h2 class="font-display text-2xl font-bold">Other ways to work with us</h2>
    <div class="mt-6 grid gap-4 md:grid-cols-2">
      {#each data.relatedPages as related}
        <a href={related.path} class="block border border-border bg-card p-5 shadow-soft transition-transform hover:-translate-y-1 hover:shadow-medium">
          <p class="font-semibold">{related.hero.eyebrow}</p>
          <p class="mt-2 text-sm text-muted-foreground">{related.hero.headline}</p>
        </a>
      {/each}
    </div>
  </div>
</section>
