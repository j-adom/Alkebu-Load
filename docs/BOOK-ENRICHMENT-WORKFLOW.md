# Book Data Enrichment Workflow

## Overview

Books are now managed with a three-tier enrichment system:

1. **Initial Import** - Basic data from CSV/Square (ISBN, title, price)
2. **Batch Enrichment** - Automatic population from ISBNdb/Google Books (authors, descriptions, images)
3. **Manual Refresh** - Staff can refresh individual books from admin UI

## Database Fields

Books now track enrichment status with:
- `isbndbChecked` (boolean) - Has this book been enriched from external sources?
- `lastEnrichedAt` (date) - When was enrichment last attempted?
- `enrichmentErrors` (text) - Any error messages from enrichment attempts

These fields appear in the sidebar of the book edit page for easy visibility.

## Workflow

### 1. Import Books

Import books with basic data (prices, ISBNs):

```bash
cd alkebu-load
pnpm tsx scripts/import-books.ts
```

**Output:** Books created with `isbndbChecked: false`

### 2. Batch Enrichment

Run automatic enrichment to populate missing fields:

```bash
ISBNDB_API_KEY=your-key pnpm tsx scripts/enrich-books-batch-fast.ts
```

**What it does:**
- Finds books with ISBN but `isbndbChecked: false`
- Queries ISBNdb (primary) and Google Books (fallback)
- Populates: authors, publisher, descriptions, subjects, binding, pages, publication date, images
- Sets `isbndbChecked: true` and `lastEnrichedAt` timestamp
- Processes 10 books simultaneously for speed
- Logs detailed progress and success rate

**Options:**
```bash
--dry-run              # Preview what would happen without making changes
--limit 50             # Only process first 50 books
```

### 3. Manual Refresh (Single Book)

From the Payload CMS book editor:

1. Open any book record
2. Click the blue **"🔍 Refresh from ISBNdb/Google Books"** button at the top
3. Wait for completion message
4. Page auto-reloads with updated fields

**Behind the scenes:**
- Endpoint: `POST /api/books/:id/enrich`
- Fetches latest data from ISBNdb/Google Books
- Updates any empty fields with enriched data
- Sets `isbndbChecked: true` and `lastEnrichedAt`
- Handles errors gracefully (marks as checked even if no data found)

## Bulk ISBN Import (Staff Workflow)

For delegating book data entry to staff:

### Setup

Create a file `alkebu-load/isbn-list.txt` with ISBNs (one per line):

```
9780451524935
9780062963673
9780593312001
# Comments are ignored
9781984826021
```

### Run Import

```bash
cd alkebu-load

# Basic import with default options
ISBNDB_API_KEY=your-key pnpm tsx scripts/bulk-isbn-import.ts

# With options
ISBNDB_API_KEY=your-key pnpm tsx scripts/bulk-isbn-import.ts \
  --file my-isbns.txt \
  --category literature-fiction \
  --collection african-literature-classics \
  --retail-price 2499 \
  --download-images
```

**Available Options:**
```
--file PATH                  # Read ISBNs from file (default: isbn-list.txt)
--category CATEGORY          # Auto-assign category
--collection COLLECTION      # Auto-assign collection
--retail-price CENTS         # Default price if not found (default: 1999 = $19.99)
--download-images            # Fetch and upload cover images (default: true)
--no-images                  # Skip image downloads
--dry-run                    # Preview without creating books
```

**What it does:**
1. Reads ISBN list from file (skips blank lines and comments)
2. For each ISBN:
   - Queries ISBNdb, falls back to Google Books
   - Creates book record with full metadata
   - Downloads cover image to Payload Media collection
   - Assigns to specified category/collection
   - Sets `isbndbChecked: true` and `importSource: 'isbndb'` or `'google-books'`
3. Logs creation status and final summary

### Example: Staff Entry Task

