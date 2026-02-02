# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Claude Code Configuration

### MCP (Model Context Protocol) Setup
This project uses the Filesystem MCP server for enhanced file system access. Configuration:
- **Config location**: `.claude/mcp.json`
- **Allowed directory**: `/home/jadom/Coding/alkebulanimages2.0` (entire project)
- **Documentation**: See [docs/mcp-setup.md](docs/mcp-setup.md) for details

### Permissions
Additional Claude Code permissions are configured in `.claude/settings.local.json`.

## Project Overview

Alkebulanimages 2.0 is a multi-repository platform for a Nashville-based Black-owned bookstore. The architecture uses a Payload-only approach with integrated e-commerce:

- **alkebu-load/**: Payload CMS backend with integrated e-commerce, inventory management, and Square POS integration
- **alkebu-web/**: SvelteKit frontend consuming Payload APIs for customer-facing website  
- **alkebu-shared/**: Shared TypeScript types and utilities (planned)

The platform combines e-commerce, content management, community directory, and events into a unified Payload CMS system. Stripe handles payment processing directly, while Square POS provides inventory synchronization only.

## Development Commands

### Repository-Level Commands
- `docker-compose up` - Start all services (currently only payload service is functional)

### Payload CMS Backend (alkebu-load/)
**Package Manager**: Use `pnpm` (required by engines config)

- `pnpm dev` - Start development server on localhost:3000
- `pnpm devsafe` - Clean restart (removes .next directory first)
- `pnpm build` - Build production bundle
- `pnpm lint` - Run ESLint
- `pnpm generate:types` - Generate TypeScript types from collections
- `pnpm generate:importmap` - Generate import map for admin UI

### SvelteKit Frontend (alkebu-web/)
- `npm run dev` - Start development server on localhost:5173
- `npm run build` - Build production bundle
- `npm run preview` - Preview production build
- `npm run check` - Run Svelte type checking
- `npm run lint` - Run ESLint

### Script Execution (alkebu-load/)
TypeScript scripts in `/scripts/` directory:
- `tsx scripts/square-integration.ts` - Square API integration testing
- `tsx scripts/import-books.ts` - Book import functionality 
- `tsx scripts/square-payload-sync.ts` - Sync between Square and Payload
- `tsx scripts/initialize-search.ts` - Initialize search indices
- `tsx scripts/initialize-search.ts --sample-data` - Initialize with sample content

## Architecture

### Data Flow
```
Square POS → Payload CMS (inventory sync only via webhooks)
                ↓
    Products, Carts, Orders, Customers (all in Payload)
                ↓
    Stripe (payment processing via embedded checkout)
                ↓
    SvelteKit Frontend (consumes Payload APIs)
```

### Key Collections (alkebu-load/)
#### Product Collections
- **Books** - Main inventory with edition management and auto-categorization
- **WellnessLifestyle**, **FashionJewelry**, **OilsIncense** - Non-book inventory
- **ExternalBooks** - Cached external book data from APIs

#### E-Commerce Collections
- **Carts** - Shopping cart management with Local API optimization
- **CartItems** - Individual cart line items with product relationships
- **Orders** - Order management with Stripe integration and fulfillment tracking
- **Customers** - Extended user profiles with shipping addresses and tax status

#### Content Collections  
- **BlogPosts** - Articles with SEO and product relationships
- **Events** - Event management with registration and recurring events
- **Businesses** - Local business directory with reviews
- **Comments** - Universal commenting system with moderation

#### System Collections
- **Authors**, **Publishers**, **Vendors** - Relationship management
- **SearchAnalytics** - Search behavior tracking
- **BookQuotes** - External book quote request management

### Search Implementation
Three-tier search system:
1. **Client-side**: FlexSearch with pre-indexed catalog (0-50ms)
2. **Server-side**: PostgreSQL Full-Text Search (50-200ms)  
3. **External APIs**: ISBNdb, Google Books, Open Library (500ms-3s)

## Important File Locations

### Core Configuration
- `alkebu-load/src/payload.config.ts` - Main Payload configuration
- `alkebu-load/.env` - Environment variables (copy from .env.example)

### Search & External APIs
- `alkebu-load/src/app/utils/searchEngine.ts` - FlexSearch implementation
- `alkebu-load/src/app/utils/externalBookAPI.ts` - External book API integration
- `alkebu-load/src/app/utils/quoteRequestSystem.ts` - Quote request workflow
- `alkebu-load/src/app/api/search/route.ts` - Search API endpoint
- `alkebu-load/src/app/api/external-books/route.ts` - External book search

### E-Commerce & Payments
- `alkebu-load/src/app/utils/cartOperations.ts` - Cart CRUD operations via Local API
- `alkebu-load/src/app/utils/stripeHelpers.ts` - Stripe integration utilities
- `alkebu-load/src/app/api/checkout/route.ts` - Stripe checkout session creation
- `alkebu-load/src/app/api/stripe-webhook/route.ts` - Stripe payment webhooks

### Square Integration (Inventory Only)
- `alkebu-load/src/app/utils/squareSync.ts` - Square POS integration
- `alkebu-load/src/app/api/webhooks/square-catalog/route.ts` - Square webhooks
- `alkebu-load/scripts/square-integration.ts` - Testing utilities

## Development Setup

### First-Time Setup (alkebu-load/)
1. `cd alkebu-load && pnpm install`
2. Copy `.env.example` to `.env` and configure:
   - `DATABASE_URI` - SQLite file path or PostgreSQL connection
   - `PAYLOAD_SECRET` - Encryption secret
   - `SQUARE_ACCESS_TOKEN` - Square POS API token
   - Optional: `ISBNDB_API_KEY`, `GOOGLE_BOOKS_API_KEY`
3. `pnpm dev` - Starts server on localhost:3000
4. Create first admin user at `/admin`
5. `tsx scripts/initialize-search.ts` - Initialize search indices

### Frontend Setup (alkebu-web/)
1. `cd alkebu-web && npm install`
2. `npm run dev` - Starts on localhost:5173
3. Configure API endpoints to connect to Payload backend

## API Structure

### E-Commerce Endpoints
- `POST /api/checkout` - Create Stripe checkout session
- `POST /api/stripe-webhook` - Handle Stripe payment webhooks
- Cart operations via Payload Local API (no HTTP endpoints needed)

### Search Endpoints
- `GET /api/search?q={query}` - General search across all content
- `GET /api/external-books?q={query}` - External book search
- `POST /api/quote-request` - Request quote for external books

### Payload APIs
- `GET /api/graphql` - GraphQL endpoint for all collections
- REST endpoints: `/api/books`, `/api/events`, `/api/businesses`, `/api/orders`, `/api/carts`
- Admin interface: `/admin`

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

## Available MCP Tools:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.

## Technical Notes

- **Database**: SQLite for development, PostgreSQL for production
- **Search**: Run initialization script after setting up collections
- **E-Commerce**: Integrated into Payload CMS using Local API for performance
- **Payment Processing**: Stripe embedded checkout (no redirects)
- **Square Integration**: Inventory sync only, not payment processing
- **Cart Performance**: Local API operations <50ms, session-based guest carts
- **External Books**: Graceful degradation when APIs are unavailable
- **Voice Search**: Browser-only functionality for ISBN lookup
- **Multi-location Inventory**: Supports multiple store locations
- **Auto-categorization**: Books automatically assigned to curated collections