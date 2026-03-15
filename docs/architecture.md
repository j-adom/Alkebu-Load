# Alkebulanimages 2.0 - Architecture Overview

## Current Status (Updated January 2025)

### Production Ready
- **alkebu-load**: Payload CMS 3.54.0 backend with integrated e-commerce, Square POS sync, Stripe payments
- **alkebu-web**: SvelteKit frontend (Svelte 5) with Cloudflare adapter, migrated from Sapper/Sanity to Payload integration

### Planned/Future
- **alkebu-shared**: TypeScript types and utilities shared between services
- **Phase 3 (Post-Launch)**: NocoDB for business intelligence, n8n for workflow automation
- **Mobile App**: React Native or Flutter app consuming Payload APIs

## Architecture Decision: Payload-Only Approach

**Decision**: Use Payload CMS as the single backend system instead of separate CMS + e-commerce services.

**Benefits**:
- Single admin interface for all content and commerce
- Unified data model and relationships
- Simplified deployment and maintenance
- Built-in user management, permissions, and API
- Local API for high-performance cart operations

## Technology Stack

### Backend (alkebu-load)
- **CMS/E-commerce**: Payload CMS 3.54.0 with TypeScript
- **Database**: PostgreSQL (production) / SQLite (development)
- **Payments**: Stripe hosted Checkout (primary), Square POS inventory sync, Square hosted checkout adapter under validation
- **Email**: Amazon SES SMTP with generic SMTP fallback for transactional emails
- **Search**: Three-tier system (FlexSearch + PostgreSQL FTS + External APIs)
- **File Storage**: Cloudinary for images
- **Authentication**: Payload JWT tokens (no external auth libraries)

### Frontend (alkebu-web)
- **Framework**: SvelteKit with TypeScript
- **Svelte Version**: 5.39.7 (upgraded January 2025)
- **Deployment**: Cloudflare Pages with adapter-cloudflare
- **Authentication**: Payload JWT validation via hooks.server.ts
- **Styling**: TailwindCSS 3.x with shadcn-svelte components
- **UI Components**: bits-ui, lucide-svelte
- **State Management**: Svelte 5 runes ($state, $derived) for cart, auth
- **Caching**: SSR with Cloudflare-compatible cache headers

### Infrastructure
- **Backend Hosting**: Hostinger VPS with Docker
- **Frontend Hosting**: Cloudflare Pages with edge caching
- **CDN**: Cloudinary for images, Cloudflare for static assets
- **Database**: Managed PostgreSQL (Neon.tech or similar)

## Data Architecture

### Core Collections (Payload CMS)

#### Product Collections
```
Books (main inventory)
├── editions[] (different formats/bindings)
├── authors[] (relationship)
├── categories[] (genres/collections)
├── tags[] (topics/themes)
└── pricing (retail/wholesale)

WellnessLifestyle (health & beauty products)
├── variants[] (sizes/types)
├── categories[] (product groupings)
└── tags[] (wellness topics)

FashionJewelry (apparel & accessories)
├── variants[] (sizes/colors)
├── brand (relationship)
└── categories[] (clothing/jewelry types)

OilsIncense (split by type)
├── type: 'oil' | 'incense'
├── scent profiles
└── categories[] (collections)
```

#### E-commerce Collections
```
Carts → CartItems → Products
├── sessionId (guest carts)
├── customerId (logged-in users)
└── expiresAt (cleanup)

Orders (Stripe integration)
├── stripeCheckoutSessionId
├── fulfillmentStatus
├── shippingAddress
└── lineItems[]

Customers (extended user profiles)
├── user (relationship)
├── addresses[] (shipping)
├── taxExempt boolean
└── orderHistory
```

#### Content Collections
```
BlogPosts (articles & reviews)
├── categories[] (topics)
├── relatedProducts[] (product mentions)
├── author (relationship)
└── seoMetadata

Events (author visits, workshops)
├── recurring (boolean)
├── registration data
├── location info
└── capacity limits

Businesses (local directory with distinctions)
├── businessType (directory-listing|business-partner|event-sponsor|referenced-business)
├── inDirectory (boolean - appears in local directory)
├── directoryCategory (black-owned|minority-owned|community-partner|local-business|cultural-institution)
├── categories[] (business types - restaurants, retail, etc.)
├── location (address with coordinates)
├── reviews[] (user feedback)
├── verified (staff verification status)
└── contactInfo
```
### Global Singletons
```
HomePage, AboutPage, ContactPage, ShopPage, SiteSettings
- Migrated from Sanity document types
- Managed through Payload Globals
- No collections needed for single pages
```
## Authentication Architecture

### Payload-Only Authentication (No Auth.js)

**Decision**: Single authentication system using Payload's built-in auth

**Flow**:
1. User logs in → Payload API validates credentials
2. Payload returns JWT token
3. SvelteKit stores JWT in httpOnly cookie
4. hooks.server.ts validates JWT on each request
5. User data available in event.locals

**Implementation**:
```typescript
// SvelteKit hooks.server.ts (simplified)
export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get('payload-token')
  
  if (token) {
    try {
      const response = await fetch(`${PAYLOAD_API_URL}/api/users/me`, {
        headers: { Authorization: `JWT ${token}` }
      })
      
      if (response.ok) {
        event.locals.user = await response.json()
      }
    } catch (error) {
      event.cookies.delete('payload-token', { path: '/' })
    }
  }
  
  return resolve(event)
}
```

**OAuth Implementation (Future Phase)**:
```
- Google/Facebook OAuth will be implemented in Payload backend
- Custom endpoints in Payload handle OAuth flow
- Returns Payload JWT to frontend
- No Auth.js or external auth libraries needed
```

