# Import Script Improvements

## Issues Identified

### 1. **Images Not Being Imported** ✅ FIXED
**Problem**: ISBNdb image URLs from reconciliation are not being stored in Payload books.

**Root Cause**:
- Reconciled data has `images: []` (empty array)
- `transformIsbndbToPayload()` returns `scrapedImageUrls` but reconciliation script expects `images`
- Mismatch between interface expectations

**Solution**:
1. Fix the reconciliation script to use `scrapedImageUrls` from ISBNdb data
2. Store image URLs in the `scrapedImageUrls` field during import
3. Frontend can use these URLs directly (faster than downloading/uploading)

### 2. **Slow Performance** ⚠️  NEEDS OPTIMIZATION
**Problem**: Only 831 books imported in ~10 minutes (1.4 books/sec)

**Bottlenecks**:
- Sequential processing (one book at a time)
- Database query for each book to check if it exists
- Author/publisher creation not batched

**Solutions**:
1. Batch author/publisher lookups at start
2. Use bulk create operations where possible
3. Add connection pooling configuration
4. Parallel processing with worker pools

### 3. **Incomplete Import** ⚠️  INVESTIGATING
**Problem**: Only 831/3692 books (22.5%) were imported

**Possible Causes**:
- Script hit an unhandled error and stopped
- Timeout killed the process
- Database connection dropped

**Solutions**:
1. Add comprehensive try/catch with detailed error logging
2. Save progress to file every N books
3. Add resume capability from last successful import
4. Better error reporting in final summary

## Recommended Implementation Order

### Phase 1: Fix Image URLs (Quick Win)
1. Update reconciliation script to extract `scrapedImageUrls` from ISBNdb
2. Update import script to store `scrapedImageUrls` in books
3. Re-run reconciliation to regenerate data with image URLs
4. Re-run import to update existing books with images

### Phase 2: Improve Error Handling & Logging
1. Wrap each book import in try/catch ✅
2. Log errors to separate error file ✅ (saved as `data/import-errors.json`)
3. Continue processing on individual failures ✅
4. Generate detailed success/failure report ✅

### Phase 3: Performance Optimization
1. Pre-load all existing authors/publishers into cache ✅
2. Batch database operations (create 100 books at a time)
3. Add progress checkpoints every 500 books ✅
4. Implement resume-from-checkpoint capability ✅ (`--resume` flag)

### Phase 4: Image Download/Upload (Optional)
1. Create separate script to download images from URLs
2. Upload to Payload Media collection
3. Link media IDs to book records
4. Only do this if you prefer hosted images over external URLs

## Code Changes Needed

### 1. Fix Reconciliation Script Image Extraction

```typescript
// In reconcile-book-data.ts, change this:
const imageUrl = data.images?.[0]?.url  // ❌ Wrong

// To this:
const imageUrl = data.scrapedImageUrls?.[0]?.url  // ✅ Correct
```

### 2. Add Image URLs to Import Script

```typescript
//  In import-reconciled-books.ts, add to payloadBook:
scrapedImageUrls: book.images.map((img: any) => ({
  url: img.url
})),
```

### 3. Add Error Handling

```typescript
try {
  await importBook(book, ctx, stats)
} catch (error) {
  console.error(`❌ Failed to import "${book.title}":`, error.message)
  stats.errors.push({
    title: book.title,
    isbn: book.isbn13,
    squareItemId: book.squareItemId,
    error: error.message
  })
  // Continue with next book instead of crashing
}
```

### 4. Add Progress Checkpoints

```typescript
// Save progress every 500 books (and resume with --resume)
if (absoluteProcessed % 500 === 0) {
  fs.writeFileSync(
    CHECKPOINT_PATH,
    JSON.stringify({ lastProcessed: absoluteProcessed, timestamp: new Date() })
  )
}
```

## Testing Plan

1. **Test Image URL Fix** (10 books):
   ```bash
   # Re-run reconciliation with fixed script
   tsx scripts/reconcile-book-data.ts data/square-test.csv

   # Verify images are present in output
   grep -A 5 '"images"' data/reconciled/reconciled-books.json | head -30

   # Import and verify
   tsx scripts/import-reconciled-books.ts --high-confidence
   tsx scripts/check-import-stats.ts
   ```

2. **Test Full Import** (all 3692 books):
   ```bash
   # Clear existing imports (optional)
   # Run full import with new error handling
   tsx scripts/import-reconciled-books.ts --high-confidence 2>&1 | tee import-log.txt

   # Check final stats
   tsx scripts/check-import-stats.ts
   ```

3. **Verify Image URLs**:
   - Open Payload admin at localhost:3000/admin
   - Check a few book records
   - Verify `scrapedImageUrls` field is populated
   - Test image URLs in browser

## Expected Outcomes

### After Phase 1 (Image URLs):
- ✅ All high-confidence books have image URLs stored
- ✅ Frontend can display cover images from external URLs
- ✅ No need to download/store images in Payload

### After Phase 2 (Error Handling):
- ✅ 100% of 3692 books processed (not crashed midway)
- ✅ Clear error report showing which books failed and why
- ✅ Easy to identify and fix problem books

### After Phase 3 (Performance):
- ✅ Import time reduced from 45+ minutes to <10 minutes
- ✅ Ability to resume if interrupted
- ✅ Progress tracking with ETA

## Next Steps

**Immediate Action**: Which phase would you like to tackle first?

1. **Quick Fix**: Just fix image URLs and re-import (15 minutes)
2. **Complete Fix**: All three phases for production-ready import (1-2 hours)
3. **Investigation**: First figure out why only 831/3692 imported
