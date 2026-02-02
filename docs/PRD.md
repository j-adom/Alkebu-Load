# Alkebulanimages 2.0 - Product Requirements Document (Payload-Only Architecture)

## Executive Summary

Alkebulanimages 2.0 is a comprehensive digital platform for a Nashville-based Black-owned bookstore and cultural hub. The platform combines e-commerce, content management, community engagement, and inventory management into a unified system built entirely on **Payload CMS** as the backend. The architecture emphasizes simplicity, performance, and scalability while supporting both current bookstore operations and future expansion into Nashville's Black community digital infrastructure.

## Project Overview

### Vision
Create a modern, scalable digital platform that serves as the cornerstone for Alkebulanimages' online presence while fostering community engagement and supporting local Black businesses and culture.

### Mission
- **Primary**: Deliver seamless online-to-offline integration for retail, events, and cultural content
- **Secondary**: Build reusable digital infrastructure for Black community commerce and media
- **Tertiary**: Enable B2B functionality for institutions (schools, nonprofits, churches) with special pricing

### Success Metrics
- **E-commerce**: 300% increase in online sales within first year
- **Community Engagement**: Directory of 100+ local Black businesses
- **Content**: 2-3 blog posts weekly with 1,000+ monthly readers
- **Events**: 12+ annual community events with online registration
- **Technical**: 99.9% uptime, <2s page load times, mobile-first responsive design
- **B2B**: 3+ institutional accounts active within year one (Phase 2)

## Technical Architecture

### Technology Stack
- **Backend**: Payload CMS 3.54.0 with PostgreSQL
- **Frontend**: SvelteKit with Svelte 5 and shadcn-svelte
- **Hosting**: Hostinger VPS KVM 4 with Coolify
- **CDN**: Cloudflare Pages for frontend, R2 for media storage
- **Payments**: Stripe Embedded Checkout (no redirect)
- **POS Integration**: Square (inventory sync only, not payments)
- **Authentication**: Payload JWT (OAuth future phase)
- **Email**: Resend for transactional, Listmonk for marketing
- **Search**: FlexSearch + PostgreSQL FTS + External Book APIs
- **Analytics**: Plausible (self-hosted, privacy-focused)
- **Monitoring**: Uptime Kuma (self-hosted)
- **Shipping**: Shippo API (multi-carrier, Square POS integration)
- **Events & Ticketing**: hi.events (external instance at tickets.alkebulanimages.com)

### Repository Structure
- **`alkebu-load`**: Payload CMS backend with integrated e-commerce
- **`alkebu-web`**: SvelteKit frontend consuming Payload APIs
- **`alkebu-shared`**: Shared TypeScript types and utilities

### Data Flow Architecture
```
Square POS → Payload CMS (inventory sync via webhooks)
                ↓
    Products, Orders, Customers
                ↓
    Stripe (payment processing)
                ↓
    SvelteKit Frontend (display)
```

## Core Features & User Stories

### 1. E-Commerce Platform

#### Customer Features
- **Product Browsing**: Browse books by genre, author, publisher, and curated collections
- **Advanced Search**: FlexSearch with typo tolerance, voice search, barcode scanning
- **External Book Discovery**: Auto-search ISBNdb, Google Books, Open Library for unavailable titles
- **Quote Requests**: One-click quotes for books found externally (24-72hr response)
- **Shopping Cart**: Persistent carts with Local API for <50ms operations
- **Checkout**: Stripe Embedded Checkout with automatic Tennessee tax calculation
- **Account Management**: Order history, wishlists, Payload authentication (OAuth future phase)

#### Staff Features
- **Inventory Sync**: Real-time Square POS inventory updates via webhooks
- **Multi-Location Tracking**: Main Store vs Warehouse vs Store 2 inventory
- **Order Consolidation**: View all orders (online + POS) in Payload admin
- **Consignment Reporting**: Auto-generated vendor sales reports
- **Abandoned Cart Recovery**: Email campaigns for carts inactive >1 hour

