# Sanity to Payload CMS Migration Guide

## Overview

This guide walks you through migrating your data from Sanity CMS to Payload CMS. The migration process handles:

- ✅ Books and book variants → Books collection with editions
- ✅ Authors (bookAuthor) → Authors collection
- ✅ Publishers → Publishers collection
- ✅ Vendors → Vendors collection
- ✅ Blog posts → BlogPosts collection
- ⚠️ Images (requires manual migration - see below)
- ⚠️ Categories (may need to create collection first)

## Prerequisites

### 1. Install Sanity Client

```bash
cd alkebu-load
pnpm add @sanity/client
```

### 2. Get Sanity API Credentials

1. Go to your Sanity dashboard: https://www.sanity.io/manage
2. Select your project
3. Go to **API** → **Tokens**
4. Create a new token with **Read** access
5. Copy the token

### 3. Configure Environment Variables

Add to `alkebu-load/.env`:

```env
# Sanity Configuration
SANITY_PROJECT_ID=your-project-id
SANITY_DATASET=production
SANITY_TOKEN=your-read-token

# Payload Configuration (should already exist)
PAYLOAD_SECRET=your-payload-secret
DATABASE_URI=your-database-uri
```

## Migration Process

### Option 1: Automated Migration (Recommended)

Run the full migration with one command:

```bash
cd alkebu-load
./scripts/migrate-sanity.sh
```

This will:
1. Export all data from Sanity
2. Transform schemas to Payload format
3. Import data to Payload
4. Initialize search indices

### Option 2: Step-by-Step Migration

#### Step 1: Export from Sanity

```bash
cd alkebu-load
tsx scripts/sanity-export.ts
```

This creates JSON files in `alkebu-load/data/sanity-export/`:
- `bookAuthor.json` - All authors
- `publisher.json` - All publishers
- `vendor.json` - All vendors
- `book.json` - All books with variants
- `post.json` - All blog posts
- `all-data.json` - Combined export
- `metadata.json` - Export metadata and stats

#### Step 2: Review Exported Data

Check the exported data:

```bash
cd alkebu-load/data/sanity-export
ls -lh
cat metadata.json
```

#### Step 3: Import to Payload

```bash
cd alkebu-load
tsx scripts/sanity-to-payload-import.ts
```

This will:
- Import authors first (no dependencies)
- Import publishers (no dependencies)
- Import vendors (no dependencies)
- Import books (references authors, publishers, vendors)
- Import blog posts (references authors)

#### Step 4: Initialize Search

```bash
tsx scripts/initialize-search.ts
```

### Option 3: Partial Migration

Export only (useful for backup):
```bash
./scripts/migrate-sanity.sh --export-only
```

Import only (if you already have export):
```bash
./scripts/migrate-sanity.sh --import-only
```

Dry run (validate setup):
```bash
./scripts/migrate-sanity.sh --dry-run
```

## Schema Mappings

### Sanity → Payload

| Sanity Type | Payload Collection | Notes |
|-------------|-------------------|-------|
| `bookAuthor` | `authors` | Direct mapping |
| `publisher` | `publishers` | Direct mapping |
| `vendor` | `vendors` | Maps `title` → `name` |
| `book` | `books` | Transforms variants to editions |
| `post` | `blog-posts` | Converts PortableText to Lexical |
| `author` | `authors` | Blog authors merge with book authors |
| `genre` | N/A | May need to create collection |
| `category` | N/A | May need to create collection |

### Field Transformations

#### Book Variants → Editions

**Sanity Schema:**
```js
{
  defaultBookVariant: {
    binding: 'paperback',
    isbn: '9780345350688',
    price: 16.00,
    stocklevel: 5,
    publisher: { _ref: 'pub-123' }
  },
  variants: [...]
}
```

**Payload Schema:**
```ts
{
  editions: [
    {
      binding: 'Paperback',
      isbn13: '9780345350688',
      pricing: { retailPrice: 1600 }, // cents
      inventory: { stockLevel: 5 },
      publisher: 'payload-pub-id'
    }
  ]
}
```

#### PortableText → Lexical

Sanity's PortableText is automatically converted to Payload's Lexical format:

```js
// Sanity PortableText
[
  {
    _type: 'block',
    children: [
      { text: 'Hello world', marks: ['strong'] }
    ]
  }
]

// Converted to Lexical
{
  root: {
    children: [
      {
        type: 'paragraph',
        children: [
          { type: 'text', text: 'Hello world', format: 1 }
        ]
      }
    ]
  }
}
```

## Image Migration

**Important:** Images are NOT automatically migrated because they need to be downloaded from Sanity CDN and uploaded to Payload.

### Manual Image Migration Steps