```bash
# Staff pastes ISBNs of new arrivals to isbn-list.txt, then runs:
ISBNDB_API_KEY=$ISBNDB_API_KEY pnpm tsx scripts/bulk-isbn-import.ts \
  --category business-economics \
  --collection staff-picks \
  --retail-price 2499

# Output:
# 📚 Bulk ISBN Book Import
# 📁 Reading ISBNs from: isbn-list.txt
# 📖 Found 15 ISBNs to import
# [1/15] ISBN: 9780451524935
#   📖 Fetching data for 9780451524935...
#   ✅ Found: "Think and Grow Rich"
#   🖼️  Downloading cover image...
#   ✅ Image uploaded
#   ✨ Created book: 62c1...
# ...
# BULK ISBN IMPORT COMPLETE!
# ⏱️  Total time: 45.3s
# 📖 ISBNs processed: 15
# ✨ Books created: 15
# ⏭️  Books skipped (already exist): 0
# ❌ Errors: 0
# 🖼️  Images downloaded: 15
```

## Future: Cron Job Auto-Enrichment

To automatically enrich new imports daily:

```bash
# In /etc/crontab (runs at 2 AM daily)
0 2 * * * cd /home/alkebulani/alkebu-load && \
  ISBNDB_API_KEY=$ISBNDB_KEY \
  pnpm tsx scripts/enrich-books-batch-fast.ts >> /var/log/book-enrichment.log 2>&1
```

## API Reference

### POST /api/books/:id/enrich

Manually trigger book enrichment.

**Headers:**
```
Authorization: Bearer <payload-auth-token>
Content-Type: application/json
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully enriched 8 fields",
  "fieldsUpdated": 8,
  "source": "ISBNdb",
  "book": { /* updated book document */ }
}
```

## Troubleshooting

### ISBNdb API Key Error

```
❌ ISBNDB_API_KEY not configured
```

Set environment variable:
```bash
export ISBNDB_API_KEY="your-api-key-here"
```

Or add to `.env`:
```
ISBNDB_API_KEY=your-api-key-here
```

### Image Download Fails

Books are still created, but cover image isn't added. Re-run enrichment or manually add image in admin UI.

### Enrichment Finds No Data

Book is marked as `isbndbChecked: true` with error message in `enrichmentErrors` field. May indicate:
- Invalid ISBN format
- Book not in ISBNdb or Google Books database
- API temporary outage

### Duplicate ISBN Prevention

If ISBN already exists in database:
- Import skips it (prevents duplicates)
- Run bulk import on same file again = safe (logs "Already exists")
- No risk of duplicate records

## Performance Notes

- **Batch enrichment:** ~1-2 books/second (10 concurrent API calls)
- **Manual refresh:** 1-2 seconds per book (single API call)
- **Bulk import:** ~3-4 seconds per book (includes image download)
- **Image download:** 1-3 seconds per image (depends on file size)

## Field Mapping

ISBNdb → Payload field mapping:

| ISBNdb Field | Payload Field | Notes |
|---|---|---|
| title | title | Book title |
| title_long | titleLong | Full title with subtitle |
| authors[] | authorsText[] | Raw author names (auto-linked later) |
| publisher | publisherText | Publisher name |
| date_published | editions[0].datePublished | Publication date |
| pages | editions[0].pages | Page count |
| binding | editions[0].binding | Format (hardcover, paperback, etc) |
| overview | description | Long description |
| synopsis | synopsis | Short synopsis |
| excerpt | excerpt | Book excerpt |
| subjects[] | subjects[] | Subject tags |
| image | images[0] | Cover image (downloaded) |
| isbn13 | editions[0].isbn | ISBN-13 |
| isbn | editions[0].isbn10 | ISBN-10 |
| dewey_decimal | deweyDecimal[] | Library classification |

Google Books → Payload (fallback, if ISBNdb unavailable):

| Google Field | Payload Field |
|---|---|
| title | title |
| description | description |
| authors[] | authorsText[] |
| publisher | publisherText |
| publishedDate | editions[0].datePublished |
| pageCount | editions[0].pages |
| categories[] | subjects[] |
| imageLinks.thumbnail | images[0] |
