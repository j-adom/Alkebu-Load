# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a PayloadCMS application designed as an inventory management system for Alkebu-Lan Images bookstore, with Square POS integration and book data import capabilities. It focuses on Black/African literature with sophisticated categorization and collection curation. It also manages non-book inventory such as clothing, incense, natural health and wellness products, and imported jewelry and home goods. The overall project is for version 2.0 of alkebulanimages.com with the tech stack being PayloadCMS for the backend CMS for products, articles, and events calendar database to promote business and community events, and a directory of local businesses in our community. The Payload instance will also serve to manage a commenting system used throught the website for customers and other users to discuss products, articles, and events. There will also be a MedusaJS instance developed in a separate repository to handle checkout and customer service, a sveltekit frontend, and integration with the existing in-store Square POS system to link product information, inventory levels and pricing between the website and in the store.

## Development Commands

**Package Manager**: Use `pnpm` (required by engines config)

### Core Commands
- `pnpm dev` - Start development server on localhost:3000
- `pnpm devsafe` - Clean restart (removes .next directory first)
- `pnpm build` - Build production bundle
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

### PayloadCMS Commands
- `pnpm payload` - Access Payload CLI tools
- `pnpm generate:types` - Generate TypeScript types from collections
- `pnpm generate:importmap` - Generate import map for admin UI

### Script Execution
Scripts in `/scripts/` are TypeScript files that can be run with:
- `tsx scripts/square-integration.ts` - Square API integration testing
- `tsx scripts/import-books.ts` - Book import functionality
- `tsx scripts/square-payload-sync.ts` - Sync between Square and Payload
- `tsx scripts/initialize-search.ts` - Initialize search indices with existing data
- `tsx scripts/initialize-search.ts --sample-data` - Initialize search with sample content

## Architecture

### Database Configuration
- **Default**: SQLite (`alkebulanimages.db` file) for local development
- **Alternative**: PostgreSQL (commented out in config)
- MongoDB support available via docker-compose for traditional Payload setups

### Collections Structure
#### Inventory Collections
- **Books** (`src/collections/Books.ts`) - Main inventory with sophisticated edition management, auto-categorization, and collection assignment
- **WellnessLifestyle** - Wellness and lifestyle products
- **FashionJewelry** - Fashion and jewelry items
- **OilsIncense** - Essential oils, fragrance oils, and incense products
- **ExternalBooks** - Cached external book data from APIs

#### Content Collections
- **BlogPosts** - Blog articles with rich content, SEO, and product relationships
- **Events** - Event management with registration, recurring events, and venue details
- **Businesses** - Local business directory with reviews and ratings
- **Comments** - Universal commenting system across all content types

#### System Collections
- **Media** - File uploads and image management
- **Users** - Admin authentication and user management
- **Authors** - Book author relationships
- **Publishers** - Publisher information
- **Vendors** - Supplier/vendor management
- **SearchAnalytics** - Search behavior tracking and analytics
- **BookQuotes** - External book quote request management

### Key Features
#### E-Commerce & Inventory
- **Square POS Integration**: Sync inventory and orders via Square API
- **Book Import System**: Transform data from ISBNDB API and CSV sources
- **Auto-categorization**: Maps scraped categories to curated taxonomy
- **Collection Curation**: Automatic assignment to themed collections (Civil Rights, Pan-Africanism, etc.)
- **Edition Management**: Multiple ISBN/binding support per book title

#### Enhanced Search System
- **Hybrid Search**: FlexSearch for client-side + PostgreSQL Full-Text Search for server-side
- **External Book APIs**: ISBNdb, Google Books, Open Library integration
- **Voice Search**: Web Speech API support for mobile and desktop
- **Barcode Scanner**: ISBN lookup via camera for in-store use
- **Quote Request System**: Automated workflow for books not in stock
- **Search Analytics**: Track search behavior and popular queries

#### Content Management
- **Blog System**: Rich text articles with SEO optimization and product relationships
- **Event Management**: Registration system, recurring events, calendar integration
- **Business Directory**: Local business listings with reviews and ratings
- **Universal Comments**: Comment system across all content types with moderation

### Important Files
#### Core Configuration
- `src/payload.config.ts` - Main Payload configuration with all collections
- `.env` - Environment variables (DATABASE_URI, PAYLOAD_SECRET, SQUARE_ACCESS_TOKEN, ISBNDB_API_KEY, GOOGLE_BOOKS_API_KEY)

#### Search & External APIs
- `src/app/utils/searchEngine.ts` - FlexSearch implementation with external book integration
- `src/app/utils/externalBookAPI.ts` - ISBNdb, Google Books, Open Library API integration
- `src/app/utils/quoteRequestSystem.ts` - Quote request workflow and email automation
- `src/app/utils/voiceAndScanSearch.ts` - Voice search and barcode scanner utilities
- `src/app/api/search/route.ts` - Search API endpoint
- `src/app/api/external-books/route.ts` - External book search API
- `src/app/api/quote-request/route.ts` - Quote request API

#### Legacy & Square Integration
- `src/app/utils/bookImport.ts` - Book data transformation utilities
- `scripts/square-integration.ts` - Square API debugging and testing
- `scripts/initialize-search.ts` - Search index initialization script

### Docker Setup
Use `docker-compose up` for containerized development with MongoDB. Requires updating MONGODB_URI in .env to use the container hostname.

## API Endpoints

### Search & Discovery
- `GET /api/search?q={query}` - General search across all content types
- `POST /api/search` - Advanced search with filters and analytics
- `GET /api/external-books?q={query}` - Search external book sources
- `GET /api/external-books?isbn={isbn}` - Lookup book by ISBN

### Quote Requests
- `POST /api/quote-request` - Request quote for external book
- `GET /api/quote-request?id={id}&email={email}` - Check quote status

### Content APIs (Payload GraphQL)
- `GET /api/graphql` - GraphQL endpoint for all collections
- `GET /api/books`, `GET /api/events`, `GET /api/businesses` - REST endpoints

## Development Notes

- PayloadCMS admin panel available at `/admin` after first user creation
- **Search System**: Run `tsx scripts/initialize-search.ts` after setting up collections
- Book imports support both ISBNDB API responses and CSV formats
- Square integration requires proper API permissions for catalog and inventory access
- Auto-categorization logic is in Books collection and bookImport utility
- External book APIs require API keys: ISBNDB_API_KEY, GOOGLE_BOOKS_API_KEY
- Voice search and barcode scanning work in browser environments only
- All TypeScript files use ES modules (type: "module" in package.json)

## Environment Variables

Required:
- `DATABASE_URI` - Database connection string
- `PAYLOAD_SECRET` - Payload CMS encryption secret
- `SQUARE_ACCESS_TOKEN` - Square POS API access token

Optional (External Features):
- `ISBNDB_API_KEY` - ISBNdb API key for enhanced book search
- `GOOGLE_BOOKS_API_KEY` - Google Books API key
- `PAYLOAD_PUBLIC_SERVER_URL` - Public URL for email links (default: http://localhost:3000)