# Partnership Landing Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship three prerendered partnership landing pages (`/wholesale`,
`/institutional-contracts`, `/non-profit-projects`) with tailored, Turnstile-
protected inquiry forms that store leads in Payload, notify staff, and acknowledge
the inquirer.

**Architecture:** One SvelteKit landing-page shell driven by a per-track config
object renders all three routes. Forms POST to a new Payload endpoint
(`/api/partnership-inquiry`) that verifies Turnstile via a shared helper,
rate-limits, validates against the same schema the form uses, stores a
`PartnershipInquiries` record, then sends two best-effort branded emails (staff +
inquirer) recording each outcome on the record.

**Tech Stack:** SvelteKit (Svelte 5) + Tailwind (existing tokens) on the frontend;
Payload CMS 3.x + Node test runner + Nodemailer/SES on the backend.

**Source spec:** [docs/superpowers/specs/2026-06-26-partnership-landing-pages-design.md](../specs/2026-06-26-partnership-landing-pages-design.md)

## Global Constraints

- Backend package manager: **pnpm** (`alkebu-load/`). Frontend: **npm** (`alkebu-web/`).
- Backend tests: `pnpm test` (Node test runner, `tests/**/*.test.ts`); the script
  injects `STRIPE_SECRET_KEY=sk_test_dummy` — always run via the script, never bare.
- After any collection change: `pnpm generate:types`. Strict build mode — `pnpm build`
  fails on type/lint warnings.
- Backend must be running (`pnpm dev` on `:3000`) before the frontend (`npm run dev`
  on `:5173`).
- Money/IDs: not applicable here, but **never** trust staff-only or system fields from
  the public request body.
- Turnstile env: backend `TURNSTILE_SECRET_KEY`, frontend `PUBLIC_TURNSTILE_SITE_KEY`.
- Email recipient comes from `getEmailRuntimeConfig().staffNotificationEmail`; emails
  use the existing `emailWrapper`/`sectionBox`/`formatCents` helpers in
  `emailTemplates.ts` (same-file private helpers — new templates live in that file).
- Brand classes to reuse verbatim: `.section`, `.container`, `.card-modern`,
  `.btn-primary`, `.btn-lg`, `.btn-outline`, `.input-modern`, `.select-modern`,
  `.textarea-modern`, eyebrow = `text-primary-strong font-semibold uppercase
  tracking-wide`, gold bar = `w-20 h-1 bg-primary`.
- Track accents (existing tokens): wholesale `#D4AF37` (kente-gold), institutional
  `#3D4F7C` (kente-indigo), nonprofit `#2D5A3D` (kente-forest); shared hover accent
  terracotta `#C45C35`.
- Local DB is SQLite with Payload push mode — the new collection's table is created
  automatically on `pnpm dev`. Production is Postgres (see Deployment note at end).

---

## Phase A — Visual prototype (wholesale page, frontend only)

> Goal of this phase: a real, locally-viewable `/wholesale` page with final look and
> a non-submitting form, so the look can be locked before any backend work.
> **Ends at Checkpoint 1 (local visual review).**

### Task 1: Partnership config + types

**Files:**
- Create: `alkebu-web/src/lib/partnership/config.ts`
- Create: `alkebu-web/src/lib/partnership/types.ts`

**Interfaces:**
- Produces: `PartnershipConfig`, `PartnershipFieldDef`, `partnershipConfigs` (a
  `Record<InquiryType, PartnershipConfig>`), `InquiryType =
  'wholesale' | 'institutional' | 'nonprofit'`, `getPartnershipConfig(slug)`.

- [ ] **Step 1: Define types**

```ts
// alkebu-web/src/lib/partnership/types.ts
export type InquiryType = 'wholesale' | 'institutional' | 'nonprofit';

export interface PartnershipFieldDef {
  name: string;                 // maps to a detail-group key on the backend
  label: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select';
  required?: boolean;
  options?: string[];           // for select
  placeholder?: string;
  autocomplete?: string;
}

export interface PartnershipConfig {
  type: InquiryType;
  slug: string;                 // e.g. 'wholesale'
  route: string;                // e.g. '/wholesale'
  accent: string;               // hex, drives --track-accent
  symbol: string;               // /assets path to the Adinkra SVG
  seo: { title: string; description: string; ogImage?: string };
  eyebrow: string;
  heroHeadline: string;
  heroSubhead: string;          // rendered in Lora italic
  ctaLabel: string;
  trustSignals: string[];       // hairline-divided row
  fit: { heading: string; body: string; image: string };
  benefits: { title: string; body: string }[];   // exactly 3
  process: { title: string; body: string }[];     // exactly 3
  // shared core fields (name/email/phone/org/message) are rendered by the shell;
  // these are the page-specific detail fields only:
  detailFields: PartnershipFieldDef[];
  crossLinks: InquiryType[];    // the other two
}
```

- [ ] **Step 2: Write the wholesale config (other two added in Task 11)**

