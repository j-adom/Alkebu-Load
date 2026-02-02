# Square CSV Format Reference

## Your Actual CSV Format

Your Square export uses the **"Items and Variations"** format with the following structure:

### Key Columns (42 total)

| Column | Description | Used By Scripts |
|--------|-------------|-----------------|
| `Token` | Unique variation ID | ✅ Used as Variation ID |
| `Item Name` | Product name | ✅ Used for grouping variants |
| `Variation Name` | Edition/binding (e.g., "Regular", "Hardcover") | ✅ Maps to edition binding |
| `SKU` | Stock keeping unit | ✅ Fallback ISBN source |
| `GTIN` | Global Trade Item Number (ISBN-13) | ✅ Primary ISBN source |
| `Description` | Product description | ✅ Fallback description |
| `Categories` | Product categories | ✅ Book detection |
| `Reporting Category` | Main category | ✅ Fallback category |
| `Price` | Retail price | ✅ Product pricing |
| `Current Quantity Alkebu-Lan Images` | Stock level | ✅ Inventory count |
| `Archived` | Y/N archived status | ✅ Skip archived items |
| `Sellable` | Y/N sellable status | ✅ Availability check |
| `Default Vendor Name` | Vendor/supplier | ℹ️ Reference only |
| `Weight (lb)` | Product weight in pounds | ℹ️ Could use for shipping |

### Other Columns (Not Currently Used)
- SEO fields (SEO Title, SEO Description, Permalink)
- Online settings (Square Online Item Visibility, Social Media fields)
- Fulfillment options (Shipping/Delivery/Pickup Enabled)
- Options (Option Name/Value 1-3) - for product variants
- Stock alerts (Stock Alert Enabled/Count)
- Pricing (Online Sale Price, Default Unit Cost)
- Tax settings

## Example Row

```csv
Token,Item Name,Variation Name,SKU,GTIN,Description,Categories,Price,Current Quantity Alkebu-Lan Images,Archived,Sellable
5XYCCJMKAXEVXO3FITUU3WBR,How to Be Free - by Shaka Senghor (Hardcover),Regular,8932494,9788932494000,"How to Be Free by Shaka Senghor...",Books (T2B3ROTJ3HFGVBO22QLOOJDE),30,0,N,N
```

## Key Observations

### 1. **Grouping Products**
- Square doesn't export a separate "Item ID"
- Products with multiple editions share the same `Item Name`
- Must group by `Item Name` to reconstruct product variants

**Example:**
```
Item Name: "Breaking The Block Building a path to write the story"
├── Variation: "Gold Edition" (Token: QTFKBUARFAGWO2JM5QS2NZYF)
└── Variation: "Regular" (Token: 54HTKT7JAWRFJ3HQHU3VJOZ6)
```

### 2. **ISBN Detection**
ISBNs can be in two places:
1. **GTIN column** (preferred) - e.g., `9788932494000` (shown in scientific notation in Excel!)
2. **SKU column** (fallback) - e.g., `8932494` (partial) or `9788932494000` (full)

⚠️ **Scientific Notation Issue:**
Excel displays long numbers like `9788932494000` as `9.78893E+12`
This is just display formatting - the actual value is intact.

### 3. **Book Detection**
Books are identified by:
1. **Categories** contains "Books" or "book"
2. **GTIN** is valid ISBN-13 (starts with 978 or 979, 13 digits)

Categories format: `Books (T2B3ROTJ3HFGVBO22QLOOJDE), Books (6K5VS5M7K5GY56B24KMTD37Q)`
(Multiple category IDs separated by commas)

### 4. **Stock Levels**
Column name: `Current Quantity Alkebu-Lan Images`
- This is your specific location name
- Can be 0, positive, or negative (negative = oversold)

### 5. **Archived Items**
`Archived = Y` means discontinued/removed items
- Script automatically skips these
- Keep them in CSV for historical reference

## Script Compatibility

### ✅ Updated Scripts
The following scripts now work with your CSV format:

