# CLAUDE.md — alkebu-web (SvelteKit Storefront)

Guidance for working in `alkebu-web/`. The repo-level [../CLAUDE.md](../CLAUDE.md)
covers cross-project context and the [../alkebu-load/CLAUDE.md](../alkebu-load/CLAUDE.md)
covers the Payload backend this storefront consumes.

## Stack

- **SvelteKit 2** + **Svelte 5 (runes)**, deployed to **Cloudflare Pages** via
  `@sveltejs/adapter-cloudflare`.
- **Tailwind v3** + **shadcn-svelte** / **bits-ui** components, `lucide-svelte`
  icons, `tailwind-variants` + `tailwind-merge` + `clsx` for class composition.
- Type-checking via `jsconfig.json` + `svelte-check` (the project uses JS with
  JSDoc/TS-in-`.svelte`, not a full `.ts` app).

## Commands (npm, not pnpm)

- `npm run dev` — dev server on `:5173`
- `npm run build` — **runs `check:svelte` first**, so type/svelte errors fail the build
- `npm run check` / `npm run check:svelte` — type check (`svelte-kit sync` + tsc/svelte-check)
- `npm run lint` — ESLint
- `npm run sync:payment-provider` — fetch payment provider config from backend

**The backend must be running** at `PAYLOAD_API_URL` (default `http://localhost:3000`)
before `dev` or `build` — load functions fetch from it at request/build time.

## Svelte MCP — use it for every component

A Svelte MCP server is wired in `.claude/mcp.json` (plus a Tailwind one). When
touching `.svelte` files:

1. `list-sections` first (Svelte 5 / SvelteKit topics).
2. `get-documentation` for the relevant sections.
3. **`svelte-autofixer` on any component before finalizing — loop until clean.**

Write Svelte 5 **runes** idioms (`$state`, `$derived`, `$props`, `$effect`), not
Svelte 4 (`export let`, `$:`, stores-as-state). Existing components are the
reference for house style.

## Data loading — server-only, through one wrapper

All Payload access goes through **`src/lib/server/payload.ts`** (`payloadGet<T>`),
which reads config from **`src/lib/server/payloadEnv.ts`**:

- `getPayloadApiUrl()` — `PAYLOAD_API_URL` (private env)
- `getPayloadAuthHeader()` — optional `PAYLOAD_API_KEY` as a Bearer header

Rules:
- **Never fetch Payload from client code.** `PAYLOAD_API_KEY` is a *private* env
  var; keep all Payload calls in `+page.server.ts` / `+server.ts` / `$lib/server/*`.
- Reuse the query helpers in `payload.ts` (`getProductBySlug`, `getBlogPosts`,
  `getRelatedBooks`, …) and the `appendBookStorefrontFilters` /
  `buildBookStorefrontPath` helpers — they encode storefront rules (e.g. hide
  `availabilityStatus = discontinued`). Don't hand-roll `/api/books` URLs.
- Collection REST slugs are **camelCase**: `/api/blogPosts`, not `/api/blog-posts`.

## Gotchas

- **Lexical rich text** — fields like `BlogPost.content` and `Event.content` are
  Lexical JSON objects, **not** strings. Render with
  `src/lib/components/LexicalRenderer.svelte`. Passing the raw object into markup
  yields garbage. (Backend gotcha mirror: see `4cd7e3f`.)
- **`payload.ts` interfaces are hand-written and can drift** from the backend's
  authoritative `alkebu-load/src/payload-types.ts`. Treat the backend types /
  live API as the source of truth and verify field shapes there before relying
  on a property. (Follow-up worth its own cycle: generate types from the backend
  and replace the hand-written set — do **not** bundle that refactor into
  unrelated work.)
- **Homepage is SSR, not prerendered** — do not add `export const prerender = true`
  to `src/routes/+page.*`; it breaks dynamic content. Cache TTL is intentionally
  short.
- **Cloudflare adapter** — avoid Node-only APIs in server code paths that run on
  the edge; stick to Web-standard `fetch`/`Request`/`Response`.

## Reference

- [../docs/cart-checkout.md](../docs/cart-checkout.md) — checkout flow
- [../docs/PRD.md](../docs/PRD.md) — product spec
- Backend API surface: [../alkebu-load/CLAUDE.md](../alkebu-load/CLAUDE.md) → "API Endpoints"
