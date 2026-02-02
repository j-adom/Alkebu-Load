# Square CSV Import

## Exporting from Square Dashboard

1. **Login to Square Dashboard**: https://squareup.com/dashboard
2. **Navigate to Items & Orders** → **Items**
3. **Click "Export"** in the top right
4. **Select "Items and variations"**
5. **Choose format**: CSV
6. **Download** the file
7. **Save** the file as `alkebu-load/data/square-catalog.csv`

## CSV Format Expected

The script expects a CSV with the following columns:

```
Token, Category, Item Name, Description, SKU, Variation Name, Price,
Current Quantity Main Store, Enabled, Tax - Sales Tax, GTIN, Item Type,
Item ID, Variation ID
```

### Key Fields:
- **Item ID**: Groups variations together
- **Variation ID**: Unique identifier for each product variation
- **GTIN/SKU**: Used to detect books (ISBN-13 format)
- **Category**: Used to identify books category
- **Current Quantity Main Store**: Stock levels
- **Price**: Retail price
- **Enabled**: Y/N flag for active products

## Running the Import

### Default (looks for `data/square-catalog.csv`):
```bash
cd alkebu-load
tsx scripts/import-square-csv.ts
```

### Custom CSV path:
```bash
tsx scripts/import-square-csv.ts /path/to/your/catalog.csv
```

## Import Process

The script will:
1. ✅ Parse the CSV file
2. ✅ Group variations by Item ID
3. ✅ Filter for books only (by category or ISBN-13 GTIN)
4. ✅ Enrich book data from external APIs (ISBNdb, Google Books)
5. ✅ Create or update books in Payload CMS
6. ✅ Sync inventory levels and pricing

### Book Detection Logic:
1. **Category check**: If Square category contains "book" → Book
2. **GTIN check**: If any variation has ISBN-13 GTIN (978/979 prefix) → Book
3. **API verification**: Attempt to verify via external book APIs

## Post-Import

After import, you should:
1. Review imported books in Payload admin: http://localhost:3000/admin/collections/books
2. Run search index initialization: `tsx scripts/initialize-search.ts`
3. Verify inventory syncing is working: `tsx scripts/square-integration.ts`

## Ongoing Sync

After the initial CSV import, use webhooks for real-time sync:
- Square webhooks configured in `/api/webhooks/square-catalog`
- Updates inventory, pricing, and product changes automatically
- No need to re-import CSV unless doing full refresh

## Troubleshooting

### Missing columns
If you get column errors, check that your CSV export from Square includes all required fields. You may need to customize the column mapping in `import-square-csv.ts`.

### Rate limits on book enrichment
The script makes external API calls to verify and enrich book data. If you hit rate limits:
- Add `ISBNDB_API_KEY` to `.env` for higher limits
- Or disable enrichment by commenting out the API calls

### Large catalogs
For very large catalogs (>1000 items), consider:
- Filtering the CSV to books only before import
- Running in batches by splitting the CSV file
- Increasing Node.js memory: `NODE_OPTIONS=--max-old-space-size=4096 tsx scripts/import-square-csv.ts`
