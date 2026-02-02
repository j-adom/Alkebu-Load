# Recommended Book Data Migration Workflow

## TL;DR - Quick Start

```bash
# 1. Export Square catalog
# (Download CSV from Square Dashboard)

# 2. Export Sanity data (optional but recommended)
cd alkebu-load
tsx scripts/sanity-export.ts

# 3. Reconcile all data sources
tsx scripts/reconcile-book-data.ts data/square-catalog.csv

# 4. Review flagged items
cat data/reconciled/manual-review-queue.json

# 5. Import to Payload
tsx scripts/import-reconciled-books.ts

# 6. Initialize search
tsx scripts/initialize-search.ts
```

**Estimated time:** 2-4 hours (including manual review)

---

## Complete Step-by-Step Workflow

### Phase 1: Data Collection (30-60 minutes)

#### Step 1.1: Export Square Catalog

1. Login to Square Dashboard: https://squareup.com/dashboard
2. Navigate to **Items & Orders** → **Items**
3. Click **"Export"** button (top right)
4. Select **"Items and variations"**
5. Choose format: **CSV**
6. Download and save as: `alkebu-load/data/square-catalog.csv`

**Expected output:** CSV file with all products, variants, prices, inventory

#### Step 1.2: Export Sanity Data (Optional but Recommended)

```bash
cd alkebu-load

# Install Sanity client if not already installed
pnpm add @sanity/client

# Configure .env with Sanity credentials
# SANITY_PROJECT_ID=your-project-id
# SANITY_DATASET=production
# SANITY_TOKEN=your-read-token

# Export all Sanity data
tsx scripts/sanity-export.ts
```

**Expected output:**
- `data/sanity-export/book.json` - All books
- `data/sanity-export/bookAuthor.json` - All authors
- `data/sanity-export/publisher.json` - All publishers
- `data/sanity-export/all-data.json` - Combined export
- `data/sanity-export/metadata.json` - Stats

**Why this helps:**
- Preserves your curated descriptions
- Maintains historical genre/tag data
- Provides fallback for missing Square metadata

#### Step 1.3: Verify Data Sources

```bash
# Check Square CSV
wc -l data/square-catalog.csv  # Should show number of rows

# Check Sanity export
cat data/sanity-export/metadata.json  # Should show book counts

# Example output:
# {
#   "totalDocuments": 150,
#   "stats": {
#     "book": 120,
#     "bookAuthor": 85,
#     "publisher": 42
#   }
# }
```

---

### Phase 2: Data Reconciliation (1-2 hours automated)

#### Step 2.1: Run Reconciliation Script

This is the **magic step** that merges all your data sources intelligently.

```bash
cd alkebu-load
tsx scripts/reconcile-book-data.ts data/square-catalog.csv
```

**What it does:**
1. ✅ Loads Square catalog (source of truth for inventory/pricing)
2. ✅ Matches each Square book with Sanity (by ISBN or title)
3. ✅ Enriches from ISBNdb API (best metadata + images)
4. ✅ Falls back to Google Books if ISBNdb fails
5. ✅ Scores data quality from each source
6. ✅ Merges using intelligent conflict resolution:
   - Inventory/Pricing: **Square wins** (always)
   - Metadata: **ISBNdb wins** (most authoritative)
   - Description: **Sanity wins** (your curation is valuable!)
   - Images: **Best quality** from any source
7. ✅ Flags books that need manual review
8. ✅ Calculates confidence scores (0-100)

**Expected output:**
```
📦 Loading Square catalog...
✅ Loaded 200 Square items

📚 Loading Sanity data...
✅ Loaded 120 Sanity books

🔄 Starting reconciliation...

🔍 Reconciling: The Autobiography of Malcolm X
  ✓ ISBN: 9780345350688
  ✓ Matched with Sanity
  ✓ Enriched from ISBNdb
  ✓ Using Sanity description
  📊 Confidence: 95%

🔍 Reconciling: Between the World and Me
  ✓ ISBN: 9780812993547
  ✓ Enriched from Google Books
  ⚠️  Flagged for review: Missing cover image
  📊 Confidence: 75%

...

📊 RECONCILIATION SUMMARY
══════════════════════════════════════════════════════════════════════
📦 Input Sources:
├── Square books:           200
├── Sanity books:           120
└── Matched:                95

🔍 Enrichment:
├── ISBNdb enrichment:      145
├── Google Books fallback:  35
└── Missing ISBN:           20

✅ Quality:
├── High confidence (≥80):  160
├── Medium confidence (50-79): 30
├── Low confidence (<50):   10
└── Needs manual review:    25

⚠️  Warnings:
├── Missing images:         15
└── Missing ISBN:           20
```

