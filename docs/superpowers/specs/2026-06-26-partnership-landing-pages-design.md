# Partnership Landing Pages and CRM-Ready Inquiries Design

**Date:** 2026-06-26 (revised 2026-06-28 after design review)
**Status:** Design
**Scope:** `alkebu-web` (SvelteKit landing pages + forms) + `alkebu-load` (Payload
collection, inquiry endpoint, email)

## Summary

Build three top-level partnership landing pages for the existing "More than just
Retail" homepage section:

- `/wholesale`
- `/institutional-contracts`
- `/non-profit-projects`

Each page uses a shared SvelteKit landing-page shell with static v1 content from a
single frontend config. Each page includes tailored copy, route-specific inquiry
fields, SEO metadata, and a direct form. The pages are **prerendered** (static
config content) for speed and search ranking. Submissions are Turnstile-protected,
**stored in Payload**, **emailed to staff**, **acknowledged back to the inquirer**,
and structured for a later Twenty.com CRM sync.

## Goals

- Give each homepage partnership card a real destination instead of sending all
  visitors to `/contact`.
- Capture higher-quality leads through tailored forms for wholesale, institutional,
  and non-profit inquiries.
- Store inquiries in Payload so staff can see, triage, and follow up on leads.
- **Acknowledge every inquiry to the sender** so the lead feels handled and knows
  when to expect a reply — these pages are the top of a relationship funnel.
- **Rank** for partnership intent ("wholesale Black-owned bookstore," "library book
  supplier," "non-profit book donation partner") via prerendered, well-marked-up
  pages.
- Keep v1 content static in code, but organized so it can move to Payload later.
- Include the minimum CRM-ready fields now so a later Twenty.com sync does not
  require reshaping submitted data.

## Non-Goals

- Do not connect to Twenty.com in v1.
- Do not build a full CRM inside Payload.
- Do not make the landing page copy editable in Payload yet.
- Do not replace the existing general contact form.
- Do not alter unrelated checkout, refund, order, or catalog behavior.

## Reuse: inherit the *refund/order* patterns, not the *contact* route

The existing contact route (`alkebu-load/src/app/api/contact/route.ts`) is **not**
the pattern to copy. It inlines Turnstile verification, sends mail with raw
nodemailer, hardcodes the recipient, and **persists nothing**. The newer
order/refund email work established the better pattern, and this feature inherits
from it:

- **Email** goes through `emailService.ts` + branded `emailTemplates.ts` (the
  `emailWrapper`/`sectionBox` helpers), with the recipient resolved from
  `getEmailRuntimeConfig()` — exactly like `sendRefundNotification`.
- **Email delivery status is recorded on the stored record** (mirroring the order
  `emailNotifications` group), so a send failure is visible and retryable.
- **Turnstile verification is extracted into a shared util** before this feature
  adds another protected public endpoint, so it is not copy-pasted. The contact
  route should be refactored onto the same helper (low-risk, behavior-preserving).

## Routes and Frontend Architecture

The frontend adds three top-level routes:

- `/wholesale`
- `/institutional-contracts`
- `/non-profit-projects`

All three render through a reusable partnership landing-page shell. Route content
comes from one shared frontend config keyed by inquiry type. The config includes:

- slug and route path
- page title and SEO metadata (title, description, OpenGraph image, canonical)
- hero headline, eyebrow, body copy, and CTA label
- use cases / audience fit copy
- benefit blocks
- process steps
- **page-specific form-field schema** (the single source for both the rendered
  form and server-side validation — see "Validation")
- cross-links to the other two partnership pages

This keeps the first implementation lean while leaving a clean migration path to
Payload-managed page content later.

### Rendering & validation

- **Prerender.** These pages are static config content with no per-request data, so
  each route sets `export const prerender = true`. (Note: this is the opposite of
  the homepage, which must stay SSR — see the repo CLAUDE.md gotcha. The form POST
  still goes to the dynamic Payload endpoint; only the page shell is prerendered.)
- **Single-source validation.** The per-route field schema in the shared config
  drives both the rendered form and the validation rules. The SvelteKit action and
  the Payload endpoint both validate against that schema so the three forms cannot
  drift apart. (The contact flow hand-duplicates validation; do not repeat that.)

## Page Structure

Each page follows the same structure with page-specific content.

### Hero

Identifies the audience, explains the offer in practical terms, and includes a
primary CTA that jumps to the inquiry form.

### Fit / Use Cases

Explains who the page is for:

- Wholesale: retailers, organizations, bulk buyers, resale, and distribution needs.
- Institutional Contracts: schools, libraries, churches, cultural institutions, and
  purchase-order style buying.
- Non-profit Projects: community programs, book drives, sponsorships, and
  mission-aligned projects.

### How We Help

Three tailored benefit blocks per page. Examples: bulk book sourcing, culturally
relevant curation, invoice-friendly workflows, local pickup/shipping coordination,
community project support.

### Process

Each page shows a simple process:

1. Tell us what you need.
2. We review the request.
3. We follow up with next steps.

### Inquiry Form

The form is embedded directly on the page, not routed through `/contact`. It is
Turnstile-protected and tailored to the page type.

**Accessibility requirements** (consistent with recent a11y work on the storefront):

- Every input has an associated `<label for>`; grouped detail fields sit in a
  `<fieldset>` with a `<legend>`.
- Validation errors are associated with their input via `aria-describedby` and the
  input is marked `aria-invalid` on failure.
- On a failed submit, focus moves to the first invalid field.
- The success/confirmation message is announced via an `aria-live="polite"` region.

### Cross-Links

A small "Other ways to work with us" section links to the other two partnership
pages.

### Homepage Links

The homepage business-service cards currently render from the `section4` CMS global
as a generic loop, and **all three cards hardcode `href="/contact"`**. To point each
card at its own route:

- Add a `slug` (or `href`) field to each `section4` item so a card can declare its
  destination, **or** map the cards to inquiry types by a fixed order in the loop.
- Fall back to `/contact` for any card without a resolved destination, so a CMS edit
  that drops/reorders items can never produce a broken link.

This mapping is an explicit deliverable — "cards link to the new routes" is not
free given the current generic, CMS-driven card data.

## Visual Design

These pages share the storefront's brand DNA (Kente palette, Outfit/Inter, the
gold-hairline section rhythm) but shift from the retail **browse** register
(photo card → dark scrim → hover-zoom → "Shop now") to an editorial
**capabilities** register: type-forward, generous cream space, photography used as
*evidence* rather than as clickable tiles. The job is to earn trust from a buyer or
a librarian, not to sell a product tile.

