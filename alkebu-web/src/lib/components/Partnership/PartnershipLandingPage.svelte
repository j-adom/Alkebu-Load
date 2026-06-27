<script>
  import { enhance } from '$app/forms';
  import { PUBLIC_TURNSTILE_SITE_KEY } from '$env/static/public';
  import Meta from '$lib/components/Meta.svelte';
  import { ArrowRight, CheckCircle2, Send } from 'lucide-svelte';

  let { data, form } = $props();
  const page = $derived(data.page);
  const metadata = $derived({
    title: page.seo.title,
    description: page.seo.description,
    image: '/assets/images/resources/logo.png',
    imageAlt: 'Alkebu-Lan Images Logo',
    url: page.path,
  });
  const values = $derived(form?.values ?? {});
  const detailValues = $derived(values?.[page.form.detailGroup] ?? {});
  const fieldErrors = $derived(form?.fieldErrors ?? {});

  const optionLabel = (option) => option.replaceAll('_', ' ');
  const errorsFor = (field) => fieldErrors[field.name] ?? fieldErrors[`${page.form.detailGroup}.${field.name}`];
</script>

<svelte:head>
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
</svelte:head>

<Meta {metadata} />

<section class="relative overflow-hidden bg-kente-forest text-white">
  <div class="absolute inset-0 bg-gradient-to-br from-kente-forest via-kente-indigo/80 to-kente-forest"></div>
  <div class="container relative z-10 mx-auto grid gap-10 px-4 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
    <div>
      <p class="mb-3 text-sm font-semibold uppercase tracking-wide text-kente-gold">{page.hero.eyebrow}</p>
      <h1 class="font-display text-4xl font-bold leading-tight md:text-5xl">{page.hero.headline}</h1>
      <p class="mt-5 max-w-2xl text-lg text-white/80">{page.hero.body}</p>
      <a href="#inquiry" class="btn-primary btn-lg mt-8 inline-flex items-center gap-2">
        {page.hero.cta}
        <ArrowRight class="h-5 w-5" />
      </a>
    </div>
    <div class="rounded-lg border border-white/15 bg-white/10 p-6 backdrop-blur">
      <h2 class="font-display text-2xl font-bold">Who this is for</h2>
      <div class="mt-5 grid gap-3">
        {#each page.fit as item}
          <div class="flex items-start gap-3 text-white/90">
            <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-kente-gold" />
            <span>{item}</span>
          </div>
        {/each}
      </div>
    </div>
  </div>
</section>

<section class="section bg-background">
  <div class="container mx-auto px-4">
    <div class="grid gap-6 md:grid-cols-3">
      {#each page.benefits as benefit}
        <article class="card-modern p-6">
          <h2 class="font-display text-xl font-bold">{benefit.title}</h2>
          <p class="mt-3 text-sm leading-6 text-muted-foreground">{benefit.body}</p>
        </article>
      {/each}
    </div>
  </div>
</section>

<section class="section bg-muted/30">
  <div class="container mx-auto px-4">
    <div class="mx-auto max-w-3xl text-center">
      <p class="mb-2 text-sm font-semibold uppercase tracking-wide text-primary-strong">How it works</p>
      <h2 class="font-display text-3xl font-bold">Simple next steps</h2>
    </div>
    <div class="mt-10 grid gap-6 md:grid-cols-3">
      {#each page.process as step, index}
        <div class="text-center">
          <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
            {index + 1}
          </div>
          <p class="mt-4 font-semibold">{step}</p>
        </div>
      {/each}
    </div>
  </div>
</section>

<section id="inquiry" class="section bg-background">
  <div class="container mx-auto grid gap-10 px-4 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
    <div>
      <p class="mb-2 text-sm font-semibold uppercase tracking-wide text-primary-strong">Let's work together</p>
      <h2 class="font-display text-3xl font-bold">{page.form.heading}</h2>
      <p class="mt-4 text-muted-foreground">Share a few details and the Alkebu-Lan Images team will follow up with next steps.</p>
    </div>

    <div class="card-modern p-6 md:p-8">
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
                  <label class="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-normal">
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
</section>

<section class="section bg-muted/30">
  <div class="container mx-auto px-4">
    <h2 class="font-display text-2xl font-bold">Other ways to work with us</h2>
    <div class="mt-6 grid gap-4 md:grid-cols-2">
      {#each data.relatedPages as related}
        <a href={related.path} class="card-modern block p-5 transition-transform hover:-translate-y-1">
          <p class="font-semibold">{related.hero.eyebrow}</p>
          <p class="mt-2 text-sm text-muted-foreground">{related.hero.headline}</p>
        </a>
      {/each}
    </div>
  </div>
</section>