### 1b. Shipping Management

#### Customer Features
- **Shipping Options Display**: Real-time carrier rates (USPS, UPS, FedEx) from Shippo API
- **Promotional Shipping Rules**: Free shipping over $50, tiered discounts by weight/region
- **Delivery Estimates**: Transparent delivery timelines during checkout
- **Multi-Source Fulfillment**: Combined pricing when orders require dropship fulfillment
- **Digital Item Handling**: Zero shipping for event tickets with optional service fees displayed
- **Order Tracking**: Integration with Shippo tracking webhooks for real-time updates

#### Staff Features
- **Shipping Rules Engine**: Configure promotional rules, threshold-based discounts, regional pricing
- **Location-Based Fulfillment**: Route orders to appropriate warehouse/store with optimized shipping costs
- **Carrier Management**: Configure rates, cutoff times, and service levels per carrier
- **Batch Label Generation**: Create and download shipping labels from Payload admin
- **Return Management**: Pre-filled return labels for refund processing
- **Shipping Analytics**: Track costs vs revenue, carrier performance, delivery success rates

### 2. Content Management System

#### Blog & Articles
- **Rich Content**: Book reviews, cultural articles, wellness guides
- **SEO Optimization**: Auto-generated meta tags, structured data
- **Product Relationships**: Link articles to relevant products
- **Comment System**: Auto-approved with Perspective API filtering

#### Content Categories
- Book Reviews & Literary Criticism
- African Diaspora Culture & History
- Nashville Black Community News
- Wellness & Spiritual Practices
- Fashion & Lifestyle

### 3. Community Directory

#### Business Directory Features
- **Business Profiles**: Detailed listings with hours, services, contact info
- **Categories**: Restaurants, Services, Retail, Health, Arts, Religious, Education
- **Reviews & Ratings**: Moderated user reviews with reputation scoring
- **Map Integration**: Interactive location mapping
- **Featured Businesses**: Highlighted exceptional businesses

### 4. Events Management

#### Event Features
- **Event Types**: Book launches, author readings, workshops, community meetings
- **Calendar Display**: On-site calendar showing all upcoming events with descriptions
- **External Ticketing**: Seamless links to hi.events instance (tickets.alkebulanimages.com) for ticket purchases
- **Recurring Events**: Support for monthly book clubs, weekly meditation sessions
- **Calendar Integration**: Add to personal calendar functionality (Google, iCal)
- **Venue Management**: Track locations, capacity, and event logistics

### 5. User Engagement & Moderation

#### Comment System (Payload-Native)
- **Universal Comments**: Across products, articles, events, businesses
- **Moderation Queue**: Manual review for product/event/business comments
- **Auto-Filtering**: Perspective API for toxicity detection (0.7 threshold)
- **User Reputation**: Trust scoring based on comment history
- **Spam Prevention**: hCaptcha integration

## Technical Requirements

### Performance Requirements
- **Page Load**: <2 seconds (90th percentile)
- **Search Response**: <50ms client-side, <200ms server-side
- **Cart Operations**: <50ms using Local API
- **Mobile Score**: Lighthouse >90
- **SEO Score**: Lighthouse >95
- **Accessibility**: WCAG 2.1 AA compliance

### Scalability Requirements
- **Concurrent Users**: 1000+ simultaneous
- **Database Size**: 100k+ products, 10k+ posts, 1k+ businesses
- **API Performance**: <200ms response (95th percentile)
- **Search Performance**: Handle 2-3 second external API fallbacks gracefully

### Security Requirements
- **Payment Security**: PCI DSS via Stripe (no card data stored)
- **Authentication**: Payload JWT tokens (OAuth future phase)
- **Data Protection**: GDPR/CCPA compliance features
- **API Security**: Rate limiting, input validation
- **Moderation**: hCaptcha + Perspective API for spam/abuse