```ts
// alkebu-web/src/lib/partnership/config.ts
import type { InquiryType, PartnershipConfig } from './types';

export const partnershipConfigs: Partial<Record<InquiryType, PartnershipConfig>> = {
  wholesale: {
    type: 'wholesale',
    slug: 'wholesale',
    route: '/wholesale',
    accent: '#D4AF37',
    symbol: '/assets/images/alkebulan/basket-4.svg',
    seo: {
      title: 'Wholesale | Alkebu-Lan Images',
      description:
        'Stock your shelves with culturally relevant books at volume from Nashville’s Black-owned bookstore. Bulk pricing, custom curation, invoice-friendly terms.',
    },
    eyebrow: 'Wholesale',
    heroHeadline: 'Stock your shelves with books that matter.',
    heroSubhead:
      'Bulk sourcing and curation for retailers and organizations, from a bookstore that knows the catalog.',
    ctaLabel: 'Start an inquiry',
    trustSignals: ['Nashville Black-owned', 'Net-30 available', 'Bulk & custom curation'],
    fit: {
      heading: 'Who wholesale is for',
      body: 'Retailers, organizations, and bulk buyers sourcing culturally relevant titles for resale or distribution.',
      image: '/assets/images/alkebulan/shelf.jpg',
    },
    benefits: [
      { title: 'Bulk book sourcing', body: 'Volume pricing on the titles your customers actually want.' },
      { title: 'Culturally relevant curation', body: 'We help you choose, not just fulfill.' },
      { title: 'Invoice-friendly workflows', body: 'Purchase orders and Net-30 terms for qualified buyers.' },
    ],
    process: [
      { title: 'Tell us what you need', body: 'Volume, categories, timeline.' },
      { title: 'We review the request', body: 'We confirm availability and pricing.' },
      { title: 'We follow up', body: 'You get a quote and next steps.' },
    ],
    detailFields: [
      { name: 'expectedVolume', label: 'Expected order volume', type: 'text', placeholder: 'e.g. 50–100 titles / quarter' },
      { name: 'productInterests', label: 'Product interests', type: 'textarea' },
      { name: 'resaleOrDistribution', label: 'Resale or distribution needs', type: 'textarea' },
    ],
    crossLinks: ['institutional', 'nonprofit'],
  },
};

export function getPartnershipConfig(slug: string): PartnershipConfig | undefined {
  return Object.values(partnershipConfigs).find((c) => c?.slug === slug);
}
```

- [ ] **Step 3: Type-check**

Run: `cd alkebu-web && npm run check`
Expected: PASS (no type errors). If `shelf.jpg` does not exist yet, that is fine —
it is referenced as a path, not imported; substitute any existing image under
`static/assets/images/` until art is provided.

- [ ] **Step 4: Commit**

```bash
git add alkebu-web/src/lib/partnership/
git commit -m "feat(web): partnership config + types (wholesale)"
```

### Task 2: Landing-page shell components

**Files:**
- Create: `alkebu-web/src/lib/partnership/PartnershipShell.svelte`
- Create: `alkebu-web/src/lib/partnership/sections/Hero.svelte`
- Create: `alkebu-web/src/lib/partnership/sections/Fit.svelte`
- Create: `alkebu-web/src/lib/partnership/sections/HowWeHelp.svelte`
- Create: `alkebu-web/src/lib/partnership/sections/Process.svelte`
- Create: `alkebu-web/src/lib/partnership/sections/CrossLinks.svelte`

**Interfaces:**
- Consumes: `PartnershipConfig` (Task 1).
- Produces: `<PartnershipShell config={...}>` which lays out Hero → Fit → HowWeHelp →
  Process → `<slot name="form" />` → CrossLinks, and sets `--track-accent` on its root.

- [ ] **Step 1: Shell with track-accent theming**

```svelte
<!-- PartnershipShell.svelte -->
<script lang="ts">
  import type { PartnershipConfig } from './types';
  import Hero from './sections/Hero.svelte';
  import Fit from './sections/Fit.svelte';
  import HowWeHelp from './sections/HowWeHelp.svelte';
  import Process from './sections/Process.svelte';
  import CrossLinks from './sections/CrossLinks.svelte';
  let { config }: { config: PartnershipConfig } = $props();
</script>

<div class="partnership" style={`--track-accent: ${config.accent};`}>
  <Hero {config} />
  <Fit {config} />
  <HowWeHelp {config} />
  <Process {config} />
  <slot name="form" />
  <CrossLinks {config} />
</div>
```

- [ ] **Step 2: Hero (type + watermark symbol, NOT a photo scrim)**

```svelte
<!-- sections/Hero.svelte -->
<script lang="ts">
  import type { PartnershipConfig } from '../types';
  let { config }: { config: PartnershipConfig } = $props();
</script>

<section class="section bg-background relative overflow-hidden">
  <img src={config.symbol} alt="" aria-hidden="true"
       class="pointer-events-none absolute -right-10 top-1/2 -translate-y-1/2 w-[420px] max-w-[55%] opacity-[0.07]"
       style="filter: none; color: var(--track-accent);" />
  <div class="container mx-auto px-4 relative z-10 max-w-3xl">
    <p class="text-primary-strong font-semibold uppercase tracking-wide mb-2">{config.eyebrow}</p>
    <h1 class="font-display font-bold tracking-tight text-5xl md:text-6xl lg:text-7xl mb-4">
      {config.heroHeadline}
    </h1>
    <div class="w-20 h-1 bg-primary mb-6"></div>
    <p class="font-serif italic text-xl text-muted-foreground mb-8">{config.heroSubhead}</p>
    <a href="#inquiry" class="btn-primary btn-lg">{config.ctaLabel}</a>
    <ul class="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
      {#each config.trustSignals as sig, i}
        <li class={i > 0 ? 'border-l border-border pl-6' : ''}>{sig}</li>
      {/each}
    </ul>
  </div>
</section>
```

- [ ] **Step 3: Fit, HowWeHelp, Process, CrossLinks sections**

Build each reusing the brand section pattern (eyebrow + `w-20 h-1 bg-primary` + `font-display` heading). Concrete structure:

```svelte
<!-- sections/Fit.svelte -->
<script lang="ts">
  import type { PartnershipConfig } from '../types';
  let { config }: { config: PartnershipConfig } = $props();
</script>
<section class="section">
  <div class="container mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
    <div>
      <h2 class="text-3xl md:text-4xl font-bold font-display mb-4">{config.fit.heading}</h2>
      <div class="w-20 h-1 bg-primary mb-6"></div>
      <p class="text-lg text-muted-foreground">{config.fit.body}</p>
    </div>
    <img src={config.fit.image} alt="" class="rounded-2xl shadow-medium w-full aspect-[4/3] object-cover" />
  </div>
</section>
```

