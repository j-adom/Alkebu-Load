# Quick Reference: Book Enrichment Commands

## Standard Phase 1 Flow

```bash
# 1. Import books from CSV
cd alkebu-load
pnpm tsx scripts/import-books.ts

# 2. Enrich all books automatically
export ISBNDB_API_KEY="your-key-here"
pnpm tsx scripts/enrich-books-batch-fast.ts

# 3. Check results in admin
# Visit: http://localhost:3000/admin/collections/books
# Look for: isbndbChecked = true, lastEnrichedAt = today's date
```

## Manual Refresh (Admin UI)

```
1. Log in to http://localhost:3000/admin
2. Go to Collections → Books
3. Click any book to open editor
4. At the top, click: "🔍 Refresh from ISBNdb/Google Books"
5. Wait for success message
6. Page auto-reloads with new data
```

## Bulk ISBN Import (Staff)

```bash
# Create list of ISBNs
cat > isbn-list.txt << EOF
9780451524935
9780062963673
9780593312001
EOF

# Option A: Basic import (all fields auto-detected)
export ISBNDB_API_KEY="your-key-here"
pnpm tsx scripts/bulk-isbn-import.ts

# Option B: With category & collection tags
pnpm tsx scripts/bulk-isbn-import.ts \
  --category literature-fiction \
  --collection african-literature-classics

# Option C: With custom price
pnpm tsx scripts/bulk-isbn-import.ts \
  --retail-price 2499  # $24.99

# Option D: Full example with all options
pnpm tsx scripts/bulk-isbn-import.ts \
  --file my-books.txt \
  --category business-economics \
  --collection staff-picks \
  --retail-price 1999 \
  --download-images

# Option E: Preview only (dry run)
pnpm tsx scripts/bulk-isbn-import.ts --dry-run
```

## Available Options

```
BATCH ENRICHMENT (enrich-books-batch-fast.ts)
  --dry-run              Preview what would happen
  --limit 50             Only process first N books
  
BULK IMPORT (bulk-isbn-import.ts)
  --file PATH            ISBN list file (default: isbn-list.txt)
  --category NAME        Auto-assign category (see list below)
  --collection NAME      Auto-assign collection (see list below)
  --retail-price CENTS   Default price if not found (default: 1999 = $19.99)
  --download-images      Fetch cover images (default: true)
  --no-images            Skip image downloads
  --dry-run              Preview without creating
  --vendor ID            Link to vendor (Payload ID)
```

## Category Names

```
history
biography-autobiography
literature-fiction
religion-spirituality
politics-social-science
children-young-adult
arts-culture
education-academia
business-economics
health-wellness
```

## Collection Names

```
civil-rights-movement
african-diaspora
pan-africanism
black-business-leaders
essential-black-history
contemporary-black-voices
african-literature-classics
spirituality-consciousness
youth-education
staff-picks
new-arrivals
bestsellers
```

## Environment Variables

```bash
# Required for enrichment
export ISBNDB_API_KEY="your-isbndb-api-key"

# Optional (fallback)
export GOOGLE_BOOKS_API_KEY="your-google-books-key"

# Or add to alkebu-load/.env file:
ISBNDB_API_KEY=your-key-here
GOOGLE_BOOKS_API_KEY=your-key-here
```

## Batch Processing Explained

When you run enrichment:

1. **Query** - Finds all books with:
   - Valid ISBN in `editions[0].isbn`
   - `isbndbChecked = false`

2. **Fetch** - For each book:
   - Tries ISBNdb first
   - Falls back to Google Books if needed
   - Extracts: authors, publisher, descriptions, images, metadata

3. **Update** - Populates empty fields:
   - Authors (authorsText)
   - Publisher (publisherText)
   - Description (overview)
   - Synopsis, excerpt
   - Binding, pages, publication date
   - Cover image (downloaded to Media collection)
   - Subjects/categories

4. **Mark** - Sets:
   - `isbndbChecked: true`
   - `lastEnrichedAt: 2026-01-25T14:30:00Z`

5. **Speed** - 10 books processed simultaneously = ~1-2 books/sec

## Checking Results

```bash
# In Payload admin UI:
http://localhost:3000/admin/collections/books

# Check sidebar fields:
✓ isbndbChecked = true (green checkbox)
✓ lastEnrichedAt = recent date
✓ enrichmentErrors = empty

# View enriched data:
- Authors populated (authorsText)
- Publisher filled in (publisherText)
- Description/synopsis/excerpt visible
- Cover image appears (if downloaded)
```

## Troubleshooting

| Problem | Solution |
|---|---|
| `ISBNDB_API_KEY not configured` | Run: `export ISBNDB_API_KEY="your-key"` |
| Some books not enriched | Run with `--limit 10` to test first book |
| Image download failed | Re-run enrichment or use --no-images to skip |
| ISBN not found in ISBNdb | Check ISBN format (should be 13 digits) |
| Manual refresh not working | Ensure book has ISBN in editions[0].isbn |

## Performance

| Task | Time |
|---|---|
| Import 237 books | 5-10 minutes |
| Enrich 237 books | 2-3 minutes |
| Bulk import 15 books | 1-2 minutes |
| Manual refresh 1 book | 1-2 seconds |

## Useful File Locations

```
alkebu-load/scripts/enrich-books-batch-fast.ts     ← Batch enrichment
alkebu-load/scripts/bulk-isbn-import.ts             ← Bulk import
alkebu-load/src/app/routes/api/books/[id]/enrich   ← Manual API
alkebu-load/src/collections/Books.ts                ← Schema (tracking fields)
docs/BOOK-ENRICHMENT-WORKFLOW.md                    ← Full documentation
```

## One-Liner Examples

```bash
# Full flow: import → enrich → verify
cd alkebu-load && \
pnpm tsx scripts/import-books.ts && \
ISBNDB_API_KEY=$ISBNDB_API_KEY pnpm tsx scripts/enrich-books-batch-fast.ts && \
echo "✅ Done! Check http://localhost:3000/admin/collections/books"

# Bulk import with all options
ISBNDB_API_KEY=$ISBNDB_API_KEY pnpm tsx scripts/bulk-isbn-import.ts \
  --category literature-fiction --collection staff-picks --retail-price 2499

# Dry run to preview
pnpm tsx scripts/bulk-isbn-import.ts --dry-run --file test-isbns.txt
```

## Next Steps

1. ✅ Get ISBNDB_API_KEY from isbndb.com (free tier available)
2. ✅ Test on small set: `pnpm tsx scripts/bulk-isbn-import.ts --limit 5`
3. ✅ Import all books: `pnpm tsx scripts/import-books.ts`
4. ✅ Enrich all books: `pnpm tsx scripts/enrich-books-batch-fast.ts`
5. ✅ Verify in admin UI
6. ✅ Test manual refresh on one book
7. ✅ Ready for Phase 1 launch! 🚀

---

**For complete details:** See [BOOK-ENRICHMENT-WORKFLOW.md](BOOK-ENRICHMENT-WORKFLOW.md)