### Integration Requirements

#### Square POS Integration (Inventory Only)
```javascript
// Required Square webhooks
webhooks: [
  'inventory.count.updated',    // Stock level changes
  'catalog.item.updated',       // Product updates
  'customer.created',           // Loyalty sync
  'customer.updated',          // Profile updates
  'order.created',            // Order consolidation
  'location.updated'          // Multi-location support
]
```

#### Stripe Payment Integration
- Embedded Checkout (no redirects)
- Automatic tax calculation for Tennessee (7% state tax)
- Support for tax-exempt institutional accounts
- Webhook handling for order fulfillment

#### Shippo Shipping Integration
```javascript
// Required Shippo features
features: [
  'multi_carrier_rates',        // Real-time rates from USPS, UPS, FedEx
  'shipment_tracking',         // Webhook updates for delivery status
  'label_generation',          // Create/download shipping labels
  'batch_operations',          // Process multiple shipments
  'return_labels',             // Pre-filled return shipping
  'square_pos_sync'            // Unified POS + online fulfillment
]

// Carrier Configuration
carriers: [
  'usps',      // Cost-effective for lighter books/items
  'ups',       // Reliable for heavier orders
  'fedex'      // Regional backup option
]
```

#### External Book APIs
- **ISBNdb**: Primary source ($10-25/month)
- **Google Books**: Free fallback
- **Open Library**: Free comprehensive backup
- **Priority**: ISBNdb → Google Books → Open Library (tiebreaker)

#### hi.events Integration
```javascript
// Integration approach
ticketingArchitecture: {
  instance: 'tickets.alkebulanimages.com',
  purpose: 'Dedicated ticketing platform',
  features: [
    'event_creation_and_management',
    'ticket_sales_and_fulfillment',
    'attendee_check_in',
    'qr_code_generation',
    'automated_reminders',
    'ticket_scanning_app'
  ]
}

// On-site integration
siteIntegration: {
  calendar: 'Display events with basic info (date, time, venue)',
  ctaButton: 'Link to hi.events ticket page',
  noCheckout: 'Tickets NOT sold through Payload/Stripe checkout',
  dataSync: 'Event details fetched via hi.events API for display'
}
```

## Payload CMS Collections

### Commerce Collections
- **Products** (Books, WellnessLifestyle, FashionJewelry, OilsIncense, digital property for shipping rules)
- **Carts** & **CartItems** (Local API optimized)
- **Orders** (Stripe integration, Square sync, shipping details)
- **Customers** (Extended users with addresses, tax status)
- **ShippingRules** (Promotional rules, thresholds, regional pricing)
- **ShippingRates** (Cached Shippo rates, fallback rates)
- **ShippingLabels** (Generated labels, tracking numbers, carrier data)
- **Fulfillment** (Order routing, multi-location fulfillment tracking)

### Content Collections
- **BlogPosts** (Rich text, SEO, product relationships)
- **Events** (Registration, recurring, venues)
- **Businesses** (Directory listings, reviews)
- **Comments** (Universal, moderated)

### Support Collections
- **ExternalBooks** (Cached API results)
- **BookQuotes** (Quote request tracking)
- **SearchAnalytics** (Behavior tracking)
- **Authors**, **Publishers**, **Vendors** (Relationships)
- **Categories**, **Tags** (Taxonomy)

### B2B Collections (Phase 2)
- **Institutions** (Schools, nonprofits, churches)
- **PurchaseOrders** (Draft → Approved → Invoiced)
- **Invoices** (Net terms tracking)

## Search Implementation

### Three-Tier Search System

#### Tier 1: Instant Client-Side (0-50ms)
- FlexSearch with pre-indexed catalog
- Typo tolerance (2 character difference)
- Phonetic matching
- Field boosting: Title/Author (3x) > ISBN/Tags (2x) > Description (1x)