```svelte
<!-- sections/HowWeHelp.svelte -->
<script lang="ts">
  import type { PartnershipConfig } from '../types';
  let { config }: { config: PartnershipConfig } = $props();
</script>
<section class="section bg-muted/30">
  <div class="container mx-auto px-4">
    <div class="text-center mb-12">
      <p class="text-primary-strong font-semibold uppercase tracking-wide mb-2">How we help</p>
      <div class="w-20 h-1 bg-primary mx-auto"></div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      {#each config.benefits as b}
        <div class="card-modern p-6">
          <span class="block w-10 h-1 mb-4" style="background: var(--track-accent);"></span>
          <h3 class="font-display text-xl font-bold mb-2">{b.title}</h3>
          <p class="text-muted-foreground">{b.body}</p>
        </div>
      {/each}
    </div>
  </div>
</section>
```

```svelte
<!-- sections/Process.svelte — numbered 01/02/03 (a real sequence) -->
<script lang="ts">
  import type { PartnershipConfig } from '../types';
  let { config }: { config: PartnershipConfig } = $props();
</script>
<section class="section">
  <div class="container mx-auto px-4">
    <div class="text-center mb-12">
      <p class="text-primary-strong font-semibold uppercase tracking-wide mb-2">How it works</p>
      <div class="w-20 h-1 bg-primary mx-auto"></div>
    </div>
    <ol class="grid grid-cols-1 md:grid-cols-3 gap-8">
      {#each config.process as step, i}
        <li>
          <span class="font-display text-4xl font-bold" style="color: var(--track-accent);">
            {String(i + 1).padStart(2, '0')}
          </span>
          <h3 class="font-display text-xl font-bold mt-2 mb-1">{step.title}</h3>
          <p class="text-muted-foreground">{step.body}</p>
        </li>
      {/each}
    </ol>
  </div>
</section>
```

```svelte
<!-- sections/CrossLinks.svelte -->
<script lang="ts">
  import type { PartnershipConfig } from '../types';
  import { partnershipConfigs } from '../config';
  let { config }: { config: PartnershipConfig } = $props();
  const others = config.crossLinks
    .map((t) => partnershipConfigs[t])
    .filter((c): c is NonNullable<typeof c> => Boolean(c));
</script>
<section class="section bg-muted/30">
  <div class="container mx-auto px-4">
    <h2 class="text-2xl font-bold font-display mb-8 text-center">Other ways to work with us</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
      {#each others as o}
        <a href={o.route} class="card-modern p-6 flex items-center gap-4 group">
          <img src={o.symbol} alt="" aria-hidden="true" class="w-12 h-12 opacity-70" style="color: {o.accent};" />
          <span class="font-display text-lg font-semibold group-hover:text-primary">{o.eyebrow}</span>
        </a>
      {/each}
    </div>
  </div>
</section>
```

- [ ] **Step 4: Run svelte-autofixer on every new component**

Use the Svelte MCP `svelte-autofixer` on each `.svelte` file; loop until no issues.
Then: `cd alkebu-web && npm run check:svelte` → Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add alkebu-web/src/lib/partnership/
git commit -m "feat(web): partnership landing shell + sections"
```

### Task 3: Inquiry form component (UI only, accessible, non-submitting)

**Files:**
- Create: `alkebu-web/src/lib/partnership/InquiryForm.svelte`

**Interfaces:**
- Consumes: `PartnershipConfig` (Task 1).
- Produces: `<InquiryForm config={...} />` rendering core fields (name, email, phone,
  organizationName, organizationType, message) + a `<fieldset>` of `config.detailFields`,
  a honeypot, a hidden `renderedAt` timestamp, the Turnstile widget div, and a submit
  button. In this task the form does NOT submit (wired in Task 10).

- [ ] **Step 1: Build the form with the brand input classes + a11y**

```svelte
<!-- InquiryForm.svelte -->
<script lang="ts">
  import { PUBLIC_TURNSTILE_SITE_KEY } from '$env/static/public';
  import type { PartnershipConfig } from './types';
  let { config }: { config: PartnershipConfig } = $props();
  const renderedAt = Date.now();
</script>

