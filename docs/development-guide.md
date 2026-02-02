# Alkebulanimages 2.0 - Development Guide

## Project Overview

Alkebulanimages 2.0 is a modern e-commerce platform for a Nashville-based Black-owned bookstore, built with Payload CMS backend and SvelteKit frontend.

### Architecture
- **Backend**: Payload CMS 3.54.0 with integrated e-commerce (`alkebu-load/`)
- **Frontend**: SvelteKit with Svelte 5 (`alkebu-web/`)
- **Future**: Shared types library (`alkebu-shared/`)

## TL;DR - Quick Start Checklist

For experienced developers who want to get running immediately:
```bash
# 1. Backend first (REQUIRED)
cd alkebu-load
pnpm install
cp .env.example .env  # Edit PAYLOAD_SECRET if needed
pnpm dev  # Runs on :3000

# 2. Create admin user: Visit http://localhost:3000/admin (one-time)

# 3. Frontend second
cd ../alkebu-web
npm install  
cp .env.example .env.local  # Pre-configured for local dev
npm run dev  # Runs on :5173

# Visit http://localhost:5173
```

---

## Quick Start - Complete Local Development Setup

### Prerequisites
- **Node.js 18+** (recommended: use fnm or nvm for version management)
- **Git** (for cloning and version control)
- **Terminal/Command Line** (bash, zsh, or similar)

**Note**: No database setup required for local development - SQLite is used automatically.

### Step-by-Step Local Development Setup

#### 1. Clone and Navigate to Project

```bash
# Clone the repository (if not already done)
git clone <repository-url>
cd alkebulanimages2.0
```

#### 2. Backend Setup (alkebu-load) - REQUIRED FIRST

```bash
# Navigate to backend directory
cd alkebu-load

# Install dependencies (MUST use pnpm - required by engines config)
pnpm install

# Set up environment for local development
cp .env.example .env

# Edit .env file - Minimal required changes for local dev:
# DATABASE_URI=file:./alkebulanimages.db (already set correctly)
# PAYLOAD_SECRET=your-secret-key-here-32-characters-minimum (change this)

# Optional: Add your own API keys for enhanced features
# ISBNDB_API_KEY=your-isbndb-api-key (for book search)
# GOOGLE_BOOKS_API_KEY=your-google-books-api-key (for book data)

# Start development server
pnpm dev
# ✅ Backend now running on http://localhost:3000
# ✅ Admin panel available at http://localhost:3000/admin
```

**Important**: The backend MUST be running before starting the frontend.

#### 3. Create First Admin User (One-time setup)

```bash
# With backend running, open browser to:
# http://localhost:3000/admin

# Follow the setup wizard to create your first admin user
# This is required before the frontend can connect properly
```

#### 4. Frontend Setup (alkebu-web) - START AFTER BACKEND

```bash
# Open NEW terminal window/tab
cd alkebu-web

# Install dependencies  
npm install

# Set up environment for local development
cp .env.example .env.local

# The .env.local file is already configured for local development:
# - PAYLOAD_API_URL=http://localhost:3000
# - PUBLIC_SITE_URL=http://localhost:5173
# No changes needed for basic local development

# Start development server
npm run dev  
# ✅ Frontend now running on http://localhost:5173
```

#### 5. Initialize Sample Data (Optional but Recommended)

```bash
# In the alkebu-load directory, with backend running:
cd alkebu-load

# Initialize search system with sample data
tsx scripts/initialize-search.ts --sample-data

# This creates sample books, categories, and search indices for testing
```

### Local Development URLs

- **Frontend**: http://localhost:5173 (main website)
- **Backend API**: http://localhost:3000/api (REST & GraphQL endpoints)  
- **Admin Panel**: http://localhost:3000/admin (content management)

### Verification Steps

✅ **Backend Working**: Visit http://localhost:3000/admin and see login screen  
✅ **Frontend Working**: Visit http://localhost:5173 and see homepage  
✅ **API Connection**: Frontend should load without console errors  
✅ **Database**: SQLite file `alkebulanimages.db` created in alkebu-load directory

### Common Issues & Solutions

**Backend won't start**:
```bash
# Check if port 3000 is already in use
lsof -i :3000
# Kill any processes using port 3000 if needed
kill -9 <process-id>

# Ensure you're using pnpm (not npm)
pnpm --version  # Should show pnpm version

# Check PAYLOAD_SECRET is set in .env
grep PAYLOAD_SECRET alkebu-load/.env
```