**Benefits**:
```
- Single source of truth for users
- No dual auth system complexity
- Simpler maintenance and debugging
- OAuth fully contained in backend when added
```


## API Architecture

### Payload REST API
```
GET /api/books - Paginated book catalog
GET /api/books/:slug - Individual book details
GET /api/search - Multi-collection search
POST /api/checkout - Stripe session creation
POST /api/stripe-webhook - Payment processing
```

### Local API (Performance Optimized)
```
Cart operations (no HTTP overhead):
- payload.create('carts', data)
- payload.update('carts', id, data)
- payload.delete('carts', id)
```

### External Integrations
```
Square POS API:
- Webhook: /api/webhooks/square-catalog
- Inventory sync (read-only)
- Location management

Stripe API:
- Embedded Checkout sessions
- Webhook: /api/stripe-webhook
- Payment processing

External Book APIs:
- ISBNdb API (primary)
- Google Books API (fallback)
- Open Library (free tier)
```

## Frontend Architecture (SvelteKit)

### Routing Strategy
```
/ (homepage) - SSR prerendered
/shop/* - SSR with caching
  /books/* - Book catalog & filtering
  /apparel/* - Fashion & jewelry
  /health-and-beauty/* - Wellness products
  /home-goods/* - Incense, art, imports
/blog/* - SSR with caching
/search - Client-side search interface
/(app)/* - Client-only (cart, account)
```

### Caching Strategy
```
Static Pages (24h cache):
- About, Contact, Privacy, etc.

Product Pages (6h cache, 24h stale):
- Individual products
- Category/filter pages

Dynamic Pages (2h cache, 6h stale):
- Homepage (featured products)
- Blog index

Search Results (10min cache):
- Search API responses
- External book data

No Cache:
- Cart operations
- User account pages
- Admin interfaces
```

### Performance Optimizations
```
Image Handling:
- PayloadImage component with lazy loading
- Responsive images via Cloudinary
- WebP format with fallbacks

Bundle Splitting:
- Route-based code splitting
- Component lazy loading
- External lib chunking

SEO Optimization:
- JSON-LD structured data
- Meta tags per route
- Sitemap generation
- Robots.txt configuration
```

## Search Architecture

### Three-Tier Search System

1. **Client-Side (0-50ms)**
   ```
   FlexSearch index (12KB)
   - Pre-indexed book titles/authors
   - Instant autocomplete
   - Offline capable
   ```

2. **Server-Side (50-200ms)**
   ```
   PostgreSQL Full-Text Search
   - Multi-collection search
   - Advanced filtering
   - Faceted search results
   ```

3. **External APIs (500ms-3s)**
   ```
   ISBNdb + Google Books
   - ISBN lookup
   - Book discovery
   - Quote request system
   ```

## Deployment Architecture

### Backend (alkebu-load)
```
Hostinger VPS:
├── Docker container (Payload CMS)
├── PostgreSQL database
├── Nginx reverse proxy
├── SSL certificates (Let's Encrypt)
└── Backup scripts (daily)
```

### Frontend (alkebu-web)
```
Cloudflare Pages:
├── Git-based deployment
├── Edge caching globally
├── Custom domains
├── Analytics integration
└── A/B testing capability
```

### Cache Invalidation
```
Payload Webhooks → Cloudflare API:
- Product updates → Purge product pages
- Blog posts → Purge blog cache
- Global changes → Full cache clear
```

## Security Architecture

### Authentication Flow
```
Payload JWT:
1. User authenticates with Payload
2. Payload issues JWT token
3. Token stored in httpOnly cookie
4. hooks.server.ts validates on each request
5. Role-based permissions enforced
```

### Data Protection
```
- All API keys in environment variables
- HTTPS only (HSTS headers)
- Content Security Policy
- Rate limiting on APIs
- Input validation/sanitization
- JWT tokens in httpOnly cookies
```

## Monitoring & Analytics

### Application Monitoring
```
- Error tracking (Sentry)
- Performance monitoring
- Database query analysis
- API response times
```

### Business Analytics
```
- Search behavior tracking
- Product view metrics  
- Conversion funnel analysis
- Customer journey mapping
```

## Future Expansion Plans

### Phase 3 (Q1 2026)
```
NocoDB Integration:
- B2B sales pipeline tracking
- Event planning coordination
- Cross-business project management
- Customer relationship data
- Budget and resource tracking

n8n Workflow Automation:
- Inventory alert automation
- Email campaign triggers via Listmonk
- Square → Payload → Stripe workflows
- Social media scheduling
- Automated reporting
```

### Phase 4 (Q2 2026)
```
- Mobile app development
- Advanced personalization
- Loyalty program integration
- Multi-language support
```

### Phase 5 (Q3 2026)
```
- Marketplace functionality
- Author self-publishing portal
- Community features
- Advanced AI recommendations
```

## Development Workflow

### Local Development
```
1. Backend: cd alkebu-load && pnpm dev (localhost:3000)
2. Frontend: cd alkebu-web && npm run dev (localhost:5173)
3. Database: PostgreSQL or SQLite
4. Testing: Automated tests + manual QA
```

### Deployment Pipeline
```
1. Feature branch → Pull request
2. Automated tests + type checking
3. Staging deployment (preview)
4. Production deployment (main branch)
5. Cache invalidation + monitoring
```

This architecture provides a scalable, maintainable foundation for the Alkebulanimages 2.0 platform while maintaining flexibility for future growth and feature additions.