#### Step 2.2: Review Output Files

```bash
# View reconciliation summary
cat data/reconciled/reconciliation-stats.json

# Check how many books are ready to import
cat data/reconciled/ready-to-import.json | grep '"title"' | wc -l

# See what needs manual review
cat data/reconciled/manual-review-queue.json
```

**Output files explained:**

| File | Description | Use |
|------|-------------|-----|
| `reconciled-books.json` | All reconciled books | Full dataset |
| `ready-to-import.json` | High-confidence books (≥80, no flags) | Auto-import these |
| `manual-review-queue.json` | Books flagged for review | Fix these manually |
| `reconciliation-stats.json` | Summary statistics | Quality metrics |

---

### Phase 3: Manual Review (30-60 minutes)

#### Step 3.1: Review Flagged Books

Open `data/reconciled/manual-review-queue.json` and review each flagged book:

**Common issues and fixes:**

| Issue | Fix |
|-------|-----|
| **Missing ISBN** | Research correct ISBN and add manually |
| **Missing cover image** | Download from publisher/Amazon and save URL |
| **Missing author** | Add author name to `authors` array |
| **Missing description** | Write brief description or copy from source |
| **Low confidence** | Verify all metadata is correct |

#### Step 3.2: Edit Reconciled Data

You can edit `data/reconciled/reconciled-books.json` directly:

```json
{
  "isbn13": "9780345350688",
  "title": "The Autobiography of Malcolm X",
  "description": "Add or fix description here",
  "authors": ["Malcolm X", "Alex Haley"],
  "images": [
    {
      "url": "https://example.com/cover.jpg",
      "source": "manual"
    }
  ],
  "needsReview": false,
  "reviewReasons": []
}
```

**Pro tip:** Use a JSON editor with validation (VS Code, etc.)

#### Step 3.3: Validate Edits

```bash
# Check JSON is valid
node -e "JSON.parse(require('fs').readFileSync('data/reconciled/reconciled-books.json'))"

# If no errors, you're good!
```

---

### Phase 4: Import to Payload (15-30 minutes)

#### Step 4.1: Dry Run (Recommended)

Test the import without making changes:

```bash
tsx scripts/import-reconciled-books.ts --dry-run
```

This shows you exactly what would be imported.

#### Step 4.2: Import High-Confidence Books First

```bash
# Import only books with ≥80% confidence
tsx scripts/import-reconciled-books.ts --high-confidence
```

**Why this approach:**
- ✅ Gets clean data into Payload quickly
- ✅ Lets you verify import process works
- ✅ Isolates problematic books

#### Step 4.3: Fix and Import Remaining Books

1. Review any import errors from Step 4.2
2. Fix issues in `reconciled-books.json`
3. Import all remaining books:

```bash
tsx scripts/import-reconciled-books.ts
```

**Expected output:**
```
🚀 Importing Reconciled Books to Payload

📂 Loading: data/reconciled/reconciled-books.json
✅ Loaded 200 books

📖 The Autobiography of Malcolm X
   Sources: square, sanity, isbndb
   Confidence: 95%
    ✓ Created author: Malcolm X
    ✓ Created author: Alex Haley
    ✓ Created publisher: Ballantine Books
   ✅ Created
   📷 1 image(s) available (manual upload needed)

...

📊 IMPORT SUMMARY
══════════════════════════════════════════════════════════════════════
📚 Books:
├── Created:   180
├── Updated:   20
└── Skipped:   0

👥 Relationships:
├── Authors:    95 (75 new)
└── Publishers: 42 (35 new)

✅ Import complete!
```

---

### Phase 5: Post-Import Tasks (15-30 minutes)

#### Step 5.1: Verify Import

```bash
# Check book counts in Payload admin
open http://localhost:3000/admin/collections/books

# Or via GraphQL
curl http://localhost:3000/api/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ Books { totalDocs } }"}'
```

**Verification checklist:**
- [ ] Book count matches Square catalog
- [ ] Authors created correctly
- [ ] Publishers created correctly
- [ ] Prices match Square (in cents!)
- [ ] Inventory levels match Square
- [ ] Editions/variations imported correctly
- [ ] Descriptions present and readable

#### Step 5.2: Upload Images

**Option A: Manual Upload (for few books)**
1. Go to http://localhost:3000/admin/collections/media
2. Upload each cover image
3. Edit each book and link to uploaded media

**Option B: Automated Upload (recommended for many books)**

```bash
# TODO: Create this script
tsx scripts/upload-book-images.ts
```

This would:
- Download images from URLs in `reconciled-books.json`
- Upload to Payload Media collection
- Link images to books automatically