**Frontend won't start**:
```bash
# Ensure backend is running first at localhost:3000
curl http://localhost:3000/api/health || echo "Backend not running"

# Check .env.local exists and has correct URLs
cat alkebu-web/.env.local

# Clear SvelteKit cache if needed
rm -rf alkebu-web/.svelte-kit
```

**Frontend loads but shows errors**:
```bash
# Check browser console for API connection errors
# Most common: PAYLOAD_API_URL not pointing to running backend

# Verify backend API is accessible
curl http://localhost:3000/api/globals/settings

# Check if admin user was created
# Visit http://localhost:3000/admin - should show login, not setup
```

### Advanced Local Setup

#### With External APIs (Enhanced Features)

```bash
# In alkebu-load/.env, add your API keys:
ISBNDB_API_KEY=your-isbndb-api-key
GOOGLE_BOOKS_API_KEY=your-google-books-api-key

# Restart backend after adding API keys
pnpm dev
```

#### With OAuth Authentication (Optional)

```bash  
# In alkebu-web/.env.local, add OAuth credentials:
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FACEBOOK_APP_ID=your-facebook-app-id  
FACEBOOK_APP_SECRET=your-facebook-app-secret

# Restart frontend
npm run dev
```

### Docker Setup (Alternative to Manual Setup)

```bash
# From project root - starts both services together
docker-compose up

# Services will be available at same URLs:
# Frontend: http://localhost:5173
# Backend: http://localhost:3000
```

## Environment Configuration

### Backend (.env in alkebu-load/)
```bash
# Database
DATABASE_URI=sqlite:./dev.db  # Development
DATABASE_URI=postgresql://user:pass@host:port/db  # Production

# Security
PAYLOAD_SECRET=your-32-char-secret
PAYLOAD_PUBLIC_SERVER_URL=http://localhost:3000

# Square POS Integration (optional)
SQUARE_ACCESS_TOKEN=your-square-token
SQUARE_APPLICATION_ID=your-app-id
SQUARE_ENVIRONMENT=sandbox  # or production

# Stripe Payments
STRIPE_SECRET_KEY=sk_test_your-stripe-key
STRIPE_WEBHOOK_ENDPOINT_SECRET=whsec_your-webhook-secret
STRIPE_PUBLIC_KEY=pk_test_your-public-key

# External Book APIs (optional)
ISBNDB_API_KEY=your-isbndb-key
GOOGLE_BOOKS_API_KEY=your-google-books-key

# Email (Resend)
RESEND_API_KEY=re_your-resend-key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# File Storage (Cloudinary)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### Frontend (.env in alkebu-web/)
```bash
# Payload API Configuration
PUBLIC_PAYLOAD_URL=http://localhost:3000
PAYLOAD_API_KEY=your-api-key

# Site Configuration
PUBLIC_SITE_URL=http://localhost:5173
PUBLIC_SITE_NAME=Alkebulan Images

# OAuth Providers (configured in Payload backend, not frontend)
# OAuth is handled entirely by Payload - no frontend env vars needed

# Cloudflare Configuration (production)
CF_API_TOKEN=your-cloudflare-token
CF_ZONE_ID=your-zone-id
```

## Development Commands

### Backend (alkebu-load)
```bash
# Development
pnpm dev              # Start dev server with hot reload
pnpm devsafe          # Clean restart (removes .next directory)

# Building
pnpm build            # Build for production
pnpm start            # Start production server

# Code Quality
pnpm lint             # Run ESLint
pnpm type-check       # TypeScript type checking

# Database & Types
pnpm generate:types   # Generate TypeScript types from collections
pnpm db:migrate       # Run database migrations
pnpm db:seed          # Seed development data

# Scripts (Development Tools)
tsx scripts/square-integration.ts    # Test Square API
tsx scripts/import-books.ts          # Import book data
tsx scripts/square-payload-sync.ts   # Sync Square inventory  
tsx scripts/initialize-search.ts     # Initialize search indices
tsx scripts/initialize-search.ts --sample-data  # Initialize with sample data
```

### Frontend (alkebu-web)
```bash
# Development
npm run dev           # Start dev server
npm run dev -- --host # Expose to network

# Building
npm run build         # Build for production
npm run preview       # Preview production build

# Code Quality
npm run check         # Svelte type checking
npm run check:watch   # Watch mode type checking
npm run lint          # Run ESLint
npm run format        # Format with Prettier

