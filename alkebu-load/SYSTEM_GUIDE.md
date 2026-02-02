# Alkebu Load - Complete System Guide

## Overview

This comprehensive PayloadCMS-based e-commerce and inventory management system serves as the backend for Alkebulanimages 2.0, a Nashville-based Black-owned bookstore. The system automatically syncs products from Square POS, enriches book data via APIs, manages customer relationships, processes payments through Stripe, and handles the complete e-commerce lifecycle from cart to fulfillment.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Core Collections](#core-collections)
- [E-Commerce System](#e-commerce-system)
- [Authentication & User Management](#authentication--user-management)
- [Payment Processing](#payment-processing)
- [Email Notification System](#email-notification-system)
- [Search & Discovery](#search--discovery)
- [Webhook System](#webhook-system)
- [Product Enrichment](#product-enrichment)
- [Relationship Management](#relationship-management)
- [Content Management](#content-management)
- [API Endpoints](#api-endpoints)
- [Scripts & Tools](#scripts--tools)
- [Configuration](#configuration)
- [Development Workflow](#development-workflow)
- [Production Deployment](#production-deployment)

## Architecture Overview

### Technology Stack
- **Backend**: PayloadCMS 3.43.0 with TypeScript
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **Payments**: Stripe Embedded Checkout
- **POS Integration**: Square (inventory sync only)
- **Email**: Resend SMTP with Nodemailer
- **Authentication**: Payload JWT with OAuth (Google/Facebook)
- **Search**: FlexSearch + PostgreSQL FTS + External APIs

### Data Flow Architecture
```
Square POS → Payload CMS (inventory sync via webhooks)
                ↓
    Products, Orders, Customers, Carts
                ↓
    Stripe (payment processing)
                ↓
    Email Notifications (order confirmations, abandoned carts)
                ↓
    SvelteKit Frontend (display layer)
```

### Multi-Repository Structure
```
alkebulanimages2.0/
├── alkebu-load/        # PayloadCMS backend (this system)
├── alkebu-web/         # SvelteKit frontend
└── alkebu-shared/      # Shared TypeScript types
```

## Core Collections

### 📚 Products Collections

#### Books Collection
**Location**: `/src/collections/Books.ts`

**Features**:
- Multi-edition support (ISBN-13, ISBN-10, different bindings)
- Auto-categorization and collection assignment
- Author/Publisher/Vendor relationships
- Square POS integration with inventory tracking
- External API enrichment (ISBNdb, Google Books, Open Library)
- SEO optimization with structured data

**Key Fields**:
- `title`, `titleLong` - Book titles
- `authors` - Relationship to Authors collection
- `publisher` - Relationship to Publishers collection
- `vendor` - Relationship to Vendors collection
- `editions[]` - Multiple ISBN/binding support
- `categories[]` - Auto-mapped categories from curated taxonomy
- `collections[]` - Curated collections (Civil Rights, Pan-Africanism, etc.)
- `pricing` - Retail, wholesale, member pricing
- `inventory` - Stock tracking with multi-location support
- `squareItemId` - Square POS sync identifier

#### Wellness & Lifestyle Collection
**Location**: `/src/collections/WellnessLifestyle.ts`

**Features**:
- Essential oils, incense, body care products
- Ingredient tracking and sourcing information
- Scent profiles and usage recommendations
- Certification tracking (organic, fair trade, etc.)
- Cultural and spiritual significance

#### Fashion & Jewelry Collection
**Location**: `/src/collections/FashionJewelry.ts`

**Features**:
- Clothing designs and jewelry pieces
- Multi-variant support (sizes, colors, styles)
- African-inspired and cultural designs
- Material and origin tracking

#### Oils & Incense Collection
**Location**: `/src/collections/OilsIncense.ts`

**Features**:
- Specialized collection for aromatherapy products
- Detailed scent profiles and ingredient lists
- Usage instructions and spiritual applications
- Bulk and retail sizing options

### 🛒 E-Commerce Collections

#### Carts Collection
**Location**: `/src/collections/Carts.ts`

**Features**:
- Guest and authenticated user cart support
- Session-based cart persistence
- Real-time tax and shipping calculation
- Abandoned cart detection and recovery
- Stripe checkout session integration

**Key Fields**:
- `user` - Relationship to Users (null for guest carts)
- `sessionId` - Session identifier for guest carts
- `status` - active, abandoned, converted, expired
- `items` - Relationship to CartItems
- `totalAmount`, `totalTax` - Calculated totals in cents
- `shippingAddress` - For tax calculation
- `abandonedEmailSent` - Recovery email tracking
- `stripeSessionId` - Stripe checkout session

#### Cart Items Collection
**Location**: `/src/collections/CartItems.ts`

**Features**:
- Line item management for carts
- Product variant selection
- Quantity and pricing calculations
- Customization options (gift wrap, messages)
- Availability tracking

**Key Fields**:
- `cart` - Relationship to Carts
- `product` - Polymorphic relationship to any product collection
- `productType` - Collection identifier (books, wellness-lifestyle, etc.)
- `quantity`, `unitPrice`, `totalPrice` - Pricing in cents
- `customization` - Gift options and special requests
- `availability` - Stock status at time of addition

#### Orders Collection
**Location**: `/src/collections/Orders.ts`

**Features**:
- Complete order lifecycle management
- Multi-source order consolidation (website, POS, phone)
- Stripe payment integration with webhook handling
- Fulfillment tracking and status updates
- Automatic stock management and restoration
- Customer and admin email notifications

**Key Fields**:
- `orderNumber` - Unique order identifier (ALK-TIMESTAMP-RANDOM)
- `customer` - Relationship to Customers or guest email
- `status` - Order lifecycle (pending, paid, processing, shipped, delivered)
- `items[]` - Order line items with product snapshots
- `payment` - Stripe payment details and status
- `fulfillment` - Shipping method, tracking, and dates
- `shippingAddress`, `billingAddress` - Customer addresses
- `source` - Order origin (website, square, phone, email, quote)
- `institutionalOrder` - B2B order handling

#### Customers Collection
**Location**: `/src/collections/Customers.ts`

**Features**:
- Extended user profiles for e-commerce
- Multiple shipping addresses with defaults
- Tax-exempt status for institutional accounts
- Order history and preferences
- Integration with Users collection

**Key Fields**:
- `user` - Relationship to Users collection
- `shippingAddresses[]` - Multiple saved addresses
- `taxExempt` - Tax-exempt status flag
- `institution` - Relationship to Institutional Accounts
- `preferences` - Shopping and communication preferences

### 👥 User Management Collections

#### Users Collection
**Location**: `/src/collections/Users.ts`

**Features**:
- PayloadCMS authentication system
- OAuth integration (Google, Facebook)
- Role-based access control (admin, customer, editor)
- Email verification tracking
- Customer profile extensions

**Key Fields**:
- `email` - Primary identifier
- `name` - Display name
- `role` - Access level (admin, customer, editor)
- `emailVerified` - Email verification status
- `oauthAccounts` - OAuth provider profiles
- `shippingAddresses[]` - Customer shipping addresses
- `taxExempt` - Tax-exempt status
- `institution` - B2B account relationship

#### Institutional Accounts Collection
**Location**: `/src/collections/InstitutionalAccounts.ts`

**Features**:
- B2B customer management
- Schools, nonprofits, churches, and libraries
- Tax-exempt status handling
- Purchase order workflows
- Custom pricing and terms

### 📝 Content Collections

#### Blog Posts Collection
**Location**: `/src/collections/BlogPosts.ts`

**Features**:
- Rich content with Lexical editor
- SEO optimization with meta tags
- Product relationships for cross-selling
- Comment system integration
- Publication workflow

#### Events Collection
**Location**: `/src/collections/Events.ts`

**Features**:
- Event management and calendar
- Registration system with capacity limits
- Recurring event support
- Venue and location tracking
- Integration with community calendar

#### Businesses Collection
**Location**: `/src/collections/Businesses.ts`

**Features**:
- Local business directory
- Category-based organization
- Reviews and ratings system
- Contact information and hours
- Map integration support

#### Comments Collection
**Location**: `/src/collections/Comments.ts`

**Features**:
- Universal commenting system
- Content moderation with auto-approval
- Spam filtering with Perspective API
- User reputation tracking
- Threaded comment support

### 🔗 Relationship Collections

#### Authors Collection
**Location**: `/src/collections/Authors.ts`

**Features**:
- Intelligent name parsing and matching
- Biography and personal details
- Social media integration
- Awards and recognition tracking
- Book count and genre analytics

#### Publishers Collection
**Location**: `/src/collections/Publishers.ts`

**Features**:
- Publishing house information
- Specialty and focus area tracking
- Notable authors and publications
- Book count analytics
- Contact and business information

#### Vendors Collection
**Location**: `/src/collections/Vendors.ts`

**Features**:
- Supplier and distributor management
- Business terms and contact information
- Performance metrics and ratings
- Product category analysis
- Cross-collection product counting

### 📊 Analytics Collections

#### Search Analytics Collection
**Location**: `/src/collections/SearchAnalytics.ts`

**Features**:
- Search query tracking and analysis
- Click-through rate monitoring
- Popular search terms identification
- Conversion tracking from search to purchase
- A/B testing support for search improvements

#### Book Quotes Collection
**Location**: `/src/collections/BookQuotes.ts`

**Features**:
- External book quote request management
- Customer quote history and follow-up
- Integration with external book APIs
- Automated quote-to-order conversion tracking

## E-Commerce System

### Cart Management
**Location**: `/src/app/utils/cartOperations.ts`

**Key Features**:
- **High Performance**: Local API operations <50ms response time
- **Session Support**: Guest carts with session persistence
- **Real-time Calculations**: Tax and shipping updates on address change
- **Inventory Checking**: Stock validation with backorder support
- **Guest-to-User Transfer**: Seamless cart migration on login

**Core Functions**:
```typescript
addToCart(payload, cartId, item, sessionId)      // Add item with stock check
removeFromCart(payload, cartId, cartItemId)     // Remove item
updateCartItemQuantity(payload, cartId, itemId, qty)  // Update quantity
getCartSummary(payload, cartId)                 // Get cart with totals
findOrCreateCart(payload, userId?, sessionId?)  // Cart initialization
transferGuestCartToUser(payload, sessionId, userId)   // Login migration
```

### Tennessee Tax Calculation
**Location**: `/src/app/utils/stripeHelpers.ts`

**Tax Structure**:
- **State Tax**: 7% (Tennessee state sales tax)
- **Local Tax**: Variable by city
  - Nashville: 2.5%
  - Memphis: 2.75%
  - Knoxville: 2.25%
  - Chattanooga: 2.75%
  - Default: 2.5%

**Tax Exemption Support**:
- Institutional accounts (schools, nonprofits, churches)
- Manual tax-exempt flag per customer
- Automatic exemption application in checkout

### Shipping Calculation
**Location**: `/src/app/utils/stripeHelpers.ts`

**Shipping Methods**:
- **Standard**: $5.99 base + $1.99/lb (3-7 days)
- **Expedited**: $12.99 base + $3.99/lb (1-3 days)
- **Local Pickup**: Free for Tennessee customers
- **Store Pickup**: Free, in-store collection

**Weight-Based Pricing**:
- Books: Average 8oz per item
- Products: Configurable weight per item
- Automatic weight calculation per cart

## Authentication & User Management

### Payload-Only Authentication
**Authentication is handled entirely by Payload CMS**

**Supported Methods**:
- **Email/Password**: Payload's native authentication
- **OAuth (Future)**: Google/Facebook integration will be implemented in Payload backend
- **JWT Tokens**: Payload-issued tokens for session management

**Authentication Flow**:
1. User logs in via Payload API (`/api/users/login`)
2. Payload validates credentials and returns JWT token
3. Frontend stores JWT in httpOnly cookie
4. SvelteKit validates JWT on each request via hooks.server.ts
5. User data available in `event.locals.user`

**OAuth Integration (Future Phase)**:
- OAuth providers will be configured in Payload backend
- Custom Payload endpoints handle OAuth flow
- Returns Payload JWT to frontend
- No external auth libraries needed

### Session Management
**Configuration**:
- JWT-based sessions issued by Payload (30-day expiration)
- Tokens stored in httpOnly cookies
- Validation via Payload API (`/api/users/me`)
- Guest cart preservation through login

## Payment Processing

### Stripe Embedded Checkout
**Location**: `/src/app/utils/stripeHelpers.ts`

**Checkout Features**:
- **No Redirects**: Embedded checkout experience
- **Tax Calculation**: Automatic Tennessee tax application
- **Multiple Payment Methods**: Card, Apple Pay, Google Pay
- **Address Collection**: Shipping and billing addresses
- **Custom Fields**: Special instructions and notes

**Session Creation Process**:
1. Cart validation and item verification
2. Tax calculation based on shipping address
3. Shipping cost calculation by weight and method
4. Stripe session creation with line items
5. Session ID storage in cart for webhook lookup

### Webhook Processing
**Location**: `/src/app/api/stripe-webhook/route.ts`

**Webhook Events**:
- `checkout.session.completed` → Order creation
- `payment_intent.succeeded` → Payment confirmation
- `payment_intent.payment_failed` → Payment failure handling

**Order Creation Flow**:
1. Webhook signature verification
2. Cart lookup by Stripe session ID
3. Order record creation with payment details
4. Cart status update to "converted"
5. Stock level updates for purchased items
6. Order confirmation email dispatch

### Payment Security
- **PCI Compliance**: No card data stored (Stripe handles all PCI)
- **Webhook Security**: Signature verification for all webhooks
- **Secure Configuration**: Environment-based API key management

## Email Notification System

### Resend SMTP Integration
**Location**: `/src/app/utils/emailService.ts`

**Email Service Features**:
- **Professional Templates**: HTML and plain text versions
- **Transactional Email**: Order confirmations and updates
- **Marketing Email**: Abandoned cart recovery
- **Template System**: Reusable email templates with dynamic content
- **SMTP Reliability**: Resend service for high deliverability

**Email Types**:

#### Order Confirmation
- **Trigger**: Successful payment webhook
- **Content**: Order details, item breakdown, shipping info, tracking
- **Template**: Professional receipt format with company branding

#### Order Status Updates
- **Triggers**: Order status changes (processing, shipped, delivered)
- **Content**: Status update, tracking numbers, delivery estimates
- **Template**: Clean status notification with tracking links

#### Abandoned Cart Recovery
- **Trigger**: Cart inactive >1 hour with items
- **Content**: Cart contents, recovery link, urgency messaging
- **Template**: Persuasive recovery email with direct checkout link

### Email Configuration
**Environment Variables**:
```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASSWORD=re_4WuQbiy1_L6aUDzuAYhigDhYED6THVyvM
FROM_EMAIL=updates@alkebulanimages.com
FROM_NAME=Alkebu-Lan Images
```

### Abandoned Cart Recovery System
**Location**: `/src/app/utils/cartOperations.ts`

**Recovery Process**:
1. **Detection**: Cron job finds carts inactive >1 hour
2. **Email Generation**: Dynamic cart content with recovery URL
3. **Email Dispatch**: Professional recovery email with urgency
4. **Link Tracking**: Recovery URL with cart ID for reactivation
5. **Cleanup**: Old abandoned carts removed after 30 days

**Recovery Email Features**:
- Cart contents with product images and pricing
- One-click recovery URL returning to checkout
- Personalization with customer name (if available)
- Mobile-optimized responsive templates

## Search & Discovery

### Three-Tier Search System
**Location**: `/src/app/utils/searchEngine.ts`

#### Tier 1: Client-Side FlexSearch (0-50ms)
- Pre-indexed product catalog
- Instant search as you type
- Typo tolerance (2 character difference)
- Phonetic matching for names
- Field boosting: Title/Author (3x) > ISBN/Tags (2x) > Description (1x)

#### Tier 2: Server Database Search (50-200ms)
- PostgreSQL Full-Text Search
- Complex filtering (price, availability, location)
- Cross-collection search (products, articles, events, businesses)
- Advanced query operators

#### Tier 3: External API Search (500ms-3s)
- Triggered when no internal results found
- Parallel API calls to ISBNdb, Google Books, Open Library
- Automatic product creation from external data
- Quote request system for unavailable books

### External Book APIs
**Location**: `/src/app/utils/externalBookAPI.ts`

**API Priority**:
1. **ISBNdb** - Primary source ($10-25/month, most comprehensive)
2. **Google Books** - Free fallback with good coverage
3. **Open Library** - Free comprehensive backup

**Integration Features**:
- ISBN-based lookup with 10/13 digit support
- Automatic product creation from API data
- Image URL extraction and storage
- Author/Publisher relationship creation
- Category mapping to internal taxonomy

### Quote Request System
**Location**: `/src/app/utils/quoteRequestSystem.ts`

**Workflow**:
1. Customer searches for unavailable book
2. External APIs confirm book exists
3. One-click quote request with book details
4. Staff notification for quote preparation
5. Customer follow-up within 24-72 hours
6. Quote-to-order conversion tracking

## Webhook System

### Square Catalog Webhook
**Location**: `/src/app/api/webhooks/square-catalog/route.ts`

**Comprehensive Product Processing**:
1. **Product Detection** - Automatically determines collection based on category/SKU
2. **Book Enrichment** - ISBN lookup with external API enrichment
3. **Author Processing** - Intelligent name matching and relationship creation
4. **Publisher Management** - Publisher extraction and relationship creation
5. **Vendor Assignment** - Vendor field extraction and vendor record creation
6. **Image Processing** - Image URL extraction and storage
7. **Inventory Sync** - Stock level and location synchronization
8. **Metadata Updates** - Relationship statistics and book counts

**Webhook Security**:
- Signature verification for Square webhooks
- Request validation and error handling
- Idempotent processing to prevent duplicate records

### Stripe Webhook Integration
**Location**: `/src/app/api/stripe-webhook/route.ts`

**Payment Event Processing**:
- Signature verification with webhook secret
- Event type routing and processing
- Order creation from successful payments
- Email notification triggering
- Error handling and retry logic

## Product Enrichment

### Book Enrichment System
**Location**: `/src/app/utils/productEnrichment.ts`

**Enrichment Process**:
1. **ISBN Detection**: Extract ISBN from Square SKU/UPC field
2. **API Lookup**: Query ISBNdb, Google Books, Open Library in priority order
3. **Data Extraction**: Title, authors, publisher, description, categories, images
4. **Relationship Creation**: Author and publisher records with intelligent matching
5. **Category Mapping**: External categories mapped to internal taxonomy
6. **Image Processing**: Cover image URL extraction and storage

**Data Quality**:
- Multiple API fallbacks for comprehensive coverage
- Data validation and cleanup
- Duplicate detection and merging
- Manual review flags for low-confidence matches

### Auto-Categorization
**Mapping System**: External API categories mapped to curated internal taxonomy

**Internal Categories**:
- African American Fiction/Non-Fiction
- Civil Rights & Social Justice
- Pan-Africanism & Black Nationalism
- Spirituality & Religion
- Business & Economics
- Arts & Culture
- Children & Young Adult

## Content Management

### Blog System
**Location**: `/src/collections/BlogPosts.ts`

**Features**:
- Rich text editing with Lexical editor
- SEO optimization with meta tags and structured data
- Product relationship for cross-selling
- Category and tag system
- Publication workflow with draft/published states

### Events Management
**Location**: `/src/collections/Events.ts`

**Event Features**:
- Event creation and management
- Registration system with capacity limits
- Recurring event support (daily, weekly, monthly)
- Venue and location tracking
- Calendar integration and RSVP management

### Business Directory
**Location**: `/src/collections/Businesses.ts`

**Directory Features**:
- Local business listing and categorization
- Review and rating system
- Contact information and business hours
- Map integration for location services
- Featured business highlighting

## API Endpoints

### Collection REST APIs
All collections automatically expose REST endpoints:
```
GET    /api/{collection}           # List with pagination/filtering
GET    /api/{collection}/{id}     # Get single record
POST   /api/{collection}          # Create new record
PATCH  /api/{collection}/{id}     # Update record
DELETE /api/{collection}/{id}     # Delete record
```

### GraphQL API
**Endpoint**: `/api/graphql`
- Single endpoint for all collections
- Relationship querying and nested data
- Real-time subscriptions for live data

### Custom E-Commerce APIs

#### Cart Operations
```
POST   /api/cart/add              # Add item to cart
POST   /api/cart/update           # Update cart item
DELETE /api/cart/remove           # Remove cart item
GET    /api/cart/summary          # Get cart totals
```

#### Checkout Process
```
POST   /api/checkout              # Create Stripe checkout session
GET    /api/checkout?session_id   # Check checkout status
POST   /api/stripe-webhook        # Stripe payment webhooks
```

#### Search & Discovery
```
GET    /api/search?q={query}      # General search across content
POST   /api/search                # Advanced search with filters
GET    /api/external-books?q=     # External book API search
POST   /api/quote-request         # Request quote for external book
```

#### Abandoned Cart Recovery
```
GET    /api/cart-recovery?cart_id # Recover abandoned cart
POST   /api/cart-recovery         # Update cart email for recovery
```

### Webhook Endpoints
```
POST   /api/webhooks/square-catalog    # Square inventory sync
POST   /api/stripe-webhook             # Stripe payment events
```

## Scripts & Tools

### E-Commerce Scripts

#### Checkout Flow Test
**Location**: `/scripts/test-checkout-flow.ts`
**Purpose**: Comprehensive e-commerce system testing

**Test Coverage**:
- Email service connectivity
- Cart operations and tax calculations
- Order creation workflow
- Abandoned cart detection
- Database operations and cleanup

**Usage**:
```bash
tsx scripts/test-checkout-flow.ts
```

#### Abandoned Cart Recovery
**Location**: `/scripts/abandoned-cart-recovery.ts`
**Purpose**: Automated abandoned cart processing

**Functionality**:
- Find carts abandoned >1 hour
- Send recovery emails with cart contents
- Clean up old abandoned carts (30 days)
- Track email delivery success/failure

**Cron Setup**:
```bash
# Run every 30 minutes
*/30 * * * * cd /path/to/alkebu-load && tsx scripts/abandoned-cart-recovery.ts
```

### Product Management Scripts

#### Book Import
**Location**: `/scripts/import-books.ts`
**Purpose**: Bulk import books with enrichment

**Features**:
- CSV file import with validation
- Automatic ISBN enrichment
- Author/Publisher relationship creation
- Category mapping and assignment
- Batch processing with error handling

#### Square Integration Test
**Location**: `/scripts/square-integration.ts`
**Purpose**: Test and debug Square API integration

**Testing**:
- API connectivity and authentication
- Catalog item retrieval and processing
- Webhook signature validation
- Vendor field extraction testing

### Data Management Scripts

#### Author Migration
**Location**: `/scripts/migrate-authors.ts`
**Purpose**: Convert books to use Authors collection relationships

#### Search Initialization
**Location**: `/scripts/initialize-search.ts`
**Purpose**: Initialize search indices and sample data

**Options**:
```bash
tsx scripts/initialize-search.ts            # Initialize indices
tsx scripts/initialize-search.ts --sample-data  # Add sample content
```

#### Vendor Analysis
**Location**: `/scripts/configure-vendor-mappings.ts`
**Purpose**: Analyze Square catalog for vendor field usage

## Configuration

### Environment Variables
**Location**: `.env`

**Complete Configuration**:
```env
# Database Configuration
DATABASE_URI=file:./alkebulanimages.db
# DATABASE_URI=postgresql://user:password@localhost:5432/alkebulanimages

# PayloadCMS
PAYLOAD_SECRET=your-32-character-secret-key
PAYLOAD_PUBLIC_SERVER_URL=http://localhost:3000

# Square POS Integration (Inventory Sync Only)
SQUARE_APPLICATION_ID=sq0idp-your-app-id
SQUARE_ACCESS_TOKEN=your-square-access-token
SQUARE_ENVIRONMENT=production

# Stripe Payment Processing
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# External Book APIs
ISBNDB_API_KEY=your-isbndb-api-key
GOOGLE_BOOKS_API_KEY=your-google-books-api-key

# Email Configuration (Transactional)
RESEND_API_KEY=re_your_resend_api_key
FROM_EMAIL=updates@alkebulanimages.com
FROM_NAME=Alkebu-Lan Images
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASSWORD=your-resend-smtp-password

# Tax Configuration
TENNESSEE_STATE_TAX_RATE=0.07
NASHVILLE_LOCAL_TAX_RATE=0.025
DEFAULT_LOCAL_TAX_RATE=0.025

# OAuth Configuration (Future Phase - will be implemented in Payload)
# GOOGLE_CLIENT_ID=your-google-client-id
# GOOGLE_CLIENT_SECRET=your-google-client-secret
# FACEBOOK_APP_ID=your-facebook-app-id
# FACEBOOK_APP_SECRET=your-facebook-app-secret

# Development
NODE_ENV=development
```

### Database Configuration
- **Development**: SQLite (`alkebulanimages.db`)
- **Production**: PostgreSQL with connection pooling
- **Collections**: Auto-generated tables with relationships
- **Migrations**: Handled automatically by PayloadCMS

### Package Manager
- **Required**: pnpm (specified in engines)
- **Node Version**: ^18.20.2 || >=20.9.0
- **TypeScript**: ES Modules with strict configuration

## Development Workflow

### 1. Local Development Setup

**Initial Setup**:
```bash
cd alkebu-load
pnpm install
cp .env.example .env
# Configure environment variables
pnpm dev
```

**Database Initialization**:
- PayloadCMS creates database automatically
- First run: create admin user at `/admin`
- Initialize search: `tsx scripts/initialize-search.ts`

### 2. E-Commerce Development

**Cart Testing**:
1. Create test products in PayloadCMS admin
2. Test cart operations via API endpoints
3. Verify tax calculations for Tennessee addresses
4. Test guest cart to user migration

**Payment Testing**:
1. Use Stripe test mode with test cards
2. Configure webhook endpoints in Stripe dashboard
3. Test successful payment flow
4. Verify order creation and email notifications

**Email Testing**:
1. Configure Resend SMTP credentials
2. Test email connectivity: `tsx scripts/test-checkout-flow.ts`
3. Verify template rendering and delivery
4. Test abandoned cart email flow

### 3. Product Management

**Adding Books**:
1. Import via Square POS (recommended)
2. Set ISBN in SKU/UPC field
3. Configure vendor field
4. Webhook automatically enriches book data

**Manual Product Entry**:
1. Use PayloadCMS admin interface
2. Select appropriate collection (Books, WellnessLifestyle, etc.)
3. Fill required fields
4. Upload images and set pricing

### 4. Content Management

**Blog Posts**:
1. Create posts in PayloadCMS admin
2. Use Lexical rich text editor
3. Link to related products
4. Configure SEO metadata

**Events**:
1. Create events with venue details
2. Set capacity limits and registration
3. Configure recurring event schedules
4. Integrate with calendar system

### 5. Testing & Quality Assurance

**Run Test Suite**:
```bash
# Comprehensive e-commerce test
tsx scripts/test-checkout-flow.ts

# Test abandoned cart recovery
tsx scripts/abandoned-cart-recovery.ts

# Test Square integration
tsx scripts/square-integration.ts
```

**Manual Testing Checklist**:
- [ ] User registration and OAuth login
- [ ] Add items to cart (guest and authenticated)
- [ ] Tax calculation accuracy
- [ ] Checkout flow completion
- [ ] Order confirmation emails
- [ ] Abandoned cart recovery
- [ ] Admin order management
- [ ] Search functionality

## Production Deployment

### 1. Infrastructure Setup

**Server Requirements**:
- Node.js 18+ with pnpm
- PostgreSQL 14+ database
- SSL certificate for HTTPS
- Domain configuration for webhooks

**Hostinger VPS KVM 4 Configuration**:
```yaml
Resources:
  - PayloadCMS: 2GB RAM
  - PostgreSQL: 1GB RAM
  - Redis Cache: 512MB RAM
  - Email Service: 256MB RAM

Services:
  - Coolify: Container orchestration
  - Uptime Kuma: Monitoring
  - Plausible: Analytics
  - Automated backups to Cloudflare R2
```

### 2. Environment Configuration

**Production Environment**:
```env
NODE_ENV=production
DATABASE_URI=postgresql://user:password@host:5432/db
PAYLOAD_SECRET=production-secret-32-characters
PAYLOAD_PUBLIC_SERVER_URL=https://yourdomain.com

# Use live Stripe keys
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# Configure OAuth providers (Future Phase)
# GOOGLE_CLIENT_ID=production-google-id
# FACEBOOK_APP_ID=production-facebook-id
```

### 3. Database Migration

**PostgreSQL Setup**:
```sql
CREATE DATABASE alkebulanimages_prod;
CREATE USER alkebu_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE alkebulanimages_prod TO alkebu_user;
```

**Migration Process**:
1. Update `DATABASE_URI` to PostgreSQL connection
2. Run PayloadCMS migration: `pnpm payload migrate`
3. Import existing data if migrating from SQLite
4. Verify all collections and relationships

### 4. Payment Configuration

**Stripe Live Mode**:
1. Switch to live Stripe API keys
2. Configure production webhook endpoints
3. Update webhook secrets
4. Test with real payment methods
5. Configure tax settings for Tennessee

**Square Integration**:
1. Use production Square credentials
2. Configure webhook URLs for production domain
3. Test inventory synchronization
4. Verify product enrichment workflow

### 5. Email Configuration

**Resend Production**:
1. Configure production domain
2. Set up SPF, DKIM, and DMARC records
3. Verify email deliverability
4. Test all email templates

### 6. Monitoring & Maintenance

**Automated Tasks**:
```bash
# Cron job for abandoned cart recovery
*/30 * * * * /usr/bin/tsx /path/to/scripts/abandoned-cart-recovery.ts

# Daily cleanup and maintenance
0 2 * * * /usr/bin/tsx /path/to/scripts/daily-maintenance.ts

# Weekly analytics and reporting
0 9 * * 1 /usr/bin/tsx /path/to/scripts/weekly-report.ts
```

**Monitoring Setup**:
- Uptime monitoring for all endpoints
- Error tracking and alerting
- Performance monitoring for API response times
- Database performance and connection monitoring

### 7. Backup Strategy

**Automated Backups**:
- Daily PostgreSQL dumps to Cloudflare R2
- Media file backups to cloud storage
- Configuration file versioning
- Database transaction log shipping

### 8. Security Hardening

**Security Configuration**:
- SSL/TLS encryption for all connections
- API rate limiting and DDoS protection
- Input validation and sanitization
- Regular security updates and patches
- Environment variable encryption at rest

## Current System Status

### ✅ Completed Features (Phase 1 & 2)
- **Product Management**: Complete inventory system with Square sync
- **E-Commerce Core**: Cart, checkout, and order management
- **Payment Processing**: Stripe embedded checkout integration
- **Email System**: Transactional and marketing email automation
- **Authentication**: OAuth and session management
- **Search System**: Multi-tier search with external API integration
- **Content Management**: Blog, events, and business directory
- **Tax Compliance**: Tennessee tax calculation and exemptions
- **Abandoned Cart Recovery**: Automated email marketing system

### 🚧 In Progress (Phase 3)
- SvelteKit frontend development
- Mobile-responsive design implementation
- Customer-facing e-commerce interface
- Advanced search UI with filters
- Product catalog browsing and discovery

### 📋 Future Enhancements
- Advanced analytics and reporting dashboard
- Inventory management with reorder alerts
- Customer loyalty program integration
- Multi-language support for international customers
- Advanced product recommendations
- Bulk order management for institutional accounts
- Integration with additional payment methods
- Mobile app development

## Troubleshooting

### Common Issues

#### E-Commerce Issues
1. **Orders not creating from Stripe**:
   - Verify webhook endpoint configuration
   - Check Stripe webhook secret
   - Review webhook processing logs
   - Ensure cart exists with correct session ID

2. **Tax calculation errors**:
   - Verify Tennessee tax rates in environment
   - Check shipping address format
   - Confirm tax-exempt status for institutional accounts
   - Review tax calculation logic in stripeHelpers.ts

3. **Email delivery failures**:
   - Test SMTP connection with testEmailConnection()
   - Verify Resend API credentials
   - Check email template rendering
   - Review spam filter and deliverability

#### Payment Issues
1. **Stripe checkout failures**:
   - Verify API key configuration (test vs. live)
   - Check webhook endpoint accessibility
   - Review cart validation logic
   - Confirm product pricing format (cents)

2. **Cart persistence issues**:
   - Check session ID generation
   - Verify Local API performance
   - Review cart cleanup scripts
   - Confirm database connection stability

#### Product Management Issues
1. **Square sync failures**:
   - Verify webhook signature validation
   - Check Square API permissions
   - Review vendor field configuration
   - Confirm product detection logic

2. **Book enrichment failures**:
   - Check external API keys (ISBNdb, Google Books)
   - Verify ISBN format (13 digits preferred)
   - Review API rate limiting
   - Confirm author/publisher matching logic

### Debug Tools

**Logging and Monitoring**:
- PayloadCMS admin interface for data inspection
- Webhook processing logs in console
- Stripe dashboard for payment monitoring
- Email delivery logs from Resend

**Development Scripts**:
- `tsx scripts/test-checkout-flow.ts` - Comprehensive system test
- `tsx scripts/square-integration.ts` - Square API debugging
- `tsx scripts/abandoned-cart-recovery.ts` - Cart recovery testing

### Support Resources

**Documentation**:
- PayloadCMS documentation for collection management
- Stripe documentation for payment processing
- Square API documentation for POS integration
- Resend documentation for email configuration

---

*This comprehensive system guide covers all aspects of the Alkebulanimages 2.0 backend system. The PayloadCMS-based architecture provides a robust foundation for e-commerce, content management, and customer relationship management, with extensive automation and integration capabilities.*