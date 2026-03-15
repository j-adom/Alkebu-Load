# Alkebulanimages 2.0 - Product Requirements Document

**Last Updated:** March 14, 2026

## Executive Summary

Alkebulanimages 2.0 is a comprehensive digital platform for a Nashville-based Black-owned bookstore and cultural hub. The platform combines e-commerce, content management, community engagement, and inventory management into a unified system built on **Payload CMS** as the sole backend. The MVP is live at alkebulanimages.com; the 2.0 relaunch adds online purchasing, order management, and operational tooling for lean in-store staff workflows.

## Project Overview

### Vision
Create a modern, scalable digital platform that serves as the cornerstone for Alkebulanimages' online presence while fostering community engagement and supporting local Black businesses and culture.

### Mission
- **Primary**: Make in-store products and an extended book catalogue available to online customers
- **Secondary**: Provide a lean order-processing workflow so staff can handle online orders while working in-store
- **Tertiary**: Drive brand loyalty via events calendar and local Black business directory as low-cost community engagement tools

### Success Metrics
- **E-commerce**: 300% increase in online sales within first year
- **Community Engagement**: Directory of 100+ local Black businesses
- **Content**: 2-3 blog posts weekly with 1,000+ monthly readers
- **Events**: 12+ annual community events with online registration
- **Technical**: 99.9% uptime, <2s page load times, mobile-first responsive design
- **B2B**: 3+ institutional accounts active within year one (Phase 2)

## Current Status (March 2026)

### Completed
- **Payload CMS Backend** - All collections, relationships, access control
- **E-Commerce Engine** - Carts (Local API), Orders, Stripe checkout, tax/shipping calculations
- **Production Deployment** - Backend live at `payload.alkebulanimages.com`, storefront deployed via Cloudflare Worker
- **Square POS Sync** - Webhook-based inventory synchronization
- **Book Enrichment System** - ISBNdb/Google Books batch enrichment, admin UI refresh button, bulk ISBN import
- **Search System** - FlexSearch + Payload/PostgreSQL-backed search APIs are live; external discovery plumbing exists in backend
- **Payment Adapter Pattern** - Pluggable Stripe + Square adapters with webhook handling; Stripe is the verified launch path and Square checkout still needs end-to-end validation
- **Tax Calculation** - Tennessee destination-based tax rules are implemented in checkout; Tennessee shipments are taxed and out-of-state shipments are not
- **UI/UX Modernization** - Afrocentric design system (Kente colors), responsive layouts
- **Events System** - Full backend + frontend with filtering
- **Business Directory** - Collection with businessType/inDirectory/directoryCategory distinctions
- **Order Management** - Staff notification emails, Order Dashboard (tablet-friendly), daily digest, refund API with auth
- **Email System** - Afrocentric branded templates, customer confirmations, staff notifications, daily digest

### In Progress
- **Checkout Hardening** - Quote-locked Stripe checkout is implemented; stale quotes are now suppressed in cart summaries and refreshed before payment, but end-to-end browser QA and production smoke testing still remain
- **Shippo Shipping Integration** - Checkout preview now supports normalized shipping options, Media Mail defaults for book-only orders, and fallback rates when Shippo is unavailable; live production credential validation is still pending
- **Square Hosted Checkout Validation** - The adapter now persists Square order IDs for reconciliation, but hosted checkout still needs sandbox/production verification before it should be treated as launch-ready
- **Data Import** - Product catalog export from Square and import to Payload
- **Content/Community Frontend Alignment** - Blog, reviews/comments, and advanced search UI still need polish to match backend schema/capabilities
- **Transactional Email Verification** - SES-aligned transport is wired in code, but deployed verification still needs a protected test endpoint or controlled production test

### Planned (Post-Launch)
- **Phase 2**: Blog content, advanced search features, deeper fulfillment automation
- **Phase 3**: NocoDB for business intelligence, n8n for workflow automation
- **Phase 4**: Mobile app, loyalty program, multi-language support

## Technical Architecture