# Testing (if configured)
npm run test          # Run tests
npm run test:watch    # Watch mode tests
```

## Project Structure

```
alkebulanimages2.0/
├── alkebu-load/                 # Payload CMS Backend
│   ├── src/
│   │   ├── collections/         # Data models
│   │   ├── globals/            # Global settings
│   │   ├── app/                # Custom routes & utilities
│   │   │   ├── api/            # API endpoints
│   │   │   └── utils/          # Helper functions
│   │   ├── hooks/              # Payload hooks
│   │   ├── access/             # Access control
│   │   └── payload.config.ts   # Main configuration
│   ├── scripts/                # Utility scripts
│   └── SYSTEM_GUIDE.md         # Backend documentation
│
├── alkebu-web/                  # SvelteKit Frontend
│   ├── src/
│   │   ├── routes/             # App routes (file-based)
│   │   │   ├── shop/           # E-commerce pages
│   │   │   ├── blog/           # Content pages
│   │   │   └── (app)/          # Protected routes
│   │   ├── lib/
│   │   │   ├── components/     # Reusable components
│   │   │   ├── server/         # Server-only code
│   │   │   └── stores/         # Svelte stores
│   │   ├── app.html            # HTML template
│   │   └── hooks.server.ts     # Server hooks
│   ├── static/                 # Static assets
│   └── package.json
│
├── alkebu-shared/               # Shared TypeScript types (planned)
├── docs/                       # Project documentation
└── docker-compose.yml          # Multi-service setup
```

## Key Collections (Data Models)

### Product Collections
- **Books**: Main inventory with editions, authors, categories, tags
- **WellnessLifestyle**: Health & beauty products
- **FashionJewelry**: Apparel & accessories  
- **OilsIncense**: Scented products (split oils→health, incense→home)

### E-commerce Collections
- **Carts/CartItems**: Shopping cart with session/user tracking
- **Orders**: Stripe-integrated order management
- **Customers**: Extended user profiles with addresses

### Content Collections
- **BlogPosts**: Articles with product relationships
- **Events**: Author visits, workshops with registration
- **Businesses**: Local directory with reviews

### Global Singletons (Single Pages)
- **HomePage, AboutPage, ContactPage, ShopPage**: Migrated from Sanity
- **SiteSettings**: Site-wide configuration

### System Collections
- **Authors/Publishers/Vendors**: Relationship management
- **Categories/Tags**: Flexible taxonomy system
- **SearchAnalytics**: Search behavior tracking

## Authentication Implementation

### Payload-Only Authentication (Simplified)
- No Auth.js packages are used. All authentication is handled by Payload

**Login Flow**
```
// src/routes/login/+page.server.ts
export const actions = {
  default: async ({ request, cookies, fetch }) => {
    const data = await request.formData()
    const email = data.get('email')
    const password = data.get('password')
    
    const response = await fetch(`${PAYLOAD_API_URL}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    
    if (response.ok) {
      const { token, user } = await response.json()
      
      cookies.set('payload-token', token, {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30 // 30 days
      })
      
      return { success: true, user }
    }
    
    return { success: false, error: 'Invalid credentials' }
  }
}
```
**Auth Validation Hook**
```
// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit'

export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get('payload-token')
  
  if (token) {
    try {
      const response = await fetch(`${process.env.PAYLOAD_API_URL}/api/users/me`, {
        headers: { 
          'Authorization': `JWT ${token}` 
        }
      })
      
      if (response.ok) {
        event.locals.user = await response.json()
      } else {
        // Token invalid, clear it
        event.cookies.delete('payload-token', { path: '/' })
      }
    } catch (error) {
      console.error('Auth validation error:', error)
      event.cookies.delete('payload-token', { path: '/' })
    }
  }
  
  return resolve(event)
}
```
**Protected Routes**
```
// src/routes/(app)/account/+page.server.ts
import { redirect } from '@sveltejs/kit'

export async function load({ locals }) {
  if (!locals.user) {
    throw redirect(303, '/login')
  }
  
  return {
    user: locals.user
  }
}
```

## API Endpoints

### Payload REST API
```
# Products
GET /api/books?limit=20&page=1
GET /api/books/:slug
GET /api/wellness-lifestyle
GET /api/fashion-jewelry  
GET /api/oils-incense

# Content
GET /api/blog-posts
GET /api/blog-posts/:slug
GET /api/events
GET /api/businesses

# E-commerce
GET /api/carts/:id
POST /api/checkout
POST /api/stripe-webhook

# Search & Discovery
GET /api/search?q=query
GET /api/external-books?q=query
POST /api/quote-request

# Admin
GET /admin (Payload admin panel)
GET /api/graphql (GraphQL endpoint)
```

### Frontend Routes
```
# Public Pages
/ (homepage - SSR)
/shop/* (product catalog - SSR with caching)
/blog/* (content - SSR with caching)  
/search (client-side search)

# Product Filtering Routes
/shop/books/authors/:slug
/shop/books/genres/:slug
/shop/books/collections/:slug
/shop/books/tags/:slug
/shop/apparel/brands/:slug
/shop/health-and-beauty/types/:slug
/shop/home-goods/collections/:slug

# Protected Routes
/(app)/cart (client-only)
/(app)/account (client-only)
/(app)/orders (client-only)
```

## Development Workflow

### Local Development Setup
1. **Start Backend**: `cd alkebu-load && pnpm dev` (port 3000)
2. **Start Frontend**: `cd alkebu-web && npm run dev` (port 5173)  
3. **Access Admin**: http://localhost:3000/admin
4. **Access Frontend**: http://localhost:5173

### Feature Development
1. **Create Feature Branch**: `git checkout -b feature/your-feature`
2. **Backend Changes**: Update collections, add APIs in `alkebu-load/`
3. **Frontend Changes**: Update routes, components in `alkebu-web/`
4. **Test Locally**: Verify both services work together
5. **Commit & Push**: Follow conventional commit format
6. **Create Pull Request**: For code review

### Database Management
```bash
# Development (SQLite)
# Database file: alkebu-load/dev.db
# Backup: cp dev.db dev.db.backup

# Production (PostgreSQL)  
# Use database provider's backup tools
# Configure DATABASE_URI environment variable
```

## Testing Strategy

### Backend Testing
```bash
# Unit tests for utilities
npm run test:utils

# Integration tests for APIs
npm run test:api

# E2E tests for checkout flow
npm run test:e2e
```

### Frontend Testing
```bash
# Component tests
npm run test:components

# Page tests  
npm run test:pages

# E2E tests with Playwright
npm run test:e2e
```

## Deployment

### Backend (Hostinger VPS)
```bash
# Production build
pnpm build

# Docker deployment
docker build -t alkebu-load .
docker run -p 3000:3000 alkebu-load

# Environment setup
# Configure production .env
# Set up PostgreSQL database  
# Configure Nginx reverse proxy
```

### Frontend (Cloudflare Pages)
```bash
# Build command
npm run build

# Output directory  
build/

# Environment variables
# Set in Cloudflare dashboard
# Configure custom domain
```

### Cache Management
```bash
# Cloudflare cache purging
# Automatic via Payload webhooks
# Manual: Use Cloudflare API or dashboard
```

## Troubleshooting

### Local Development Issues

#### Most Common Problems

**❌ "Frontend shows blank page or errors"**
```bash
# 1. Check if backend is running first
curl http://localhost:3000 || echo "❌ Backend not running - start it first!"

# 2. Check browser console for errors
# Open DevTools → Console, look for API connection errors

# 3. Verify environment configuration  
cat alkebu-web/.env.local | grep PAYLOAD_API_URL
# Should show: PAYLOAD_API_URL=http://localhost:3000
```

**❌ "Backend admin shows setup wizard instead of login"**
```bash
# This means no admin user was created yet
# Visit http://localhost:3000/admin and follow setup wizard
# This is required for frontend API access
```

**❌ "Error: Cannot find module or Connection refused"**
```bash
# Backend dependency issues
cd alkebu-load
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm dev

# Frontend dependency issues
cd alkebu-web  
rm -rf node_modules package-lock.json
npm install
npm run dev
```

**❌ "Port 3000/5173 already in use"**
```bash
# Find and kill processes using the ports
lsof -i :3000  # Check what's using backend port
lsof -i :5173  # Check what's using frontend port

# Kill processes if needed
kill -9 <process-id>
```

#### Step-by-Step Debugging

**Backend Issues:**
```bash
# 1. Check if pnpm is installed
pnpm --version || npm install -g pnpm

# 2. Verify environment file exists
ls alkebu-load/.env || cp alkebu-load/.env.example alkebu-load/.env

# 3. Check PAYLOAD_SECRET is set (must be 32+ characters)
cd alkebu-load
grep "PAYLOAD_SECRET=" .env
# Should show: PAYLOAD_SECRET=your-secret-key-here-32-characters-minimum

# 4. Test backend starts without errors
pnpm dev
# Should show: "✓ Payload Admin Panel: http://localhost:3000/admin"
```

**Frontend Issues:**
```bash
# 1. Ensure .env.local exists with local URLs
ls alkebu-web/.env.local || cp alkebu-web/.env.example alkebu-web/.env.local

# 2. Verify backend connection
curl http://localhost:3000/api/globals || echo "Backend API not responding"

# 3. Clear SvelteKit cache
rm -rf alkebu-web/.svelte-kit

# 4. Check for TypeScript errors
cd alkebu-web
npm run check

# 5. Start with verbose output
npm run dev -- --verbose
```

#### Environment Configuration Issues

**Wrong URLs in Environment Files:**

❌ **Common Mistake**: Production URLs in local development
```bash
# alkebu-web/.env.local - WRONG for local dev:
PAYLOAD_API_URL=https://api.alkebulanimages.com  # ❌ Production URL
PUBLIC_SITE_URL=https://alkebulanimages.com      # ❌ Production URL

# CORRECT for local dev:
PAYLOAD_API_URL=http://localhost:3000  # ✅ Local backend
PUBLIC_SITE_URL=http://localhost:5173  # ✅ Local frontend
```

**Missing Required Environment Variables:**
```bash
# alkebu-load/.env - MUST have at minimum:
DATABASE_URI=file:./alkebulanimages.db  # ✅ SQLite for local dev
PAYLOAD_SECRET=your-32-character-secret-key-here  # ✅ Required

# alkebu-web/.env.local - MUST have:
PAYLOAD_API_URL=http://localhost:3000  # ✅ Points to local backend
PUBLIC_SITE_URL=http://localhost:5173  # ✅ Local frontend URL
```

### Production Issues

**Backend won't start**
- Check DATABASE_URI configuration
- Verify PostgreSQL/SQLite permissions  
- Check port 3000 availability
- Ensure all required environment variables are set

**Frontend build fails**  
- Check TypeScript errors: `npm run check`
- Verify Payload API connectivity
- Check environment variables
- Clear build cache: `rm -rf .svelte-kit build`

**Search not working**
- Initialize search indices: `tsx scripts/initialize-search.ts`
- Check external API keys (ISBNdb, Google Books)
- Verify PostgreSQL full-text search setup

**Images not loading**
- Check Cloudinary configuration
- Verify image upload permissions
- Check network connectivity
- Verify PayloadImage component implementation

### Automated Setup Verification

**🧪 Development Environment Test Script**

We provide an automated script to verify your setup:

```bash
# From project root directory
./dev-setup-test.sh

# This script checks:
# ✅ Node.js version (18+)
# ✅ pnpm availability
# ✅ Directory structure
# ✅ Environment file configuration
# ✅ Dependencies installation
# ✅ Port availability
# ✅ Required environment variables
```

### Quick Health Check Commands

```bash
# Backend health check
curl http://localhost:3000/api/globals || echo "❌ Backend API down"

# Frontend health check  
curl http://localhost:5173 || echo "❌ Frontend down"

# Database file exists (SQLite)
ls alkebu-load/alkebulanimages.db && echo "✅ Database exists" || echo "❌ No database file"

# Admin user created
curl http://localhost:3000/admin | grep -q "login" && echo "✅ Admin setup complete" || echo "❌ Need to create admin user"
```

### Getting Help

1. **Check browser console** for specific error messages
2. **Check terminal logs** for both backend and frontend
3. **Verify step-by-step setup** was followed in order
4. **Test with curl commands** to isolate API issues
5. **Clear all caches** and restart both services if needed

### Performance Optimization

**Backend**
- Enable database query logging
- Monitor slow queries
- Use database indexes appropriately
- Cache frequently accessed data

**Frontend**  
- Use route-based code splitting
- Optimize images with PayloadImage component
- Implement proper caching headers
- Monitor Core Web Vitals

## Contributing Guidelines

### Code Standards
- **TypeScript**: Strict mode enabled
- **Formatting**: Prettier with project config
- **Linting**: ESLint with Svelte/TypeScript rules
- **Commits**: Conventional commit format

### Pull Request Process
1. Create feature branch from `main`
2. Make changes with proper tests
3. Update documentation if needed
4. Run linting and type checking
5. Create PR with descriptive title
6. Address review feedback
7. Merge after approval

### File Naming Conventions
- **Components**: PascalCase (e.g., `BookCard.svelte`)
- **Utilities**: camelCase (e.g., `payloadHelpers.ts`)
- **Routes**: lowercase with hyphens (e.g., `health-and-beauty/`)
- **Collections**: PascalCase (e.g., `Books.ts`)

## Additional Resources

### Documentation
- [Payload CMS Documentation](https://payloadcms.com/docs)
- [SvelteKit Documentation](https://kit.svelte.dev/docs)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Stripe Documentation](https://stripe.com/docs)

### Project-Specific Docs
- `alkebu-load/SYSTEM_GUIDE.md` - Comprehensive backend guide
- `docs/architecture.md` - System architecture overview
- `CLAUDE.md` - AI assistant instructions

### Support
- GitHub Issues for bug reports
- Discussions for feature requests
- Team Slack for development questions