<section id="inquiry" class="section">
  <div class="container mx-auto px-4 max-w-2xl">
    <div class="card-modern p-8" style="border-top: 2px solid var(--track-accent);">
      <h2 class="text-2xl font-bold font-display mb-6">Send your {config.eyebrow.toLowerCase()} inquiry</h2>
      <form method="POST" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- honeypot (visually hidden, not display:none so bots fill it) -->
        <input type="text" name="website" tabindex="-1" autocomplete="off"
               class="absolute left-[-9999px]" aria-hidden="true" />
        <input type="hidden" name="renderedAt" value={renderedAt} />
        <input type="hidden" name="inquiryType" value={config.type} />

        <div>
          <label for="name" class="block text-sm font-medium mb-2">Name</label>
          <input id="name" name="name" required autocomplete="name" class="input-modern" />
        </div>
        <div>
          <label for="email" class="block text-sm font-medium mb-2">Email</label>
          <input id="email" name="email" type="email" required autocomplete="email" class="input-modern" />
        </div>
        <div>
          <label for="phone" class="block text-sm font-medium mb-2">Phone</label>
          <input id="phone" name="phone" type="tel" autocomplete="tel" class="input-modern" />
        </div>
        <div>
          <label for="organizationName" class="block text-sm font-medium mb-2">Organization</label>
          <input id="organizationName" name="organizationName" autocomplete="organization" class="input-modern" />
        </div>

        <fieldset class="md:col-span-2 border border-border rounded-xl p-4">
          <legend class="px-2 text-sm font-medium">{config.eyebrow} details</legend>
          <div class="grid grid-cols-1 gap-4">
            {#each config.detailFields as f}
              <div>
                <label for={f.name} class="block text-sm font-medium mb-2">{f.label}</label>
                {#if f.type === 'textarea'}
                  <textarea id={f.name} name={f.name} class="textarea-modern" placeholder={f.placeholder ?? ''}></textarea>
                {:else if f.type === 'select'}
                  <select id={f.name} name={f.name} class="select-modern">
                    <option value="">Select…</option>
                    {#each f.options ?? [] as opt}<option>{opt}</option>{/each}
                  </select>
                {:else}
                  <input id={f.name} name={f.name} type={f.type} class="input-modern" placeholder={f.placeholder ?? ''} />
                {/if}
              </div>
            {/each}
          </div>
        </fieldset>

        <div class="md:col-span-2">
          <label for="message" class="block text-sm font-medium mb-2">Message</label>
          <textarea id="message" name="message" required class="textarea-modern"></textarea>
        </div>

        <div class="md:col-span-2 cf-turnstile" data-sitekey={PUBLIC_TURNSTILE_SITE_KEY} data-theme="light"></div>
        <div class="md:col-span-2">
          <button type="submit" class="btn-primary btn-lg w-full">{config.ctaLabel}</button>
        </div>
      </form>
    </div>
  </div>
</section>
```

- [ ] **Step 2: svelte-autofixer + check**

Run `svelte-autofixer` until clean; `npm run check:svelte` → 0 errors.

- [ ] **Step 3: Commit**

```bash
git add alkebu-web/src/lib/partnership/InquiryForm.svelte
git commit -m "feat(web): accessible partnership inquiry form (UI)"
```

### Task 4: `/wholesale` route + SEO + prerender

**Files:**
- Create: `alkebu-web/src/routes/wholesale/+page.svelte`
- Create: `alkebu-web/src/routes/wholesale/+page.ts`

**Interfaces:**
- Consumes: `getPartnershipConfig`, `PartnershipShell`, `InquiryForm`.

- [ ] **Step 1: Page + prerender flag**

```ts
// +page.ts
export const prerender = true;
```

```svelte
<!-- +page.svelte -->
<script lang="ts">
  import { getPartnershipConfig } from '$lib/partnership/config';
  import PartnershipShell from '$lib/partnership/PartnershipShell.svelte';
  import InquiryForm from '$lib/partnership/InquiryForm.svelte';
  const config = getPartnershipConfig('wholesale')!;
</script>

<svelte:head>
  <title>{config.seo.title}</title>
  <meta name="description" content={config.seo.description} />
  <link rel="canonical" href="https://alkebulanimages.com{config.route}" />
  <meta property="og:title" content={config.seo.title} />
  <meta property="og:description" content={config.seo.description} />
  {@html `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'Service',
    serviceType: 'Wholesale book supply', provider: { '@type': 'Organization', name: 'Alkebu-Lan Images' },
    areaServed: 'US', name: config.seo.title, description: config.seo.description,
  })}</` + `script>`}
</svelte:head>

<PartnershipShell {config}>
  <InquiryForm slot="form" {config} />
</PartnershipShell>
```

- [ ] **Step 2: Load Turnstile script** — confirm `https://challenges.cloudflare.com/turnstile/v0/api.js`
  is loaded (add to `src/app.html` if not already global). Verify with: `grep -rn "turnstile/v0/api.js" alkebu-web/src/app.html`.

- [ ] **Step 3: Run dev + smoke the route**

```bash
cd alkebu-load && pnpm dev    # terminal 1 (backend on :3000)
cd alkebu-web && npm run dev   # terminal 2 (frontend on :5173)
```
Open `http://localhost:5173/wholesale`. Expected: full page renders with hero,
watermark symbol, sections, and form.

- [ ] **Step 4: Commit**

```bash
git add alkebu-web/src/routes/wholesale/
git commit -m "feat(web): /wholesale route with SEO + prerender"
```

### ✅ CHECKPOINT 1 — Local visual review

Stop. Take screenshots of `/wholesale` at desktop + mobile widths, self-critique
against the spec's **Visual Design** section (watermark restraint, Lora subhead,
gold rhythm, accent usage), then show the user. **Lock the look before Phase B.**
Iterate here on copy, spacing, symbol scale/recolor, and image choice.

---

## Phase B — Backend lead capture

> Produces: shared Turnstile helper, `PartnershipInquiries` collection, two email
> templates + senders, and the `/api/partnership-inquiry` endpoint. Each task is
> independently testable with `pnpm test`.

### Task 5: Shared Turnstile helper (TDD) + refactor contact route

**Files:**
- Create: `alkebu-load/src/app/utils/turnstile.ts`
- Create: `alkebu-load/tests/security/turnstile.test.ts`
- Modify: `alkebu-load/src/app/api/contact/route.ts` (use the helper)

**Interfaces:**
- Produces: `verifyTurnstileToken(token: string, remoteIp: string): Promise<{ success: boolean; error?: string }>`
  and `getClientIp(headers: Headers): string`.

- [ ] **Step 1: Failing test**

```ts
// tests/security/turnstile.test.ts
import { test } from 'node:test';
import assert from 'node:assert';
import { getClientIp } from '../../src/app/utils/turnstile';

test('getClientIp prefers cf-connecting-ip', () => {
  const h = new Headers({ 'cf-connecting-ip': '1.2.3.4', 'x-forwarded-for': '9.9.9.9, 8.8.8.8' });
  assert.equal(getClientIp(h), '1.2.3.4');
});

test('getClientIp falls back to first x-forwarded-for', () => {
  const h = new Headers({ 'x-forwarded-for': '9.9.9.9, 8.8.8.8' });
  assert.equal(getClientIp(h), '9.9.9.9');
});

test('getClientIp returns "unknown" when absent', () => {
  assert.equal(getClientIp(new Headers()), 'unknown');
});
```

- [ ] **Step 2: Run → fail**

Run: `cd alkebu-load && pnpm test 2>&1 | grep turnstile` → Expected: FAIL (module not found).

- [ ] **Step 3: Implement** (lift the inline logic from `contact/route.ts:19-60`
  verbatim into the helper; add `getClientIp`).

```ts
// src/app/utils/turnstile.ts
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export function getClientIp(headers: Headers): string {
  const cf = headers.get('cf-connecting-ip');
  if (cf) return cf;
  const xff = headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return 'unknown';
}

export async function verifyTurnstileToken(
  token: string, remoteIp: string,
): Promise<{ success: boolean; error?: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.error('TURNSTILE_SECRET_KEY is not set; rejecting submission.');
    return { success: false, error: 'Bot protection is not configured on the server.' };
  }
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp && remoteIp !== 'unknown') body.set('remoteip', remoteIp);
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
    });
    if (!res.ok) return { success: false, error: 'Bot check failed. Please try again.' };
    const data = (await res.json()) as { success?: boolean; 'error-codes'?: string[] };
    if (data.success !== true) return { success: false, error: 'Bot check failed. Please refresh and try again.' };
    return { success: true };
  } catch {
    return { success: false, error: 'Bot check failed. Please try again in a moment.' };
  }
}
```

- [ ] **Step 4: Run → pass.** `pnpm test 2>&1 | grep -E "turnstile|# fail"` → tests pass, 0 fail.

- [ ] **Step 5: Refactor contact route** to import `verifyTurnstileToken`/`getClientIp`
  and delete its inline copies. Verify: `pnpm build` exits 0 and the contact form still
  works locally (POST a test message).

- [ ] **Step 6: Commit**

```bash
git add alkebu-load/src/app/utils/turnstile.ts alkebu-load/tests/security/turnstile.test.ts alkebu-load/src/app/api/contact/route.ts
git commit -m "refactor(api): shared Turnstile helper; contact route uses it"
```

### Task 6: `PartnershipInquiries` collection

**Files:**
- Create: `alkebu-load/src/collections/PartnershipInquiries.ts`
- Modify: `alkebu-load/src/payload.config.ts` (register collection)

**Interfaces:**
- Produces: collection slug `partnership-inquiries`; fields per the spec's data model
  (trimmed CRM). Used by Task 9.

- [ ] **Step 1: Define the collection** (mirror the Reviews access pattern; staff-only
  fields hidden via `admin.condition`).

```ts
// src/collections/PartnershipInquiries.ts
import type { CollectionConfig } from 'payload';

const isStaff = (user: any) => user?.role === 'admin' || user?.role === 'staff';
const staffOnly = { admin: { condition: (_: any, __: any, { user }: any) => isStaff(user) } };

export const PartnershipInquiries: CollectionConfig = {
  slug: 'partnership-inquiries',
  admin: {
    useAsTitle: 'organizationName',
    defaultColumns: ['inquiryType', 'organizationName', 'status', 'submittedAt'],
    group: 'Commerce',
  },
  access: {
    read: ({ req: { user } }) => isStaff(user),
    create: () => true,         // public create via the protected endpoint only
    update: ({ req: { user } }) => isStaff(user),
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    { name: 'inquiryType', type: 'select', required: true,
      options: [
        { label: 'Wholesale', value: 'wholesale' },
        { label: 'Institutional', value: 'institutional' },
        { label: 'Non-profit', value: 'nonprofit' },
      ] },
    { name: 'status', type: 'select', defaultValue: 'new', ...staffOnly,
      options: ['new', 'contacted', 'qualified', 'won', 'lost'].map((v) => ({ label: v, value: v })) },
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true },
    { name: 'phone', type: 'text' },
    { name: 'organizationName', type: 'text' },
    { name: 'organizationType', type: 'text' },
    { name: 'message', type: 'textarea' },
    { name: 'sourcePath', type: 'text' },
    { name: 'submittedAt', type: 'date' },
    // Typed groups (spec decision: admin readability over JSON flexibility). Only the
    // group matching inquiryType is populated; the validator (T9) writes the right one.
    { name: 'wholesaleDetails', type: 'group', admin: { condition: (d: any) => d?.inquiryType === 'wholesale' }, fields: [
      { name: 'expectedVolume', type: 'text' },
      { name: 'productInterests', type: 'textarea' },
      { name: 'resaleOrDistribution', type: 'textarea' },
    ] },
    { name: 'institutionalDetails', type: 'group', admin: { condition: (d: any) => d?.inquiryType === 'institutional' }, fields: [
      { name: 'institutionType', type: 'text' },
      { name: 'purchasingMethod', type: 'text' },
      { name: 'taxExemptStatus', type: 'text' },
      { name: 'audienceOrStudentGroup', type: 'text' },
      { name: 'targetTimeline', type: 'text' },
    ] },
    { name: 'nonprofitDetails', type: 'group', admin: { condition: (d: any) => d?.inquiryType === 'nonprofit' }, fields: [
      { name: 'projectType', type: 'text' },
      { name: 'missionContext', type: 'textarea' },
      { name: 'targetTimeline', type: 'text' },
      { name: 'budgetRange', type: 'text' },
      { name: 'supportRequested', type: 'textarea' },
    ] },
    // pipeline (staff-only)
    { name: 'followUpDate', type: 'date', ...staffOnly },
    { name: 'internalNotes', type: 'textarea', ...staffOnly },
    { name: 'assignedTo', type: 'relationship', relationTo: 'users', ...staffOnly },
    // email status (staff-only)
    { name: 'staffEmail', type: 'group', ...staffOnly, fields: [
      { name: 'status', type: 'select', options: ['pending','sent','failed','skipped'].map((v)=>({label:v,value:v})) },
      { name: 'sentAt', type: 'date' }, { name: 'error', type: 'textarea' },
    ] },
    { name: 'acknowledgementEmail', type: 'group', ...staffOnly, fields: [
      { name: 'status', type: 'select', options: ['pending','sent','failed','skipped'].map((v)=>({label:v,value:v})) },
      { name: 'sentAt', type: 'date' }, { name: 'error', type: 'textarea' },
    ] },
    // CRM-ready (trimmed)
    { name: 'crmExternalId', type: 'text', ...staffOnly },
    { name: 'crmSyncStatus', type: 'select', defaultValue: 'not_configured', ...staffOnly,
      options: ['not_configured','pending','synced','failed'].map((v)=>({label:v,value:v})) },
  ],
};
```

- [ ] **Step 2: Register** in `payload.config.ts` — add `PartnershipInquiries` to the
  `collections` array (import at top, insert alphabetically near other commerce collections).

- [ ] **Step 3: Generate types + verify table**

```bash
cd alkebu-load && pnpm generate:types
pnpm dev   # SQLite push creates the partnership_inquiries table; visit /admin to confirm the collection appears
```
Expected: `PartnershipInquiry` type exists in `src/payload-types.ts`; collection visible in admin.

- [ ] **Step 4: Commit**

```bash
git add alkebu-load/src/collections/PartnershipInquiries.ts alkebu-load/src/payload.config.ts alkebu-load/src/payload-types.ts
git commit -m "feat(payload): PartnershipInquiries collection"
```

### Task 7: Email templates — staff + acknowledgement (TDD)

**Files:**
- Modify: `alkebu-load/src/app/utils/emailTemplates.ts`
- Modify: `alkebu-load/src/app/utils/emailService.ts` (add the data interfaces)
- Create: `alkebu-load/tests/partnership/partnershipEmail.test.ts`

**Interfaces:**
- Produces: `PartnershipInquiryData` (interface in emailService.ts),
  `generatePartnershipStaffTemplate(data): EmailTemplate`,
  `generatePartnershipAckTemplate(data): EmailTemplate`.

- [ ] **Step 1: Add the data interface** to `emailService.ts`:

```ts
export interface PartnershipInquiryData {
  inquiryType: 'wholesale' | 'institutional' | 'nonprofit';
  typeLabel: string;             // 'Wholesale' | 'Institutional' | 'Non-profit'
  name: string;
  email: string;
  phone?: string;
  organizationName?: string;
  message?: string;
  sourcePath?: string;
  details: Record<string, unknown>;   // the page-specific detail fields
  adminUrl?: string;
}
```

- [ ] **Step 2: Failing test**

```ts
// tests/partnership/partnershipEmail.test.ts
import { test } from 'node:test';
import assert from 'node:assert';
import { generatePartnershipStaffTemplate, generatePartnershipAckTemplate } from '../../src/app/utils/emailTemplates';

const base = {
  inquiryType: 'wholesale' as const, typeLabel: 'Wholesale', name: 'Ada Lovelace',
  email: 'ada@example.com', organizationName: 'Ada Books', message: 'Need 200 titles',
  sourcePath: '/wholesale', details: { expectedVolume: '200/qtr' },
};

test('staff template names the organization and type', () => {
  const t = generatePartnershipStaffTemplate(base);
  assert.match(t.subject, /Wholesale/);
  assert.match(t.html, /Ada Books/);
  assert.match(t.html, /200\/qtr/);
  assert.ok(t.text.includes('ada@example.com'));
});

test('acknowledgement template greets the inquirer and sets expectation', () => {
  const t = generatePartnershipAckTemplate(base);
  assert.match(t.html, /Ada Lovelace/);
  assert.match(t.html, /Wholesale/);
  assert.ok(t.text.length > 0);
});
```

- [ ] **Step 3: Run → fail.** `pnpm test 2>&1 | grep partnership` → FAIL (not exported).

- [ ] **Step 4: Implement both templates** in `emailTemplates.ts` using the existing
  private `emailWrapper(title, content)` and `sectionBox(content)` helpers and the
  `RefundNotificationData`/`generateRefundNotificationTemplate` pattern as a model.
  Staff template lists contact + org + message + the `details` map + a link to
  `adminUrl`; ack template greets `name`, restates `typeLabel`, sets a "within 2
  business days" expectation, gives a support contact. Import `PartnershipInquiryData`
  into the type import line at top of `emailTemplates.ts`.

- [ ] **Step 5: Run → pass.** `pnpm test 2>&1 | grep -E "partnership|# fail"` → pass, 0 fail.

- [ ] **Step 6: Commit**

```bash
git add alkebu-load/src/app/utils/emailTemplates.ts alkebu-load/src/app/utils/emailService.ts alkebu-load/tests/partnership/partnershipEmail.test.ts
git commit -m "feat(email): partnership staff + acknowledgement templates"
```

### Task 8: Email senders

**Files:**
- Modify: `alkebu-load/src/app/utils/emailService.ts`

**Interfaces:**
- Produces: `sendPartnershipStaffNotification(data: PartnershipInquiryData): Promise<EmailSendResult>`
  and `sendPartnershipAcknowledgement(data: PartnershipInquiryData): Promise<EmailSendResult>`.

- [ ] **Step 1: Add both senders** (mirror `sendRefundNotification`):

```ts
export async function sendPartnershipStaffNotification(data: PartnershipInquiryData): Promise<EmailSendResult> {
  const template = generatePartnershipStaffTemplate(data);
  return sendTemplateEmail({ to: getEmailRuntimeConfig().staffNotificationEmail, template });
}
export async function sendPartnershipAcknowledgement(data: PartnershipInquiryData): Promise<EmailSendResult> {
  const template = generatePartnershipAckTemplate(data);
  return sendTemplateEmail({ to: data.email, template });
}
```
(Add the two `generate…` names to the existing import from `./emailTemplates`.)

- [ ] **Step 2: Verify build.** `pnpm build` exits 0.

- [ ] **Step 3: Commit**

```bash
git add alkebu-load/src/app/utils/emailService.ts
git commit -m "feat(email): partnership email senders"
```

### Task 9: `/api/partnership-inquiry` endpoint

**Files:**
- Create: `alkebu-load/src/app/utils/partnershipInquiry.ts` (pure validate/normalize)
- Create: `alkebu-load/tests/partnership/partnershipInquiry.test.ts`
- Create: `alkebu-load/src/app/api/partnership-inquiry/route.ts`

**Interfaces:**
- Produces: `validateInquiry(body, nowMs): { ok: true; data: NormalizedInquiry } | { ok: false; status: number; error: string }`
  where `NormalizedInquiry` carries `{ inquiryType, name, email, phone, organizationName, organizationType, message, sourcePath, detailsKey, details }`.

- [ ] **Step 1: Failing tests for the pure validator**

```ts
// tests/partnership/partnershipInquiry.test.ts
import { test } from 'node:test';
import assert from 'node:assert';
import { validateInquiry } from '../../src/app/utils/partnershipInquiry';

const ok = {
  inquiryType: 'wholesale', name: 'Ada', email: 'ada@example.com', message: 'hi',
  renderedAt: 0, website: '', expectedVolume: '200',
};

test('accepts a valid wholesale submission', () => {
  const r = validateInquiry(ok, 10_000);
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.data.detailsKey, 'wholesaleDetails');
    assert.equal(r.data.details.expectedVolume, '200');
  }
});
test('rejects an unknown inquiryType', () => {
  assert.equal(validateInquiry({ ...ok, inquiryType: 'x' }, 10_000).ok, false);
});
test('rejects an invalid email', () => {
  assert.equal(validateInquiry({ ...ok, email: 'nope' }, 10_000).ok, false);
});
test('rejects a missing required field', () => {
  assert.equal(validateInquiry({ ...ok, name: '' }, 10_000).ok, false);
});
test('honeypot filled is rejected as spam', () => {
  const r = validateInquiry({ ...ok, website: 'bot' }, 10_000);
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.status, 200);   // silent success, see route
});
test('too-fast submit (< 3s) is rejected', () => {
  assert.equal(validateInquiry({ ...ok, renderedAt: 9_000 }, 10_000).ok, false);
});
```

- [ ] **Step 2: Run → fail.** `pnpm test 2>&1 | grep partnershipInquiry` → FAIL.

- [ ] **Step 3: Implement the pure validator** — escape/trim strings, validate email,
  enforce required core fields, honeypot check (return `{ok:false,status:200}` so the
  route can answer success silently), min-time-to-submit (≥ 3000 ms), map `inquiryType`
  → `detailsKey` and collect only that track's whitelisted detail keys into `details`.
  Strip any staff-only keys (`status`, `internalNotes`, `assignedTo`, `crm*`, email
  groups) from the incoming body.

  > **Single-source caveat (honest deviation from the spec):** the spec asks for one
  > schema driving both form and server validation. `alkebu-shared/` is empty (see
  > repo CLAUDE.md), so true code-sharing across the two repos isn't available. The
  > detail-field **key lists are duplicated** in three places that MUST stay in sync:
  > the frontend `config.detailFields[].name` (T1/T11), the collection group subfields
  > (T6), and this validator's whitelist. Keep the names identical:
  > `wholesale → { expectedVolume, productInterests, resaleOrDistribution }`,
  > `institutional → { institutionType, purchasingMethod, taxExemptStatus, audienceOrStudentGroup, targetTimeline }`,
  > `nonprofit → { projectType, missionContext, targetTimeline, budgetRange, supportRequested }`.

- [ ] **Step 4: Run → pass.** `pnpm test 2>&1 | grep -E "partnershipInquiry|# fail"` → pass, 0 fail.

- [ ] **Step 5: Write the route** (orchestration only; mirror contact route + refund
  route ordering — verify Turnstile → rate-limit by IP → `validateInquiry` → create
  record → staff email + record `staffEmail` status → ack email + record
  `acknowledgementEmail` status → return success). Storage before email; both emails
  best-effort; honeypot/`status:200` returns success without storing. Use
  `getClientIp` + `verifyTurnstileToken` from Task 5. Build the
  `PartnershipInquiryData` with `adminUrl = ${ORDER_ADMIN_BASE_URL}/admin/collections/partnership-inquiries/${doc.id}`.

- [ ] **Step 6: Verify build.** `pnpm build` exits 0.

- [ ] **Step 7: Commit**

```bash
git add alkebu-load/src/app/utils/partnershipInquiry.ts alkebu-load/tests/partnership/partnershipInquiry.test.ts alkebu-load/src/app/api/partnership-inquiry/route.ts
git commit -m "feat(api): partnership-inquiry endpoint (store + dual email)"
```

---

## Phase C — Wire the form, fan out, rewire homepage

### Task 10: Wire the wholesale form + analytics

**Files:**
- Create: `alkebu-web/src/routes/wholesale/+page.server.ts`
- Modify: `alkebu-web/src/lib/partnership/InquiryForm.svelte` (use `enhance`, error/success states, analytics)

**Interfaces:**
- Consumes: the `/api/partnership-inquiry` endpoint (Task 9).

- [ ] **Step 1: Form action** — mirror `contact/+page.server.ts`: read fields, preserve
  values on failure (`form.values`), forward a normalized JSON payload + Turnstile token
  to `${PAYLOAD_API_URL}/api/partnership-inquiry`, map backend status codes to inline
  messages, return success that clears the form.

- [ ] **Step 2: Form UX** — add `use:enhance`, `aria-invalid`/`aria-describedby` on
  errored fields, move focus to first error on fail, an `aria-live="polite"` success
  region, and Rybbit events: `partnership_view` (onMount), `partnership_form_start`
  (first focus), `partnership_submit_success` / `partnership_submit_fail`.

- [ ] **Step 3: End-to-end local test** — with both servers running, submit the
  `/wholesale` form. Expected: success message; a new record in
  `/admin/collections/partnership-inquiries` with `wholesaleDetails` populated and
  `submittedAt` set; server console shows the staff + ack email send results (and the
  record's `staffEmail.status` / `acknowledgementEmail.status` reflect them). Then test
  failure paths: empty required field (inline error + values preserved), honeypot
  filled (silent success, no record).

- [ ] **Step 4: Commit**

```bash
git add alkebu-web/src/routes/wholesale/+page.server.ts alkebu-web/src/lib/partnership/InquiryForm.svelte
git commit -m "feat(web): wire wholesale inquiry form + analytics"
```

### ✅ CHECKPOINT 2 — End-to-end local review

Confirm the full loop works locally (submit → stored → emails attempted → statuses
recorded → success UX). Show the user before fanning out.

### Task 11: Institutional + non-profit pages (pure config)

**Files:**
- Modify: `alkebu-web/src/lib/partnership/config.ts` (add `institutional`, `nonprofit`)
- Create: `alkebu-web/src/routes/institutional-contracts/+page.svelte` + `+page.ts` + `+page.server.ts`
- Create: `alkebu-web/src/routes/non-profit-projects/+page.svelte` + `+page.ts` + `+page.server.ts`

- [ ] **Step 1: Add the two configs** following the wholesale shape — institutional
  accent `#3D4F7C`, symbol `crocs.svg`, detail fields (institution type, purchasing
  method, tax-exempt status, audience/student group, target timeline); nonprofit accent
  `#2D5A3D`, symbol `sankofa.svg`, detail fields (project type, mission/program context,
  target timeline, budget range, support requested). Set each `crossLinks` to the other two.

- [ ] **Step 2: Routes** — copy the wholesale route trio, swapping `getPartnershipConfig('…')`
  and the JSON-LD `serviceType`. Each `+page.server.ts` is identical except for the
  config slug it reads.

- [ ] **Step 3: Verify** — `npm run check` clean; both routes render locally and submit
  to the same endpoint, producing records with the correct `inquiryType` + details key.

- [ ] **Step 4: Commit**

```bash
git add alkebu-web/src/lib/partnership/config.ts alkebu-web/src/routes/institutional-contracts/ alkebu-web/src/routes/non-profit-projects/
git commit -m "feat(web): institutional + non-profit partnership pages"
```

### Task 12: Rewire homepage cards

**Files:**
- Modify: `alkebu-web/src/routes/+page.svelte` (business-services loop, ~line 429-490)

- [ ] **Step 1: Map cards to routes** — give the loop a deterministic destination per
  card. Simplest robust approach: a fixed ordered array
  `['/wholesale','/institutional-contracts','/non-profit-projects']` zipped with
  `businessServices` by index, falling back to `/contact` when index is out of range.
  Replace `href="/contact"` and the "Contact Us" label with the mapped route + "Learn more".

- [ ] **Step 2: Verify** — homepage cards link to the three routes; an extra/fewer CMS
  card never breaks (falls back to `/contact`). `npm run check:svelte` clean.

- [ ] **Step 3: Commit**

```bash
git add alkebu-web/src/routes/+page.svelte
git commit -m "feat(web): homepage partnership cards link to new routes"
```

### ✅ CHECKPOINT 3 — Full local review → decide changes → push

Run the full suite and build, review all three pages locally, apply any final
changes the user requests, then push to `main`.

```bash
cd alkebu-load && pnpm test && pnpm build      # backend green + builds
cd alkebu-web && npm run check && npm run build # frontend type-clean + builds
```

---

## Deployment note (production schema)

Local SQLite auto-creates the `partnership_inquiries` table via push mode. Production
is Postgres and the repo has a history of Drizzle migration drift (see the
`fix-*-schema.sql` convention). Before the first prod submission, confirm the table +
columns exist — either via a generated Payload migration (`pnpm payload migrate:create`
then `migrate`) or, matching the existing convention, an idempotent
`scripts/create-partnership-inquiries-schema.sql`. Verify in prod with
`\d partnership_inquiries` before announcing the pages.

## Verification summary (maps to spec "Testing")

- Pure logic (TDD, `pnpm test`): Turnstile IP parsing (T5), email templates (T7),
  inquiry validation incl. honeypot/timing/email/required/type + staff-field stripping (T9).
- Manual local: all three routes render + prerender + SEO/JSON-LD (T4, T11); accessible
  errors + value preservation + success clearing (T10); end-to-end store + dual email
  status (Checkpoint 2); homepage card mapping + fallback (T12).
- Access control: public create-only, no public read (collection access in T6; confirm
  by hitting `GET /api/partnership-inquiries` unauthenticated → not authorized).
