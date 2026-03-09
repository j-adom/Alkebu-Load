# Alkebulanimages 2.0

A digital platform for a Nashville-based Black-owned bookstore combining e-commerce, content management, community directory, and events.

## Architecture

- **alkebu-load/** - Payload CMS 3.68.5 backend with integrated e-commerce, Square POS sync, Stripe payments, order management
- **alkebu-web/** - SvelteKit 2.8 frontend with Svelte 5, TailwindCSS, Cloudflare Pages deployment
- **alkebu-shared/** - Shared TypeScript types and utilities (planned)

## Quick Start

```bash
# Backend
cd alkebu-load && pnpm install && pnpm dev    # localhost:3000

# Frontend
cd alkebu-web && npm install && npm run dev    # localhost:5173
```

See [PHASE1-QUICKSTART.md](PHASE1-QUICKSTART.md) for detailed setup and testing checklist.

## Documentation

- [Product Requirements](docs/PRD.md) - Features, architecture, current status
- [Architecture Overview](docs/architecture.md) - System design and data flow
- [Development Guide](docs/development-guide.md) - Local setup and commands
- [Deployment Guide](docs/Deployment-Guide.md) - Production deployment
- [Phase 1 Setup](docs/PHASE1-SETUP.md) - Step-by-step implementation guide
- [Book Enrichment](docs/BOOK-ENRICHMENT-WORKFLOW.md) - ISBN enrichment system
- [Cart UX](docs/CART-UX.md) - Shopping cart architecture

## Current Status

- **alkebu-load**: Production-ready backend with e-commerce, order management, email notifications
- **alkebu-web**: Frontend integration in progress (checkout flow)
- **Phase 1**: ~85% complete - see [PRD.md](docs/PRD.md#phase-1-mvp--launch-current) for checklist
