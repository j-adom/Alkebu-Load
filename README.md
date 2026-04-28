# Alkebulanimages 2.0

A digital platform for a Nashville-based Black-owned bookstore combining e-commerce, content management, community directory, and events.

## Architecture

- **alkebu-load/** - Payload CMS 3.x backend with integrated e-commerce, Square POS sync, Stripe payments, order management
- **alkebu-web/** - SvelteKit frontend with Svelte 5, TailwindCSS, Cloudflare deployment
- **alkebu-shared/** - Shared TypeScript types and utilities (planned)

## Live Environments

- **Storefront:** https://alkebulanimages.com
- **Backend/Admin:** https://payload.alkebulanimages.com
- **Backend health:** https://payload.alkebulanimages.com/api/health

## Quick Start

```bash
# Backend
cd alkebu-load && pnpm install && pnpm dev    # localhost:3000

# Frontend
cd alkebu-web && npm install && npm run dev    # localhost:5173
```

See [docs/development-guide.md](docs/development-guide.md) for local setup and [docs/LAUNCH-CHECKLIST.md](docs/LAUNCH-CHECKLIST.md) for the current launch board.

## Documentation

- [Documentation Index](docs/README.md) - Start here for the current doc map
- [Launch Checklist](docs/LAUNCH-CHECKLIST.md) - Current priority board for launch
- [Product Requirements](docs/PRD.md) - Features, architecture, current status
- [Architecture Overview](docs/architecture.md) - System design and data flow
- [Development Guide](docs/development-guide.md) - Local setup and commands
- [Deployment Guide](docs/Deployment-Guide.md) - Production deployment
- [Book Enrichment](docs/BOOK-ENRICHMENT-WORKFLOW.md) - ISBN enrichment system
- [Cart UX](docs/CART-UX.md) - Shopping cart architecture

Historical Phase 1 notes are still available in [PHASE1-QUICKSTART.md](PHASE1-QUICKSTART.md) and [docs/PHASE1-SETUP.md](docs/PHASE1-SETUP.md), but the launch checklist above is the source of truth.

## Current Status

- **alkebu-load**: Backend is live; email credentials, webhooks, Square sync, and smoke tests still need production verification.
- **alkebu-web**: Storefront builds and is deployed; performance/security cleanup is underway.
- **Launch readiness**: Follow [docs/LAUNCH-CHECKLIST.md](docs/LAUNCH-CHECKLIST.md).
