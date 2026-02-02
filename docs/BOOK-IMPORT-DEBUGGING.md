# Book Import Debugging Guide

**Status:** Import script working, but data validation errors  
**Date:** January 25, 2026

---

## Current Status

✅ **Script is running** - Successfully connects to Payload CMS  
✅ **237 books detected** - Found in data source  
✅ **Some imports successful** - Duplicates prevented (safety feature)  
❌ **37 validation errors** - Data fields don't match schema

---

## Error Analysis

### Main Error Pattern
```
Error: The following fields are invalid: Authors, Editions 1 > Publisher, Pricing > Retail Price
```

This means for 37 books:
- `authors` field is empty or malformed
- `editions[0].publisher` is missing
- `pricing.retailPrice` is missing or zero

### Why This Matters

The Payload schema requires:
```typescript
// Required fields for Books collection
{
  title: string,                    // ✅ We have this
  description: Rich Text,           // ✅ We have this
  authors: [{name: string}],        // ❌ MISSING for 37 books
  editions: [{
    isbn: string,                   // ✅ We have this
    publisher: string,              // ❌ MISSING for 37 books
    binding: string,                // ✅ We have this
  }],
  pricing: {
    retailPrice: number,            // ❌ MISSING or zero for 37 books
    discountPrice?: number
  }
}
```

---

## Fix Strategy

### Option 1: Fix the CSV Data (Recommended)

Check the `data/square-books-export.csv` for these 37 books:

```bash
# Find books with missing data
cd alkebu-load/data

# Check for empty author cells
grep "^,.*," square-books-export.csv | head -5

# Check for empty publisher cells
# Check for empty price cells ($0.00)
```

**Books with issues:**
- Happy Land
- I Know Why the Caged Bird Sings
- Captain America: Brave New World: A Hero Looks Like You
- Creaky Acres: A Graphic Novel
- Can't Get Enough
- (and 32 more...)

**Solution:**
1. Open `square-books-export.csv` in Excel/Google Sheets
2. Find each book by name
3. Fill in:
   - Author name in "Authors" column
   - Publisher name in "Publisher" column (if missing)
   - Retail price in "Price" column (if $0.00)
4. Re-run import script

### Option 2: Use Import Script Validation Fixes

The script can auto-populate some missing data:

```bash
# Add default values for missing fields
pnpm tsx scripts/import-books.ts --fill-defaults

# This would:
# - Use "Unknown Author" if author missing
# - Use "Unknown Publisher" if publisher missing  
# - Use "Request Quote" if price is $0
```

### Option 3: Skip Validation Temporarily

For MVP testing, temporarily allow incomplete data:

```bash
# Run with lenient validation
pnpm tsx scripts/import-books.ts --lenient

# Books will import with empty fields
# You can manually edit in Payload admin later
```

---

## Why Some Books Show as Duplicates

```
⚠️ Duplicate found for ISBN: 9780399590573 - We Were Eight Years in Power
```

**This is GOOD!** The script detects:
- Books already in the database (by ISBN)
- Prevents duplicate imports
- Shows title for verification

These books are already imported from previous attempts.

---

## Recommended Action Plan

### Step 1: Audit the Data

```bash
cd alkebu-load

# List books with missing authors
pnpm tsx scripts/validate-book-data.ts --check-authors

# List books with missing prices
pnpm tsx scripts/validate-book-data.ts --check-prices

# List books with missing publishers
pnpm tsx scripts/validate-book-data.ts --check-publishers
```

### Step 2: Fix CSV (30 min - 1 hour)

1. Open `data/square-books-export.csv` in Google Sheets
2. Sort by "Authors" column
3. Find empty cells
4. Fill in author names from book cover or search
5. Repeat for "Publisher" and "Price" columns
6. Export as CSV and save

### Step 3: Re-Import

```bash
cd alkebu-load

# Clear previous errors (optional - duplicate prevention will skip)
# pnpm tsx scripts/clear-failed-imports.ts

# Re-run import with fixed data
pnpm tsx scripts/import-books.ts

# Should show: ✅ Successful: 37 (if all data fixed)
```

### Step 4: Verify in Payload

```
1. Go to http://localhost:3000/admin
2. Collections → Books
3. Search for one of the previously-failing books
4. Verify it has:
   - Author name
   - Publisher
   - Price (not $0)
```

---

## Quick Wins (What Already Works!)

✅ **Successfully imported:**
- "We Were Eight Years in Power: An American Tragedy"
- Complex book data with rich descriptions
- ISBN and categorization
- Multi-author books
- Subject tags and collections

✅ **Data structure is solid:**
- Descriptions formatted correctly
- Categories auto-populated
- SEO data generated
- Collections linked

---

## Backend Error (Fixed ✅)

The backend had an import error:
```
Error: calculateTennesseTax is not exported from stripeHelpers
```

**Fixed by:**
- Changed import to use `calculateTaxForAddress` (correct function name)
- Updated 2 locations in cartOperations.ts
- Backend should now start: `pnpm dev`

---

## Next Steps

**Immediate (next 30 min):**
1. Restart backend (should work now): `pnpm dev`
2. Check CSV for those 37 books
3. Note what's missing: authors, publishers, prices

**Short term (next 1-2 hours):**
1. Fix CSV data using spreadsheet
2. Re-run import
3. Verify in admin panel

**Once fixed:**
- You'll have 200+ books imported
- Ready for apparel import
- Ready for image upload
- Ready for end-to-end testing

---

## Commands Reference

```bash
# View import log with details
pnpm tsx scripts/import-books.ts --verbose

# Import with dry-run (see what would happen)
pnpm tsx scripts/import-books.ts --dry-run

# Import only books matching a pattern
pnpm tsx scripts/import-books.ts --filter "Ta-Nehisi"

# Start backend (after fixes)
pnpm dev
```

---

## Files to Check

- `alkebu-load/data/square-books-export.csv` - The source data
- `alkebu-load/scripts/import-books.ts` - The import script
- `alkebu-load/src/collections/Books.ts` - The schema (required fields)

---

## Questions?

- **Why did some import but others didn't?**  
  The ones that imported had complete data (title, description, valid price, author, publisher). The others were missing required fields.

- **Will duplicates cause problems?**  
  No. The script detects by ISBN and skips them safely. This is a feature, not a bug.

- **Can I manually add these 37 books in the admin?**  
  Yes, but it's faster to fix the CSV and re-import. You can do both - import what works now, manually add the problematic ones later.

- **What about the books that show duplicates - are they really imported?**  
  Yes. They're in the database already. The duplicate warnings show they were found and skipped to prevent reimporting.

---

*This is a normal part of data migration. The data quality varies, and the validation helps catch issues early.*
