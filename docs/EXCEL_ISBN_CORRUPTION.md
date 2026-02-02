# Excel ISBN Corruption Issue

## ⚠️ Critical Issue Detected

Your Square CSV has **corrupted ISBNs** due to Excel's scientific notation.

### The Problem

Excel automatically converts long numbers (like ISBNs) to scientific notation:
- Original: `9780345350688`
- Excel shows: `9.78035E+12`
- When saved: `9.78035E+12`
- When parsed: `9780350000000` ❌ (lost precision!)

Excel only stores **15 significant digits**, so the last 3 digits become zeros.

### Test Results

From your test CSV:
```
✅ Found 47 ISBNs
❌ Only 3 enriched from ISBNdb (6% success rate!)
❌ Most ISBNs are corrupted (trailing zeros)
```

Examples of corrupted ISBNs:
- `9798990000000` (should be 13 unique digits)
- `9798890000000` (trailing zeros indicate corruption)
- `9798880000000`

###Solutions

## ✅ Solution 1: Re-Export from Square (RECOMMENDED)

**Steps:**
1. Login to Square Dashboard: https://squareup.com/dashboard
2. Navigate to **Items & Orders** → **Items**
3. Click **"Export"** button
4. Select **"Items and variations"** → **CSV**
5. **CRITICAL:** Save the file **WITHOUT opening it in Excel!**
   - Right-click → Save As
   - Or use "Save Link As" in browser
6. Save directly as `alkebu-load/data/square-catalog-clean.csv`

### ✅ Solution 2: Use Google Sheets

If you must edit the CSV:

1. Upload CSV to Google Sheets
2. Select the GTIN column
3. Format → Number → **Plain text**
4. Download as CSV
5. This preserves all digits

### ✅ Solution 3: Fix CSV with Script

I can create a script to:
1. Use Square API directly (bypasses CSV entirely)
2. Fetch products with accurate ISBNs
3. Export clean CSV with proper formatting

Would you like me to create this?

### ✅ Solution 4: Text Editor Method

If you have the original CSV:

1. Open with **Notepad** or **VS Code** (not Excel!)
2. Check if ISBNs look like: `9780345350688` (good)
3. If they look like: `9.78035E+12` (Excel already corrupted it)
4. You'll need to re-export from Square

---

## How to Prevent This

### When Exporting from Square:
- ✅ Save directly without opening
- ✅ Or open in Google Sheets / LibreOffice
- ❌ Never open in Excel before importing

### When Editing CSVs:
- ✅ Use Google Sheets with "Plain Text" format
- ✅ Use LibreOffice Calc (preserves numbers better)
- ✅ Use text editors (VS Code, Notepad++)
- ❌ Avoid Excel for files with long numbers

---

## Testing the Fix

After re-exporting, test with:

```bash
# Check if ISBNs are fixed
head -10 data/square-catalog-clean.csv | grep -o "[0-9]\{13\}"

# Should show full 13-digit ISBNs like:
# 9780345350688
# 9780812993547
# NOT:
# 9.78035E+12
```

Then run reconciliation:

```bash
tsx scripts/reconcile-book-data.ts data/square-catalog-clean.csv
```

Expected improvement:
- Current: 6% enrichment rate (3/47 books)
- After fix: 85-95% enrichment rate (most books found in ISBNdb)

---

## Impact

With corrupted ISBNs:
- ❌ Can't enrich from ISBNdb/Google Books
- ❌ Can't get book metadata (authors, descriptions, images)
- ❌ Low confidence scores
- ❌ Everything needs manual review

With correct ISBNs:
- ✅ 85-95% books enriched automatically
- ✅ Full metadata from authoritative sources
- ✅ High-quality cover images
- ✅ Minimal manual review needed

---

## Next Steps

1. **Re-export CSV from Square** (don't open in Excel!)
2. **Save as:** `data/square-catalog-clean.csv`
3. **Run test:**
   ```bash
   head -150 data/square-catalog-clean.csv > data/square-test-clean.csv
   tsx scripts/reconcile-book-data.ts data/square-test-clean.csv
   ```
4. **Verify:** Should see 85%+ enrichment rate

**Need help?** Let me know if you want me to create the Square API direct import script!