#### Step 5.3: Initialize Search Indices

```bash
tsx scripts/initialize-search.ts
```

This creates FlexSearch indices for fast client-side search.

---

### Phase 6: Testing & Validation (30 minutes)

#### Test Checklist:

**Admin UI Tests:**
- [ ] Browse books in admin UI
- [ ] Search works correctly
- [ ] Filter by author works
- [ ] Filter by publisher works
- [ ] Inventory levels visible
- [ ] Prices display correctly ($16.00, not 1600)

**API Tests:**
```bash
# Get all books
curl http://localhost:3000/api/books | jq '.docs[0]'

# Search books
curl 'http://localhost:3000/api/search?q=malcolm' | jq

# Get book by ISBN
curl 'http://localhost:3000/api/books?where[editions.isbn13][equals]=9780345350688' | jq
```

**Frontend Tests (if applicable):**
- [ ] Books display on website
- [ ] Search works
- [ ] Add to cart works
- [ ] Prices match Square
- [ ] Stock levels accurate

---

## Maintenance & Ongoing Sync

After initial migration, use Square webhooks for real-time sync:

```bash
# Square webhook configured at:
# /api/webhooks/square-catalog

# When Square updates a product:
# 1. Webhook receives notification
# 2. Updates Payload book inventory/pricing
# 3. No re-import needed
```

---

## Rollback Plan

If something goes wrong:

### Option 1: Re-import Clean
```bash
# Delete all books from Payload
# (via admin UI or database)

# Re-run import
tsx scripts/import-reconciled-books.ts
```

### Option 2: Restore from Backup
```bash
# Create backup before import
cp -r data/reconciled data/reconciled-backup-$(date +%Y%m%d)

# Restore if needed
cp -r data/reconciled-backup-YYYYMMDD/* data/reconciled/
```

### Option 3: Start Over
```bash
# Re-run entire workflow
tsx scripts/reconcile-book-data.ts data/square-catalog.csv
tsx scripts/import-reconciled-books.ts
```

---

## Troubleshooting

### "Missing ISBN" warnings
**Solution:** Research ISBNs manually and add to `reconciled-books.json`

### "Failed to enrich from APIs"
**Causes:**
- Rate limits (ISBNdb: 500/month free)
- Book not in database
- Network issues

**Solutions:**
- Use Google Books fallback (automatic)
- Manual metadata entry
- Upgrade ISBNdb plan

### "Duplicate authors created"
**Cause:** Name variations ("Malcolm X" vs "X, Malcolm")

**Solution:**
- Normalize names before import
- Merge duplicates in admin UI
- Add author aliases

### Import crashes midway
**Solution:**
- Check error messages
- Fix data issues
- Re-run (existing books will be updated, not duplicated)

### Images not showing
**Causes:**
- URLs broken/expired
- Images not uploaded to Payload

**Solution:**
- Re-download images
- Upload to Payload Media collection
- Link to books manually or via script

---

## Success Metrics

After migration, you should have:

✅ **High-quality book database**
- 180+ books with complete metadata
- 95+ authors properly linked
- 40+ publishers cataloged
- Cover images for 90%+ of books
- Rich descriptions from multiple sources

✅ **Accurate inventory**
- Real-time sync with Square POS
- Correct pricing (verified against Square)
- Stock levels match physical inventory

✅ **Enhanced discoverability**
- Search by title, author, ISBN
- Filter by genre, publisher
- Related books suggestions
- Fast client-side search

✅ **Maintainable system**
- Automated Square sync via webhooks
- Clear data provenance
- Easy to add new books
- Audit trail of data sources

---

## Next Steps After Migration

1. **Frontend Integration**
   - Update alkebu-web to consume Payload API
   - Implement book browsing/search UI
   - Add to cart functionality

2. **Content Enhancement**
   - Add book excerpts/samples
   - Create curated collections
   - Write blog posts about books
   - Add customer reviews

3. **Marketing**
   - SEO optimization (using metadata)
   - Social media integration
   - Email newsletter (new books)
   - Special promotions

4. **Analytics**
   - Track search queries
   - Monitor popular books
   - Analyze sales patterns
   - Optimize inventory

---

## Questions?

Refer to:
- [Book Data Migration Strategy](./book-data-migration-strategy.md) - Detailed analysis
- [Sanity Migration Guide](./sanity-migration.md) - Sanity-specific migration
- [MCP Setup](./mcp-setup.md) - Development tools

Or review the scripts:
- `scripts/reconcile-book-data.ts` - Main reconciliation logic
- `scripts/import-reconciled-books.ts` - Import to Payload
- `scripts/sanity-export.ts` - Sanity data export