### Technology Stack
- **Backend**: Payload CMS 3.68.5 with Next.js 15, PostgreSQL (production) / SQLite (dev)
- **Frontend**: SvelteKit 2.8 with Svelte 5, TailwindCSS, shadcn-svelte
- **Hosting**: Payload-hosted backend at `payload.alkebulanimages.com`, Cloudflare Worker frontend for `alkebulanimages.com`
- **Payments**: Stripe hosted Checkout (primary), Square POS inventory sync, Square hosted checkout adapter under validation
- **Email**: Amazon SES SMTP for transactional emails (nodemailer)
- **Search**: FlexSearch + PostgreSQL FTS + ISBNdb/Google Books/Open Library
- **Authentication**: Payload JWT tokens (OAuth future phase)
- **CDN**: Cloudinary for images, Cloudflare for static assets
- **Events & Ticketing**: hi.events (external instance at tickets.alkebulanimages.com)

### Repository Structure
- **`alkebu-load/`**: Payload CMS backend with integrated e-commerce
- **`alkebu-web/`**: SvelteKit frontend consuming Payload APIs
- **`alkebu-shared/`**: Shared TypeScript types and utilities (planned)

### Data Flow
```
Square POS --> Payload CMS (inventory sync via webhooks)
                |
    Products, Carts, Orders, Customers (all in Payload)
                |
    Stripe (payment processing via embedded checkout)
                |
    SvelteKit Frontend (display & interaction)
```

## Core Features

### 1. E-Commerce Platform

#### Customer Features
- Product browsing by genre, author, publisher, and curated collections
- Three-tier search with typo tolerance, voice search, barcode scanning
- External book discovery via ISBNdb, Google Books, Open Library
- Quote requests for unavailable titles (24-72hr response)
- Persistent shopping carts with Local API (<50ms operations)
- Stripe hosted Checkout with preview-locked Tennessee tax and shipping totals
- Account management with order history and wishlists

#### Staff Features
- **Order Dashboard** - Tablet-optimized view at `/admin/order-dashboard` with tabs for "Needs Attention", "Shipped", "All Orders"
- **Order Notifications** - Instant email to staff when new orders arrive
- **Daily Digest** - 7 AM CT email summarizing outstanding orders with aging warnings
- **Tracking & Shipping** - Enter Pirate Ship tracking numbers, mark orders shipped (Phase 1: manual labels, Phase 2: Shippo API)
- **Inventory Sync** - Real-time Square POS inventory updates via webhooks
- **Multi-Location Tracking** - Main Store vs Warehouse inventory
- **Refund Processing** - Admin-only API (staff use Stripe Dashboard for Phase 1)
- **Abandoned Cart Recovery** - Scheduled cleanup every 2 hours

### 1b. Shipping Management

#### Phase 1 (Current) - Pirate Ship (Manual Fulfillment)
- Staff creates shipping labels in Pirate Ship (external, no API)
- Staff enters tracking number + carrier in Order Dashboard
- System auto-sends customer shipping notification with tracking
- Checkout preview persists normalized shipping quotes and selected method before payment
- Free shipping over $75 threshold

#### Phase 1.5 (Current Checkout Rating) - Shippo API
- Live carrier rating for checkout pricing (USPS, UPS, FedEx)
- Book-only carts default to USPS Media Mail but customers can switch methods
- Shipping quote lock with expiry/fingerprint validation before Stripe session creation

#### Phase 2 (When Volume Justifies) - Shippo Operational Automation
- Automated label generation from Payload admin
- Webhook-based tracking updates
- Multi-location fulfillment routing

### 2. Content Management System

#### Blog & Articles
- Rich content: book reviews, cultural articles, wellness guides
- SEO optimization with auto-generated meta tags, structured data
- Product relationships linking articles to relevant products
- Comment system with Perspective API filtering

### 3. Community Directory

#### Business Directory Features
- Detailed listings with hours, services, contact info
- **Business types**: directory-listing, business-partner, event-sponsor, referenced-business
- **Directory categories**: black-owned, minority-owned, community-partner, local-business, cultural-institution
- Reviews & ratings with moderated user reviews
- Filtering by business category + ownership type
- Staff-managed, eventually may be run by separate news/events discovery business