### Signature: one set, three identities

Each track gets its own **Adinkra symbol + accent color**, drawn entirely from
existing brand tokens and the SVGs already in
`static/assets/images/alkebulan/`. Three sibling pages, clearly a family, each
individually recognizable — encoding the *real* fact that there are three distinct
partnership tracks, in the brand's own cultural vocabulary.

| Track | Accent token (existing) | Adinkra symbol | Meaning it encodes |
| --- | --- | --- | --- |
| Wholesale | Kente Gold `#D4AF37` (`primary`) | `basket-4.svg` | abundance / trade at volume |
| Institutional Contracts | Kente Indigo `#3D4F7C` (`kente-indigo`) | `crocs.svg` (siamese crocodiles) | unity / shared destiny |
| Non-profit Projects | Kente Forest `#2D5A3D` (`kente-forest`) | `sankofa.svg` | return & reclaim, learn from the past |

- Terracotta `#C45C35` (`secondary`/`kente-terracotta`) stays the **shared** warm
  hover/accent across all three, so the set never visually fractures.
- All pages sit on the warm cream background (`--background`, `bg-background`).
- The track symbol does double duty: **large and quiet behind the hero**
  (~6–8% opacity, in the track accent) and **small as the section marker** in place
  of a generic icon. This is the one place boldness is spent.
- The accent is exposed to the shell as a per-track CSS variable (e.g.
  `--track-accent`) so one shell themes all three pages from the config.

### Type roles

