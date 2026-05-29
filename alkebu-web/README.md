# Alkebu Web

SvelteKit storefront for Alkebulanimages 2.0.

## Role

`alkebu-web` renders the public storefront at `https://alkebulanimages.com`. It consumes Payload APIs from `alkebu-load`, including catalog data, cart/checkout endpoints, events, directory listings, globals, media, and search.

## Local Development

Start the backend first:

```bash
cd ../alkebu-load
pnpm dev
```

Then start the storefront:

```bash
cd ../alkebu-web
npm install
npm run dev
```

Default local URLs:

- Storefront: `http://localhost:5173`
- Backend/API: `http://localhost:3000`
- Payload admin: `http://localhost:3000/admin`

## Scripts

```bash
npm run dev
npm run check
npm run check:svelte
npm run build
npm run preview
npm run sync:payment-provider
```

## Important Environment Variables

- `PAYLOAD_API_URL` - backend API URL; local default is `http://localhost:3000`, production is `https://payload.alkebulanimages.com`.
- `PUBLIC_SITE_URL` - public storefront URL; production is `https://alkebulanimages.com`.

## Notes

- Global legacy JavaScript has been removed from `src/app.html`; avoid reintroducing jQuery/template scripts globally.
- Shared image rendering should use `src/lib/components/PayloadImage.svelte` where possible so images SSR correctly.
- Current launch priorities live in [Launch and Operations Board](../docs/launch.md).
- Main documentation index: [../docs/README.md](../docs/README.md).
