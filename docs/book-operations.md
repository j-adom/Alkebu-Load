# Book Operations

This is the canonical guide for Square CSV import, ISBN enrichment, auto-enrichment, and staff book intake.

## Data Sources

Books can enter Payload through four paths:

1. Square catalog CSV import.
2. Bulk ISBN import from a staff-provided list.
3. Manual Payload admin entry.
4. Square catalog webhook updates after initial setup.

Book metadata enrichment uses ISBNdb first when configured and Google Books as fallback.

## Square CSV Import

Export from Square Dashboard:

1. Open Square Dashboard.
2. Go to Items & Orders -> Items.
3. Export Items and variations as CSV.
4. Save as alkebu-load/data/square-catalog.csv.

Expected fields include:

~~~text
Token, Category, Item Name, Description, SKU, Variation Name, Price,
Current Quantity Main Store, Enabled, Tax - Sales Tax, GTIN, Item Type,
Item ID, Variation ID
~~~

Run import:

~~~bash
cd alkebu-load
pnpm tsx scripts/import-square-csv.ts
pnpm tsx scripts/import-square-csv.ts /path/to/catalog.csv
~~~

Book detection uses category names, ISBN-like GTIN/SKU values, and external API verification.

After import:

~~~bash
pnpm tsx scripts/initialize-search.ts
pnpm tsx scripts/square-integration.ts
~~~

Then review in Payload admin: covers, authors, descriptions, prices, ISBNs, weights, stock, and published status.

## Bulk ISBN Import

Create alkebu-load/isbn-list.txt:

~~~text
9780451524935
9780062963673
9780593312001
# comments are ignored
9781984826021
~~~

Run:

~~~bash
cd alkebu-load
ISBNDB_API_KEY=your-key pnpm tsx scripts/bulk-isbn-import.ts

ISBNDB_API_KEY=your-key pnpm tsx scripts/bulk-isbn-import.ts   --file my-isbns.txt   --category literature-fiction   --collection african-literature-classics   --retail-price 2499   --download-images
~~~

Common options:

~~~text
--file PATH
--category CATEGORY
--collection COLLECTION
--retail-price CENTS
--download-images
--no-images
--dry-run
~~~

The importer skips duplicate ISBNs, creates book records, uploads cover images when enabled, and marks enriched records with source metadata.

## Batch Enrichment

For existing books with ISBNs but missing metadata:

~~~bash
cd alkebu-load
ISBNDB_API_KEY=your-key pnpm tsx scripts/enrich-books-batch-fast.ts
ISBNDB_API_KEY=your-key pnpm tsx scripts/enrich-books-batch-fast.ts --dry-run
ISBNDB_API_KEY=your-key pnpm tsx scripts/enrich-books-batch-fast.ts --limit 50
~~~

Alternate enrichment scripts (ISBNdb / metadata):

~~~bash
pnpm tsx scripts/enrich-books-isbndb.ts
pnpm tsx scripts/enrich-books-metadata.ts
~~~

Note: auto-enrichment also runs automatically on book create/update (ISBNdb first,
Google Books fallback). Bulk imports set `DISABLE_AUTO_BOOK_ENRICHMENT=true` to skip
the slow external-API path.

Batch enrichment fills empty fields only, including authors, publisher, descriptions, subjects, binding, pages, publication date, language, and cover images.

## Manual Refresh

In Payload admin:

1. Open a book record.
2. Click Refresh from ISBNdb/Google Books.
3. Wait for the completion message.
4. Review the updated fields.

Behind the scenes this calls POST /api/books/:id/enrich and updates empty fields without overwriting staff-entered data.

## Enrichment Fields

Books track:

- isbndbChecked - whether enrichment has been attempted.
- lastEnrichedAt - when enrichment last ran.
- enrichmentErrors - any error message from the last attempt.

## API Configuration

~~~bash
ISBNDB_API_KEY=your-key
GOOGLE_BOOKS_API_KEY=your-key
~~~

Google Books can work without a key, but a key raises rate limits. ISBNdb generally improves data quality for books Google does not know.

## Field Mapping

| External Field | Payload Field | Notes |
|---|---|---|
| ISBNdb title / Google title | title | Primary book title |
| ISBNdb title_long | titleLong | Subtitle/full title |
| Authors | authorsText, author relationships | Author relationships may require backfill/auto-linking |
| Publisher | publisherText / publisher relationship | Depends on current enrichment path |
| Overview/description | description, synopsis, excerpt | Empty fields only |
| Subjects/categories | subjects, categories | Normalization varies by source |
| ISBN values | editions identifiers | ISBN-13 and ISBN-10 where available |
| Binding/pages/language/date | editions metadata | Used for storefront and shipping decisions |
| Cover image | images / Media | Download can be retried manually |

## Troubleshooting

- **Missing CSV columns:** re-export from Square as Items and variations and confirm column names.
- **Rate limits:** add ISBNDB_API_KEY, run with --limit, or split large imports into batches.
- **Image download failed:** book records are still usable; retry enrichment or upload cover manually.
- **No external data found:** verify the ISBN manually in ISBNdb/Google Books; some books may need manual metadata.
- **Large catalog imports:** split the CSV or use NODE_OPTIONS=--max-old-space-size=4096.

## Staff Intake Checklist

- [ ] Enter ISBNs for new arrivals into isbn-list.txt or create book manually if no ISBN exists.
- [ ] Run bulk import or manual creation.
- [ ] Verify title, author, cover, description, price, stock, and weight.
- [ ] Set product status to published when ready.
- [ ] Confirm the book appears in storefront search and product listing pages.