#### Tier 2: Server Database (50-200ms)
- PostgreSQL Full-Text Search
- Complex filters (price, availability, location)
- Cross-collection search (products, articles, events)

#### Tier 3: External APIs (500ms-3s)
- Triggered when no internal results
- Parallel API calls to ISBNdb, Google, Open Library
- Auto-create products from ISBN data
- Quote request system for unavailable books

### Search Features
- **Voice Search**: Web Speech API for mobile/desktop
- **Barcode Scanner**: Camera-based ISBN lookup
- **Search Analytics**: Track queries, click-through, conversions
- **Smart Suggestions**: "Did you mean..." for typos
- **Out-of-Stock Handling**: Show with clear status, enable quote requests

## Development Phases

### Phase 1: Foundation & Migration (Month 1)
✅ **Already Complete**:
- Payload CMS setup with collections
- Square webhook integration
- Book import system with ISBN enrichment
- FlexSearch implementation

**To Add**:
- E-commerce collections (Carts, Orders)
- Stripe webhook handlers
- Local API cart operations
- Fix media upload issues

### Phase 2: E-Commerce Core (Month 2)
- Stripe Embedded Checkout integration
- Tax calculation (Tennessee 7% + local)
- Order management workflow
- Customer account system with Payload authentication
- Abandoned cart recovery
- **Shipping Integration**: Shippo API setup, carrier configuration, shipping rules engine
- **Promotional Shipping**: Free shipping over $50, regional pricing
- **Multi-Location Fulfillment**: Location-based order routing with cost optimization

### Phase 3: Frontend Development (Months 2-3)
- SvelteKit with Svelte 5 and shadcn-svelte
- Product catalog with filtering
- Shopping cart with Local API
- Responsive design (mobile/tablet/desktop)
- Cloudflare Pages deployment

### Phase 4: MVP Features (Months 3-4)
- **Business Directory** (MUST HAVE)
- **Events System** (MUST HAVE)
- Blog with auto-moderation
- Comment system with moderation queue
- Search with external book lookups

### Phase 5: Enhanced Features (Months 4-5)
- Consignment vendor reports
- Inventory aging analysis
- Email campaigns with Listmonk
- Voice search & barcode scanning
- Customer loyalty integration

### Phase 6: Launch Preparation (Month 5-6)
- Performance optimization
- Security hardening
- Automated backups to Cloudflare R2
- Staff training
- Soft launch with select customers

### Post-Launch: B2B Features (Month 7+)
- Institutional accounts
- Purchase order workflows
- Custom pricing tiers
- Invoice generation
- Net terms management

## Infrastructure & Deployment

### Hostinger VPS KVM 4 Configuration
```yaml
Resources:
  - Payload CMS: 2GB RAM
  - PostgreSQL: 1GB RAM
  - Redis Cache: 512MB RAM
  - Listmonk: 256MB RAM
  
Services:
  - Coolify: Container orchestration
  - Uptime Kuma: Monitoring
  - Plausible: Analytics
  - Automated backups to Cloudflare R2
```

### Cloudflare Setup
- **Pages**: SvelteKit frontend hosting (free)
- **R2**: Media storage and backups
- **Workers**: Edge caching and functions
- **DNS**: Domain management

## Key Implementation Details

### Cart Performance Optimization
- Use Payload Local API (no HTTP overhead)
- Server-side operations <50ms
- Session-based guest carts
- Redis caching for active carts

### Tennessee Tax Calculation
- State tax: 7%
- Local tax: Variable by city
- Tax-exempt status for institutions
- Manual international order review

### Inventory Management
- Multi-location tracking (Store, Warehouse)
- Consignment flagging and reporting
- Automatic reorder suggestions
- Aging reports (items >6 months)

### Shipping Calculation & Optimization