### 4. Events Management

#### Event Features
- Event types: book launches, author readings, workshops, community meetings
- Calendar display with filtering by type and timing
- External ticketing via hi.events instance
- Recurring events support (monthly book clubs, weekly sessions)
- Calendar integration (Google, iCal)

### 5. Email Notifications

#### Templates (Afrocentric branded)
- **Order Confirmation** - Customer receives order summary with tracking
- **Staff Notification** - Instant email on new order with admin link
- **Order Status Update** - Customer notified on status changes (shipped, delivered)
- **Daily Digest** - 7 AM CT outstanding orders summary for staff
- **Abandoned Cart** - Recovery email for inactive carts

#### March 12, 2026 Progress Note
- Checkout preview now acts as the authoritative pricing source for tax, shipping, and total before payment
- Stripe session creation uses persisted quote-locked cart totals instead of recalculating shipping/tax at payment time
- Book shipping weights now support edition-first lookup with paperback/hardcover fallback defaults and a backfill script for existing catalog cleanup
- Transactional email code now targets Amazon SES SMTP consistently across Payload and custom email utilities
- Deployed backend health verified at `payload.alkebulanimages.com/api/health`
- Deployed transactional email delivery is not yet verified because there is no safe protected test-email endpoint and the local backend env is still missing an SES SMTP password

