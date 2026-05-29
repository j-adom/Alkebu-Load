# Alkebulanimages 2.0

A digital platform for a Nashville-based Black-owned bookstore combining e-commerce, content management, community directory, and events.

## Architecture

- **alkebu-load/** - Payload CMS 3.x backend with integrated e-commerce, Square POS sync, Stripe payments, order management, email, search, and enrichment.
- **alkebu-web/** - SvelteKit storefront with Svelte 5, TailwindCSS, and Cloudflare deployment.
- **alkebu-shared/** - Shared TypeScript types and utilities (planned).

## Live Environments

- **Storefront:** https://alkebulanimages.com
- **Backend/Admin:** https://payload.alkebulanimages.com
- **Backend health:** https://payload.alkebulanimages.com/api/health

## Quick Start

~~~bash
# Backend
cd alkebu-load && pnpm install && pnpm dev

# Frontend
cd alkebu-web && npm install && npm run dev
~~~

Default local URLs:

- Backend/API: http://localhost:3000
- Payload admin: http://localhost:3000/admin
- Storefront: http://localhost:5173

## Documentation

Start with [docs/README.md](docs/README.md).

Core docs:

- [Launch and Operations Board](docs/launch.md)
- [Deployment Guide](docs/deployment.md)
- [Development Guide](docs/development-guide.md)
- [Architecture Overview](docs/architecture.md)
- [Product Requirements](docs/PRD.md)
- [Cart and Checkout](docs/cart-checkout.md)
- [Book Operations](docs/book-operations.md)
- [Staff Workflows](docs/staff-workflows.md)

## Current Status

- **Backend:** Live on Payload/Next. Local hardening adds Square catalog webhook signatures, public health redaction, and build-time SMTP verify skipping.
- **Frontend:** Live on SvelteKit. npm run build now runs svelte-check before vite build.
- **Launch readiness:** Track current production work in [docs/launch.md](docs/launch.md).