#### Real-Time Rate Calculation
- Query Shippo API for live carrier rates on checkout
- Cache rates for 30 minutes to minimize API calls
- Fallback to pre-configured rates if API unavailable
- Filter carriers based on package weight/dimensions

#### Promotional Shipping Rules
```javascript
// Rule Engine Priority (first match applies)
rules: [
  { condition: 'free_over_threshold', value: 50 },      // Free shipping >$50
  { condition: 'regional_discount', region: 'TN', discount: 0.1 }, // 10% TN shipping
  { condition: 'weight_based', max_lbs: 3, fixed_rate: 5.99 },    // Flat $5.99 ≤3lbs
  { condition: 'carrier_discount', carrier: 'usps', discount: 0.05 } // 5% USPS
]
```

#### Multi-Location Fulfillment Pricing
- **Single Location**: Direct shipment at Shippo rates
- **Split Orders**: Calculate cost for each warehouse, show combined rate
  - Example: Main store $5.50 + Warehouse $3.25 = displayed $8.50 (optimized logic may reduce)
  - Server-side logic combines shipments when possible (same carrier, nearby destinations)
- **Dropship Integration**: Markup option (+10-15%) for 3rd-party fulfillment
- **Real-time Optimization**: Choose lowest-cost route while meeting delivery expectations

#### Digital Item Handling
- Products marked as `digital: true` have `shipping_type: 'none'`
- Digital products (books, ebooks, downloads) show zero shipping
- Event tickets are sold exclusively through hi.events and not included in on-site orders
- Multiple items: shipping fee applies only once per order (aggregate calculation)
- Mixed orders: Shipping calculated for physical items only

### Moderation Strategy
- **Auto-approve**: Blog comments (with Perspective API)
- **Queue for review**: Product, event, business comments
- **Trust scoring**: +10 approved, -20 flagged
- **Trusted threshold**: 100 points

## Risk Mitigation

### Technical Risks
- **Cart performance**: Local API + Redis caching
- **Search latency**: Client-side index + graceful fallbacks
- **Payment failures**: Stripe webhook retry logic
- **Inventory sync issues**: Queue system with error handling

### Business Risks
- **Scope creep**: Strict MVP focus, B2B deferred
- **User adoption**: Soft launch with feedback loops
- **Content moderation**: Clear guidelines + automation
- **Staff training**: Phased rollout with documentation

### Operational Risks
- **Database growth**: Automated cleanup jobs
- **Media storage costs**: Image optimization + CDN
- **API rate limits**: Caching + request queuing
- **Backup failures**: Multiple backup destinations

## Success Metrics & KPIs

### Business Metrics
- **Revenue**: 300% increase in online sales (Year 1)
- **Customers**: 50% increase in new customers
- **Community**: 1000+ monthly active users
- **Directory**: 100+ businesses listed (6 months)
- **Events**: 80% online registration adoption

### Technical Metrics
- **Performance**: <2s page load, >95 Lighthouse
- **Search Success**: 85% queries return relevant results
- **Cart Conversion**: 70% cart-to-order rate
- **API Uptime**: 99.9% availability
- **External Books**: 60% quote-to-purchase conversion

### Engagement Metrics
- **Comments**: 5+ per blog post average
- **Reviews**: 30% of customers leave reviews
- **Social Shares**: 2x increase in social traffic
- **Newsletter**: 40% open rate, 10% click rate
- **Search**: 20% of searches → quote requests

## Conclusion

This Payload-only architecture simplifies the technical stack while maintaining all required functionality. By eliminating MedusaJS and leveraging Payload's Local API for e-commerce operations, we reduce complexity and improve performance. The phased approach ensures MVP delivery within 6 months while laying groundwork for future B2B expansion.

The integration of Square for inventory management, Stripe for payments, and external book APIs for discovery creates a comprehensive solution that serves both immediate business needs and long-term community building goals. The focus on performance optimization, particularly for search and cart operations, ensures excellent user experience even on the modest VPS infrastructure.