#### Design System
- Kente Gold (#D4A030) CTAs, Forest Green (#2E5C48) header/footer
- Kente gradient stripe (gold, terracotta, forest, indigo)
- Cream (#FFF8EC) content background, Georgia serif headings

## Payload CMS Collections

### Commerce Collections
- **Carts** & **CartItems** - Local API optimized, session-based guest carts
- **Orders** - Stripe/Square integration, fulfillment tracking, internal notes, refunds
- **Customers** - Extended user profiles with addresses, tax status
- **InstitutionalAccounts** - B2B accounts with tax exemption (Phase 2)

### Product Collections
- **Books** - Main inventory with edition management, auto-enrichment, auto-categorization
- **WellnessLifestyle** - Health & beauty products
- **FashionJewelry** - Apparel & accessories
- **OilsIncense** - Oils and incense products

### Content Collections
- **BlogPosts** - Rich text with SEO and product relationships
- **Events** - Registration, recurring, venues
- **Businesses** - Directory listings with type/category distinctions
- **Comments** - Universal commenting with moderation

### System Collections
- **Authors**, **Publishers**, **Vendors** - Relationship management
- **ExternalBooks** - Cached external API results
- **BookQuotes** - Quote request tracking
- **SearchAnalytics** - Search behavior tracking
- **Users** - Roles: admin, staff, editor, customer

## Search Implementation

### Three-Tier Search System

1. **Client-Side (0-50ms)** - FlexSearch with pre-indexed catalog, typo tolerance, phonetic matching
2. **Server-Side (50-200ms)** - PostgreSQL Full-Text Search, complex filters, cross-collection
3. **External APIs (500ms-3s)** - ISBNdb, Google Books, Open Library; auto-create products, quote request system

## Development Phases

### Phase 1: MVP & Launch (Current)
**Status: ~78% complete**
- [x] Payload CMS with all collections
- [x] Square POS webhook integration
- [x] Book import & enrichment system
- [x] E-commerce backend (carts, orders, checkout, refunds)
- [x] Payment adapter pattern (Stripe + Square)
- [x] Tax calculation (Tennessee destination-based rules in checkout)
- [x] UI/UX modernization (Afrocentric design system)
- [x] Events system (backend + frontend)
- [x] Business directory with type distinctions
- [x] Order management (dashboard, notifications, daily digest)
- [x] Email system (Afrocentric branded templates)
- [x] Refund API with admin-only auth
- [x] Frontend-backend checkout integration
- [ ] Data import from Square
- [x] Production deployment
- [ ] End-to-end checkout/browser QA
- [ ] Staff training

### Phase 2: Enhanced Features (Post-Launch)
- Operational Shippo label automation (when volume justifies cost)
- Blog content creation & publishing workflow
- Advanced search features (voice, barcode)
- Customer loyalty integration
- Listmonk email marketing
- Consignment vendor reports

### Phase 3: Business Intelligence
- NocoDB for B2B sales pipeline, event planning, resource tracking
- n8n for workflow automation (inventory alerts, marketing triggers, social scheduling)

### Phase 4: Growth
- Mobile app development
- Advanced personalization
- Multi-language support
- B2B institutional accounts, purchase orders, net terms

### Phase 5: Platform
- Marketplace functionality
- Author self-publishing portal
- Community features
- AI recommendations

## Infrastructure

### Backend (`payload.alkebulanimages.com`)
- Payload-hosted Next.js + Payload CMS deployment
- Production database managed through Payload hosting stack
- TLS enabled on custom domain
- Backups/ops handled through current hosting platform processes

### Frontend (Cloudflare Worker)
- Worker-based deployment serving `alkebulanimages.com`
- Edge caching globally through Cloudflare
- Frontend consumes Payload APIs from `payload.alkebulanimages.com`

### Scheduled Jobs (Payload)
- `cleanup-abandoned-carts` - Every 2 hours
- `daily-order-digest` - 12:00 UTC (7 AM CDT)

## Security

- All API keys in environment variables
- HTTPS only (HSTS headers)
- Payload JWT tokens in httpOnly cookies
- Refund API: admin-only POST, admin+staff GET
- Order Dashboard: staff + admin access
- Rate limiting on public APIs
- Input validation/sanitization

## Environment Variables

```env
# Core
DATABASE_URI=postgresql://...
PAYLOAD_SECRET=...

# Payments
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Square (inventory sync)
SQUARE_ACCESS_TOKEN=...
SQUARE_WEBHOOK_SIGNATURE_KEY=...

# Email
FROM_EMAIL=orders@alkebulanimages.com
FROM_NAME=Alkebu-Lan Images
SES_SMTP_USER=...
SES_SMTP_PASSWORD=...
STAFF_NOTIFICATION_EMAIL=info@alkebulanimages.com
ORDER_ADMIN_BASE_URL=https://admin.alkebulanimages.com

# Book APIs
ISBNDB_API_KEY=...
GOOGLE_BOOKS_API_KEY=...

# Tax/Shipping
TENNESSEE_STATE_TAX_RATE=0.07
FREE_SHIPPING_THRESHOLD=7500
```

## Key Implementation Files

### E-Commerce & Orders
- `alkebu-load/src/collections/Orders.ts` - Order collection with fulfillment tracking
- `alkebu-load/src/app/utils/stripeHelpers.ts` - Stripe checkout + webhook processing
- `alkebu-load/src/app/utils/taxShippingCalculations.ts` - Tax/shipping logic
- `alkebu-load/src/app/utils/shippingQuotes.ts` - Shippo/fallback quote normalization + quote locking
- `alkebu-load/src/app/utils/cartOperations.ts` - Cart CRUD via Local API
- `alkebu-load/src/app/api/checkout/route.ts` - Checkout session creation
- `alkebu-load/src/app/api/checkout/preview/route.ts` - Checkout pricing preview + quote persistence
- `alkebu-load/src/app/api/refund/route.ts` - Refund API (admin-only)

### Order Management
- `alkebu-load/src/app/components/OrderDashboard.tsx` - Staff order dashboard
- `alkebu-load/src/app/utils/emailService.ts` - Email sending functions
- `alkebu-load/src/app/utils/emailTemplates.ts` - Afrocentric branded templates
- `alkebu-load/src/app/utils/orderDigest.ts` - Daily digest query + send

### Search & Enrichment
- `alkebu-load/src/app/utils/searchEngine.ts` - FlexSearch implementation
- `alkebu-load/src/app/utils/externalBookAPI.ts` - External book API integration
- `alkebu-load/src/app/components/EnrichBookButton.tsx` - Admin UI refresh button

### Configuration
- `alkebu-load/src/payload.config.ts` - Main Payload config
- `alkebu-load/.env.example` - Environment variable template