1. **Export image URLs** (already done by `sanity-export.ts`)
2. **Download images from Sanity CDN:**

```bash
cd alkebu-load
tsx scripts/migrate-images.ts  # TODO: Create this script
```

3. **Upload to Payload Media collection:**
   - Via admin UI: http://localhost:3000/admin/collections/media
   - Or programmatically via Payload API

### Future: Automated Image Migration

Create `scripts/migrate-images.ts`:

```typescript
// Download images from Sanity CDN
// Upload to Payload Media collection
// Update book/post references
```

## Verification Checklist

After migration, verify:

- [ ] All authors imported (`/admin/collections/authors`)
- [ ] All publishers imported (`/admin/collections/publishers`)
- [ ] All vendors imported (`/admin/collections/vendors`)
- [ ] All books imported with correct editions (`/admin/collections/books`)
- [ ] Book prices in cents (multiply by 100)
- [ ] Book weights in ounces (convert from pounds)
- [ ] Author relationships preserved
- [ ] Publisher relationships preserved
- [ ] Blog posts imported (`/admin/collections/blog-posts`)
- [ ] Blog post content converted to Lexical
- [ ] Search indices initialized
- [ ] No duplicate entries

## Troubleshooting

### "Export file not found"

Run the export first:
```bash
tsx scripts/sanity-export.ts
```

### "Cannot find package '@sanity/client'"

Install dependencies:
```bash
pnpm add @sanity/client
```

### "SANITY_PROJECT_ID not set"

Add to `.env`:
```env
SANITY_PROJECT_ID=abc123def
SANITY_DATASET=production
SANITY_TOKEN=sk...
```

### Duplicate entries

The import script checks for existing entries by name/title. If you see duplicates:

1. Delete duplicates via admin UI
2. Re-run import (it will skip existing)

### Missing relationships

If books show no authors/publishers:

1. Check that authors/publishers imported first
2. Verify Sanity reference IDs in export JSON
3. Check console for mapping errors

### PortableText conversion issues

If blog post content looks wrong:

1. Check Sanity export JSON for `body` field
2. Verify PortableText structure
3. Update `portableTextToLexical()` function in migration script

## Data Comparison

### Check Record Counts

**Sanity:**
```bash
# Check metadata.json after export
cat data/sanity-export/metadata.json
```

**Payload:**
```bash
# Via admin UI or GraphQL
curl http://localhost:3000/api/graphql \
  -H "Content-Type: application/json" \
  -d '{ "query": "{ Books { totalDocs } }" }'
```

## Rollback

If migration fails or data is incorrect:

1. **Drop Payload collections:**
   - Via admin UI or database directly
   - SQLite: Delete the database file
   - PostgreSQL: `DROP TABLE books; DROP TABLE authors; ...`

2. **Re-run migration:**
   ```bash
   ./scripts/migrate-sanity.sh
   ```

3. **Or restore from Sanity:**
   - Your Sanity data remains unchanged
   - Export again and retry

## Post-Migration

### Update Frontend

If your frontend (alkebu-web) was using Sanity:

1. **Update API endpoints:**
   ```diff
   - const SANITY_PROJECT_ID = 'abc123'
   + const PAYLOAD_API = 'http://localhost:3000/api'
   ```

2. **Update queries:**
   ```diff
   - import { sanityClient } from '@sanity/client'
   - const books = await sanityClient.fetch('*[_type == "book"]')
   + const books = await fetch('/api/books').then(r => r.json())
   ```

3. **Update image URLs:**
   ```diff
   - {sanityImageUrl(book.defaultBookVariant.images[0])}
   + {book.editions[0].images?.[0]?.url}
   ```

### Clean Up

After successful migration:

1. Keep Sanity export as backup:
   ```bash
   tar -czf sanity-backup-$(date +%Y%m%d).tar.gz data/sanity-export/
   ```

2. Optional: Decommission Sanity project
   - Only after thorough testing!
   - Keep backups for at least 30 days

## Support

If you encounter issues:

1. Check export JSON files for data integrity
2. Review console output for specific errors
3. Check Payload admin UI for imported data
4. Verify environment variables are correct

## Advanced: Custom Transformations

To customize the migration logic:

1. **Edit field mappings:**
   - Update `sanity-to-payload-import.ts`
   - Modify the `payloadBook` object

2. **Add custom collections:**
   - Create Payload collection first
   - Add mapping to `SCHEMA_MAPPINGS` in `sanity-export.ts`
   - Add import function in `sanity-to-payload-import.ts`

3. **Handle special cases:**
   ```typescript
   // In sanity-to-payload-import.ts
   if (sanityBook.customField) {
     payloadBook.customMappedField = transform(sanityBook.customField)
   }
   ```