- **Display** — Outfit, larger than the storefront's `text-5xl` ceiling for the
  hero (it's a thesis statement, not a section head). `font-display font-bold
  tracking-tight`.
- **Institutional voice** — **Lora** (the currently-underused `font-serif`),
  italic, for the hero subhead and a single pull-quote. This is the one new,
  brand-native flavor that separates these pages from the Outfit-everywhere
  storefront.
- **Body / UI** — Inter (`font-sans`), unchanged.
- Keep the gold hairline bar (`w-20 h-1 bg-primary`) under section eyebrows as
  brand glue; eyebrows stay `text-primary-strong font-semibold uppercase
  tracking-wide`.

### Layout (shared shell, per-track content)

```
┌───────────────────────────────────────────────┐
│  [ eyebrow: WHOLESALE ]                         │
│                          ╲   ← Adinkra symbol   │
│  Stock your shelves with   ╲     huge, ~7% gold │
│  books that matter.          ╲                  │
│  ── gold bar ──                                 │
│  (Lora italic subhead, one sentence)            │
│  [ Start an inquiry → ]   ·gold btn-primary·    │
│  Nashville Black-owned · Net-30 · Bulk curation │ ← hairline trust row, NOT stat cards
├───────────────────────────────────────────────┤
│  FIT — who this is for      (2-col: copy + img) │  img = real shelf, used as evidence
├───────────────────────────────────────────────┤
│  HOW WE HELP   ◇ ◇ ◇   3 quiet benefit blocks   │  small marker per block
├───────────────────────────────────────────────┤
│  PROCESS   01 → 02 → 03   (gold connectors)     │  numbering EARNED — a real sequence
├───────────────────────────────────────────────┤
│  INQUIRY FORM  ▸ card-modern, accent top-band   │  the conversion moment, elevated
├───────────────────────────────────────────────┤
│  Other ways to work with us  [▦ ▦]              │  the other two tracks, each w/ its symbol
└───────────────────────────────────────────────┘
```

Two deliberate departures from the retail look:

1. **Hero is type + symbol, not a photo-scrim.** Photos appear lower (Fit,
   Process) as proof, never as the headline.
2. **The `01 / 02 / 03` process markers are justified here** — it is a literal
   three-step intake, so order carries real meaning. Render them with gold
   connector lines, not decorative chips. (Do not reuse numbered markers anywhere
   the content is not actually a sequence.)

### Block-level treatment (build-ready)

- **Section rhythm:** reuse `.section` (`py-16 md:py-24`) and `.container`.
- **Hero:** `bg-background`; headline `font-display font-bold tracking-tight
  text-5xl md:text-6xl lg:text-7xl`; subhead `font-serif italic text-xl
  text-muted-foreground`; primary CTA `.btn-primary .btn-lg`; trust row as a
  `flex` of items separated by hairline dividers (`divide-x divide-border` or
  inline `border-l`). Track symbol absolutely positioned, `opacity-[0.07]`,
  `pointer-events-none`, tinted with the track accent.
- **Fit:** 2-col grid (`md:grid-cols-2`), evidence image in `rounded-2xl
  shadow-medium`, eyebrow + gold-bar + `font-display` heading.
- **How We Help:** 3-col grid of quiet blocks — `card-modern p-6` or borderless on
  cream; each leads with a small Adinkra/Lucide marker in the track accent.
- **Process:** 3 numbered steps, big `font-display` numerals in the track accent,
  joined by a thin gold rule; respects `prefers-reduced-motion`.
- **Form:** `card-modern` with a `border-t-2` in the track accent; fields use
  `input-modern` / `select-modern` / `textarea-modern`; `<fieldset><legend>` per
  detail group; submit `.btn-primary`; success/error reuse the emerald /
  `destructive/5` alert boxes from the contact form.
- **Cross-links:** two compact `card-modern` tiles for the other tracks, each
  carrying that track's symbol + accent.

### Restraint

The per-track Adinkra symbol is the signature, so everything else stays quiet: no
animated gradients, no `shadow-glow` on non-primary elements, no scrim-photo hero.
A single `fade-in-up` on the hero is enough; honor `prefers-reduced-motion`. Meet
the quality floor — responsive to mobile, visible keyboard focus (`ring-2
ring-primary`), WCAG AA contrast (use `text-primary-strong`, never light gold, for
body text).

## Payload Data Model

Add a `PartnershipInquiries` collection for stored lead and light pipeline
management.

Admin list view: `admin.defaultColumns = [inquiryType, organizationName, status,
submittedAt]`, `useAsTitle` on organization (fallback name), default sort
`submittedAt` descending — staff triage is the primary use of stored inquiries.

### Core Fields

- `inquiryType`: `wholesale`, `institutional`, or `nonprofit`
- `status`: light pipeline status — enum `new` (default) → `contacted` →
  `qualified` → `won` → `lost`. Not a free-text field.
- `name`
- `email`
- `phone`
- `organizationName`
- `organizationType`
- `message`
- `sourcePath`
- `submittedAt`

### Page-Specific Details

Stored as **typed groups** for admin readability and per-field validation. Only the
group matching `inquiryType` is populated. (Trade-off considered: a single `details`
JSON field — as the refund spec used for `refunds.items` — is simpler and avoids two
always-empty groups, but loses admin-UI structure and field-level validation. We
choose typed groups for staff usability; revisit if the field sets grow large or
churn often.)

`wholesaleDetails`:

- expected order volume
- product interests
- resale or distribution needs

`institutionalDetails`:

- institution type
- purchasing method
- tax-exempt status
- audience or student group
- target timeline

`nonprofitDetails`:

- project type
- mission or program context
- target timeline
- budget range
- support requested

### Pipeline Fields

- `followUpDate`
- `internalNotes`
- nullable `assignedTo` relationship to a Payload user

### Email Fields

Two emails fire per submission (staff notification + inquirer acknowledgement), and
**both outcomes are recorded** so a partial failure is visible. Mirror the order
`emailNotifications` group shape:

- `staffEmail`: `{ status: pending|sent|failed|skipped, sentAt, error }`
- `acknowledgementEmail`: `{ status: pending|sent|failed|skipped, sentAt, error }`

### CRM-Ready Fields (trimmed)

Only the minimum needed so a later sync does not reshape data:

- `crmExternalId`
- `crmSyncStatus`: `not_configured` (default) | `pending` | `synced` | `failed`

`crmProvider`, `crmLastSyncedAt`, and `crmSyncError` are **deferred** — they are
cheap to add (idempotent column-add, same workflow as `fix-orders-schema.sql`) when
the Twenty.com sync job actually exists, and add nothing while the integration is
out of scope.

## Access Control

Public visitors can only create records through the protected inquiry endpoint. They
cannot list or read inquiries.

Admin and staff users can read and manage records in Payload admin. Staff-only
fields — `status`, `followUpDate`, `internalNotes`, `assignedTo`, both email-status
groups, and the CRM fields — must not be writable from the public request body, and
should be hidden in the admin UI for non-staff via a role `condition` (the Reviews
collection moderation-field pattern).

## Submission Flow

1. Visitor submits a tailored form from one of the three pages.
2. SvelteKit validates required fields against the shared schema and preserves
   entered values when validation fails.
3. SvelteKit forwards a normalized payload + Turnstile token to the Payload inquiry
   endpoint.
4. Payload verifies Turnstile (shared helper).
5. Payload rate-limits by client IP and applies the anti-spam checks (honeypot +
   minimum time-to-submit).
6. Payload sanitizes and validates submitted fields (server side, same schema).
7. Payload creates the `PartnershipInquiries` record.
8. Payload sends the **staff** email, then records `staffEmail` status.
9. Payload sends the **acknowledgement** email to the inquirer, then records
   `acknowledgementEmail` status.
10. SvelteKit returns a success state and clears the form.

Storage happens before either email. **Both emails are best-effort:** if either
fails after storage, the lead is still captured (recoverable in admin with the
failed status + error recorded) and the visitor still receives a success message.
If storage fails, no email is sent and the visitor receives an error.

## Error Handling

The user-facing form handles:

- missing required fields
- invalid email
- failed Turnstile verification
- rate limiting
- backend unavailable
- storage failure
- unexpected submission failure

Errors show inline near the form (associated for assistive tech, per the
accessibility requirements). Successful submission clears the form and shows a
confirmation that the inquiry was received and that an acknowledgement email is on
its way.

## Spam and Security

Use the contact flow's protections, strengthened for higher-value B2B lead spam:

- honeypot field
- Cloudflare Turnstile token + **server-side verification via the shared helper**
- **minimum time-to-submit check** (reject submissions faster than a human could
  plausibly fill the form, using a render timestamp) — cheap, catches scripted bots
- per-client rate limiting
- server-side validation and sanitization
- public create-only endpoint
- staff/admin-only access for inquiry records; the public endpoint ignores/rejects
  staff-only fields

**Rate-limit caveat (own it):** the existing limiter is an in-memory Map, so it is
per-instance and resets on deploy/restart. Acceptable for v1 single-instance
deployment; if partnership forms become a spam target or the backend scales out,
move to a durable store. This limitation is documented rather than implied away.

## Email Behavior

Both emails use the `emailService` + branded `emailTemplates` pattern (not the
contact route's inline nodemailer), with recipients from `getEmailRuntimeConfig()`.

**Staff notification** includes:

- inquiry type
- contact information
- organization information
- page-specific details
- message
- source path
- direct admin link to the new record when available

Formatted for quick staff triage.

**Inquirer acknowledgement** is a branded confirmation: thanks them by name,
restates which partnership track they reached out about, sets a follow-up
expectation (e.g. "within N business days"), and gives a support contact. Reuses the
`emailWrapper` brand shell.

## SEO & Performance

- Prerendered routes (`prerender = true`) — fast first paint, fully crawlable.
- Per-route `<title>` and meta description from the shared config.
- OpenGraph/Twitter card tags with a per-route (or shared partnership) image.
- Canonical URL per route.
- **JSON-LD** structured data: `Organization`/`Service` on each page; add
  `FAQPage` if an FAQ block is included.
- Homepage cards link with normal crawlable `<a href>` to the new routes.

## Analytics

These pages are conversion funnels — instrument them with the existing Rybbit
analytics:

- page view per partnership type
- form-start (first field focus)
- form-submit success
- form-submit failure (with coarse reason)

This lets staff see which partnership track actually converts and where forms are
abandoned.

## Testing

Frontend verification:

- all three routes render and prerender
- route-specific copy and tailored fields display correctly
- per-route SEO metadata + JSON-LD are present
- homepage cards link to the correct new routes (and fall back to `/contact` when
  unmapped)
- required-field errors preserve entered values and are accessibly associated
- focus moves to the first invalid field on failed submit
- successful submission clears the form and shows the acknowledgement message

Backend verification:

- Payload type generation after adding the collection
- collection access control (public create-only; no public read/list)
- staff-only fields cannot be set from public submissions
- sanitization and validation against the shared schema
- successful inquiry record creation
- staff email success updates `staffEmail` status
- acknowledgement email success updates `acknowledgementEmail` status
- email failure after storage keeps the record, records the error on the right
  status group, and still returns success to the visitor
- Turnstile failure (shared helper)
- honeypot submission
- minimum time-to-submit rejection
- rate limiting
- CRM field defaults (`crmSyncStatus = not_configured`)

## Rollout

V1 stops at CRM-ready local lead capture. It does not sync to Twenty.com.

**Build order (incremental).** The config-driven design makes this natural:

1. Shared shell + config + the `PartnershipInquiries` collection + the protected
   endpoint + shared Turnstile helper.
2. Wire **one** page end-to-end — **wholesale** (highest commercial value) — proving
   the full store → staff-email → acknowledgement-email loop with status recording.
3. Add `/institutional-contracts` and `/non-profit-projects` — now pure config +
   their detail groups.
4. Rewire the homepage cards.

A later CRM integration can add a sync job or webhook/queue adapter that:

1. Finds unsynced `PartnershipInquiries` (`crmSyncStatus = not_configured|pending`).
2. Creates or updates leads in Twenty.com.
3. Writes the external CRM ID and sync status back to Payload (adding
   `crmProvider`/`crmLastSyncedAt`/`crmSyncError` at that point).
4. Records sync errors for staff visibility.

## Implementation Notes

Exact route copy and form option labels can be adjusted during implementation
without changing the architecture.
