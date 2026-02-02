# Book Data Migration Strategy

## Data Sources Analysis

### 1. **Square POS** (Primary Source of Truth for Inventory)
**Strengths:**
- ✅ Real-time inventory counts (most accurate)
- ✅ Current pricing (what you're actually charging)
- ✅ SKU/UPC/GTIN data
- ✅ Active products (what you're actually selling)
- ✅ Variants (different bindings/editions)
- ✅ Sales history (what sells well)

**Weaknesses:**
- ❌ Limited metadata (no descriptions, authors, publishers)
- ❌ No cover images
- ❌ Manual data entry errors
- ❌ Inconsistent categorization

**Recommendation:** Use as PRIMARY source for inventory, pricing, and SKUs

---

### 2. **Sanity CMS** (Historical Product Data)
**Strengths:**
- ✅ Rich metadata (descriptions, authors, publishers)
- ✅ Curated content
- ✅ Cover images (uploaded)
- ✅ Relationships (genres, collections)
- ✅ Historical pricing/variants

**Weaknesses:**
- ❌ May be outdated (inventory levels)
- ❌ May have discontinued products
- ❌ Possibly inconsistent with current Square data
- ❌ Image quality may vary

**Recommendation:** Use for historical metadata, but VERIFY against current Square inventory

---

### 3. **ISBNdb API** (Best for Metadata)
**Strengths:**
- ✅ Authoritative book data (from publishers)
- ✅ Comprehensive metadata (authors, publishers, descriptions)
- ✅ Publication dates, page counts
- ✅ Multiple editions/bindings
- ✅ Categories/subjects
- ✅ High-quality cover images (usually)

**Weaknesses:**
- ❌ API rate limits (500/month free, 1000/day paid)
- ❌ No inventory data
- ❌ No pricing (need Square for that)
- ❌ May not have every book (especially older/indie)

**Recommendation:** Use as PRIMARY source for metadata enrichment

---

### 4. **Google Books API** (Best for Coverage)
**Strengths:**
- ✅ Free, unlimited API
- ✅ Huge catalog (especially older books)
- ✅ Good metadata coverage
- ✅ Descriptions, reviews, ratings
- ✅ Cover images (multiple sizes)
- ✅ Preview links

**Weaknesses:**
- ❌ Inconsistent data quality
- ❌ Sometimes incomplete metadata
- ❌ May have wrong edition info
- ❌ Image quality varies

**Recommendation:** Use as FALLBACK when ISBNdb doesn't have data

---

## Recommended Migration Strategy

### **OPTION 1: Square-First Approach** (Recommended for Accuracy)

This ensures you only import books you actually sell, with accurate inventory.

```
Square POS (inventory/pricing)
    ↓
Match with Sanity (historical metadata)
    ↓
Enrich with ISBNdb (authoritative metadata + images)
    ↓
Fallback to Google Books (if ISBNdb fails)
    ↓
Manual review of conflicts
    ↓
Import to Payload
```

**Process:**
1. Export Square catalog (CSV or API)
2. For each Square product with ISBN:
   - Look up in Sanity by ISBN/title
   - Enrich from ISBNdb by ISBN
   - Fallback to Google Books if needed
3. For each Square product WITHOUT ISBN:
   - Look up in Sanity by title/SKU
   - Attempt fuzzy match with external APIs
   - Flag for manual review
4. Reconcile conflicts:
   - Square inventory/pricing wins
   - ISBNdb metadata wins
   - Sanity descriptions/images as fallback
5. Import final merged data to Payload

**Pros:**
- ✅ Only active products
- ✅ Accurate inventory
- ✅ Best metadata quality
- ✅ Catches ISBN errors

**Cons:**
- ⏱️ Slower (multiple API calls per book)
- 📊 May miss historical/seasonal books

---

### **OPTION 2: Sanity-First Approach** (Faster, More Complete)

This preserves your historical catalog but requires cleanup.

```
Sanity CMS (all books + metadata)
    ↓
Match with Square (update inventory/pricing for active books)
    ↓
Enrich missing metadata from ISBNdb
    ↓
Fallback to Google Books
    ↓
Flag books not in Square as "archived"
    ↓
Import to Payload
```

**Process:**
1. Export all Sanity books
2. For each Sanity book:
   - Match with Square by ISBN/SKU
   - If match: Use Square inventory/pricing, mark active
   - If no match: Mark as archived/out-of-stock
3. Enrich metadata from ISBNdb (if ISBN exists)
4. Import to Payload with status flags

**Pros:**
- ✅ Preserves full catalog
- ✅ Good for seasonal/special-order books
- ✅ Faster import
- ✅ Better for historical data

**Cons:**
- ❌ More manual cleanup needed
- ❌ May have discontinued books
- ❌ Need to reconcile conflicts

---

### **OPTION 3: Hybrid Multi-Source Merge** (Most Comprehensive)

Best quality but most complex.

```
Create master reconciliation table:
- Square: inventory, pricing, SKU
- Sanity: descriptions, images, relationships
- ISBNdb: metadata, cover images
- Google Books: fallback metadata

For each unique ISBN:
    1. Fetch from all 4 sources
    2. Score data quality
    3. Pick best fields from each
    4. Resolve conflicts with rules
    5. Flag low-confidence matches
    6. Import to Payload

Manual review queue for:
- Books in multiple sources with different ISBNs
- Books with no ISBN
- Metadata conflicts
- Missing critical data
```

**Pros:**
- ✅ Highest data quality
- ✅ Best images
- ✅ Catches errors across sources
- ✅ Comprehensive coverage

**Cons:**
- ⏱️ Most time-consuming
- 🧠 Requires manual review
- 💻 Most complex code

---

## Data Quality Scoring System

Assign quality scores to prioritize data sources:

### Inventory & Pricing (Square = Authority)
```
Square: 100 points (always wins)
Sanity: 50 points (historical reference)
APIs: 0 points (don't have this)
```

### Metadata (ISBNdb = Authority, Google Books = Fallback)
```
ISBNdb: 100 points
Google Books: 70 points
Sanity: 60 points (manually curated)
Square: 10 points (minimal data)
```

### Images (Multiple sources, pick best quality)
```
ISBNdb: 90 points (usually high-res)
Sanity: 80 points (manually uploaded)
Google Books: 70 points (varies)
Square: 0 points (usually none)
```

### Conflict Resolution Rules
1. **Inventory/Pricing:** Always use Square
2. **ISBN:** If conflict, prefer ISBNdb > Square > Sanity
3. **Title:** Prefer ISBNdb > Sanity (curated) > Google Books
4. **Authors:** Prefer ISBNdb > Google Books > Sanity
5. **Description:** Prefer Sanity (curated) > ISBNdb > Google Books
6. **Images:** Pick highest resolution with priority: ISBNdb > Sanity > Google Books
7. **Publication Date:** Prefer ISBNdb > Google Books
8. **Categories/Genres:** Merge all sources (deduplicate)

---

## Recommended Workflow

### **Phase 1: Foundation (Day 1)**
1. Export Square catalog (CSV)
2. Export Sanity data (JSON)
3. Build ISBN master list (unique ISBNs from both sources)

### **Phase 2: Enrichment (Day 2-3)**
1. Batch fetch ISBNdb data (respect rate limits)
2. Batch fetch Google Books data (unlimited)
3. Download all images from all sources
4. Store in staging database/JSON files

### **Phase 3: Reconciliation (Day 4)**
1. Run reconciliation script
2. Apply conflict resolution rules
3. Generate manual review queue
4. Output merged dataset

### **Phase 4: Manual Review (Day 5)**
1. Review flagged items (no ISBN, conflicts, low confidence)
2. Fix data issues
3. Add missing metadata
4. Approve final dataset

### **Phase 5: Import (Day 6)**
1. Import to Payload
2. Upload images to Media collection
3. Initialize search indices
4. Verify in admin UI

### **Phase 6: Validation (Day 7)**
1. Compare counts (Square vs Payload)
2. Spot-check random books
3. Test search functionality
4. Verify inventory sync

---

## Image Strategy

### Priority Order for Cover Images:
1. **ISBNdb** - Usually highest quality (publisher-provided)
2. **Sanity** - Manually curated (may be better for specific books)
3. **Google Books** - Fallback (decent quality)
4. **Placeholder** - If none found

### Image Quality Requirements:
- Minimum: 300x400px
- Preferred: 600x800px or higher
- Format: JPEG or PNG
- Max file size: 2MB

### Image Deduplication:
- Hash images to detect duplicates
- Compare dimensions
- Keep highest resolution version
- Store image provenance (source)

---

## Data Validation Checklist

Before importing each book, ensure:

- [ ] Valid ISBN-13 (if present)
- [ ] Title exists and is non-empty
- [ ] At least one author
- [ ] At least one edition/variant
- [ ] Price > 0 (for active books)
- [ ] Inventory level >= 0
- [ ] At least one cover image
- [ ] Description exists (even if brief)
- [ ] Publisher exists (if known)
- [ ] Binding type is valid

---

## Handling Edge Cases

### Books without ISBN:
1. Try title + author lookup in APIs
2. Match with Sanity by SKU/title
3. Flag for manual ISBN research
4. Generate internal ID if no ISBN found

### Multiple Editions:
1. Group by base ISBN (first 12 digits)
2. Create one Book with multiple Editions
3. Each edition has unique ISBN-13
4. Link Square variations to correct edition

### Duplicate Titles:
1. Compare ISBNs (different ISBNs = different books)
2. Compare authors
3. Compare publication dates
4. Flag potential duplicates for manual review

### Missing Critical Data:
1. Title missing: Flag for manual entry
2. Author missing: Try "Unknown Author"
3. Price missing: Flag as "Call for Price"
4. Image missing: Use placeholder

---

## Recommended Tools & Scripts

### 1. **Master Reconciliation Script**
`scripts/reconcile-book-data.ts`
- Loads all data sources
- Applies quality scoring
- Resolves conflicts
- Outputs final dataset + manual review queue

### 2. **Image Downloader**
`scripts/download-book-images.ts`
- Downloads from all sources
- Resizes/optimizes
- Stores metadata (source, dimensions)

### 3. **Data Validator**
`scripts/validate-book-data.ts`
- Runs validation checks
- Flags errors/warnings
- Generates quality report

### 4. **Import to Payload**
`scripts/import-reconciled-books.ts`
- Reads final dataset
- Creates Payload records
- Uploads images
- Links relationships

---

## My Recommendation: **Square-First Hybrid**

**Best approach for your use case:**

```
1. Export Square catalog (your source of truth for what you sell)
2. For each Square book:
   a. Extract ISBN from UPC/GTIN/SKU
   b. Fetch ISBNdb data (best metadata)
   c. Fetch Google Books data (fallback)
   d. Match with Sanity (preserve curated descriptions)
   e. Score and merge:
      - Inventory/pricing: Square (100%)
      - Metadata: ISBNdb > Google > Sanity
      - Description: Sanity > ISBNdb > Google (your curation is valuable!)
      - Images: Best quality from any source
3. Generate review queue for:
   - Books with no ISBN
   - Metadata conflicts
   - Missing images
4. Manual review session (1-2 hours)
5. Import to Payload

Optional: Import Sanity-only books marked as "archived" for historical reference
```

**Why this works best:**
- ✅ Ensures data matches what you actually sell
- ✅ Leverages authoritative APIs for accuracy
- ✅ Preserves your curated Sanity content
- ✅ Reasonable time investment
- ✅ Catches errors early
- ✅ Clean, verified database from day one

**Estimated time:**
- Script development: 4-6 hours
- Data fetch & merge: 2-3 hours (automated)
- Manual review: 1-2 hours
- Import & validation: 1 hour
- **Total: 1-2 days**

Ready to implement this approach?