1. **`reconcile-book-data.ts`**
   - Groups by `Item Name` instead of `Item ID`
   - Uses `Token` as variation ID
   - Reads `Current Quantity Alkebu-Lan Images` for stock
   - Handles UTF-8 BOM (the `﻿` character at start)
   - Skips archived items automatically

2. **`import-square-csv.ts`**
   - Needs same updates (TODO: update this file)

### Column Mapping

| Our Script Variable | Square CSV Column |
|---------------------|-------------------|
| `itemId` | `Token` (first variation's) |
| `itemName` | `Item Name` |
| `variationId` | `Token` |
| `variationName` | `Variation Name` |
| `gtin` | `GTIN` |
| `sku` | `SKU` |
| `price` | `Price` |
| `stockLevel` | `Current Quantity Alkebu-Lan Images` |
| `description` | `Description` |
| `category` | `Categories` or `Reporting Category` |
| `enabled` | `NOT Archived AND Sellable != 'N'` |

## Common Issues & Solutions

### Issue: ISBNs show as `9.78893E+12`
**Cause:** Excel scientific notation for long numbers
**Solution:**
- The actual CSV file has correct full numbers
- Scripts read correctly despite Excel display
- To view in Excel: Format cells as Text before opening CSV

### Issue: Duplicate book entries
**Cause:** Same book name with different variations
**Solution:** Script groups by `Item Name` automatically

### Issue: Books without ISBN
**Cause:** Missing or invalid GTIN/SKU
**Solution:**
- Script flags for manual review
- Add ISBN manually to GTIN column in Square
- Or edit reconciled data JSON

### Issue: Negative stock levels
**Cause:** Oversold items in Square
**Solution:** Script treats negative as 0, flags for review

## Testing the Scripts

### 1. Test with Sample Data
```bash
# Use first 10 books only
head -11 data/square-catalog.csv > data/square-sample.csv
tsx scripts/reconcile-book-data.ts data/square-sample.csv
```

### 2. Check Parsing
```bash
# Verify CSV parsing
node -e "
const fs = require('fs');
const {parse} = require('csv-parse/sync');
const csv = fs.readFileSync('data/square-catalog.csv', 'utf-8');
const rows = parse(csv, {columns: true, bom: true});
console.log('Total rows:', rows.length);
console.log('First row keys:', Object.keys(rows[0]));
console.log('Sample book:', rows[0]['Item Name']);
"
```

### 3. Validate ISBNs
```bash
# Count books with valid ISBNs
node -e "
const fs = require('fs');
const {parse} = require('csv-parse/sync');
const csv = fs.readFileSync('data/square-catalog.csv', 'utf-8');
const rows = parse(csv, {columns: true, bom: true});
const withISBN = rows.filter(r => /^97[89]/.test(String(r.GTIN).replace(/\D/g,'')));
console.log('Books with ISBN:', withISBN.length, '/', rows.length);
"
```

## Recommendations

### ✅ Ready to Use
Your Square CSV is ready for the reconciliation scripts!

### 📝 Before Running
1. Ensure you have the full export (not filtered)
2. Keep archived items (they're automatically skipped)
3. Check that `Current Quantity Alkebu-Lan Images` column exists

### 🔄 Optional Improvements
Consider updating Square data for better results:
1. Add ISBNs to GTIN field for books missing them
2. Fill in descriptions for books without them
3. Ensure categories include "Books" for all books
4. Add variation names (Hardcover, Paperback, etc.)

## Next Steps

Ready to run reconciliation:

```bash
cd alkebu-load
tsx scripts/reconcile-book-data.ts data/square-catalog.csv
```

This will:
- ✅ Load your Square catalog
- ✅ Group variations by Item Name
- ✅ Extract ISBNs from GTIN/SKU
- ✅ Detect books by category or ISBN
- ✅ Enrich with ISBNdb/Google Books
- ✅ Match with Sanity data (if available)
- ✅ Generate reconciled dataset
- ✅ Flag items for manual review

Expected output: `data/reconciled/reconciled-books.json`
