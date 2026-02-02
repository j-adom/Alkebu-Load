# Auto-Enrichment System

The Payload CMS has two ways to automatically populate book data from ISBNdb and Google Books APIs:

## 1. Manual Script for Existing Books

Run this script to enrich all existing books that have ISBNs but are missing data:

```bash
cd alkebu-load
tsx scripts/enrich-books-from-isbn.ts
```

**What it does:**
- Finds all books with ISBNs but missing author data
- Fetches data from ISBNdb and Google Books APIs
- Populates: title, authors, publisher, description, subjects, images, pages, language, binding
- Automatically creates and links authors
- Processes in batches with rate limiting to respect API limits

**Requirements:**
- Set `ISBNDB_API_KEY` and/or `GOOGLE_BOOKS_API_KEY` in `.env`

**Output:**
```
📚 Found 3789 books to process

[1/3789] 📖 The Power of Zero (ISBN: 210000009478)
  ✅ Enriched with: authorsText, publisherText, synopsis, subjects, scrapedImageUrls
    ✨ Created author: David McKnight
  ✅ Linked 1 author(s)

📊 Enrichment Summary:
✅ Books enriched: 1234
⏭️  Books skipped: 2555
❌ Errors: 0
📡 API calls made: 2468
```

## 2. Automatic Enrichment on New Books

When you add a new book with an ISBN through the Payload admin UI or API, it will **automatically** fetch and populate data from external APIs.

**How it works:**
1. Create a new book in Payload admin
2. Add an ISBN in the editions field
3. Save the book
4. **Automatically happens:**
   - Fetches data from ISBNdb and Google Books
   - Populates title, authors, publisher, description, etc.
   - Creates author records if they don't exist
   - Links authors to the book

**What gets auto-populated:**
- ✅ Title and title_long
- ✅ Authors (both authorsText and author relationships)
- ✅ Publisher
- ✅ Synopsis/Description
- ✅ Subjects and categories
- ✅ Cover images
- ✅ Edition details (pages, language, binding, publication date)

**What WON'T be overridden:**
The auto-enrichment is smart - it only populates **empty** fields. If you've manually entered data, it won't override it.

## Configuration

In `/alkebu-load/.env`:

```bash
# ISBNdb API key (OPTIONAL - 100 free requests/day)
ISBNDB_API_KEY=your_key_here

# Google Books API key (OPTIONAL - works without key, but key gives higher limits)
GOOGLE_BOOKS_API_KEY=your_key_here
```

**Note:**
- ✅ **Google Books works out of the box** - no API key needed!
- Adding `GOOGLE_BOOKS_API_KEY` is optional (increases rate limits from 100 to 1000 per day)
- Adding `ISBNDB_API_KEY` improves data quality (covers books Google Books doesn't have)
- The system merges data from both sources for best results

## How It Works

### Collection Hooks (src/collections/Books.ts)

```typescript
hooks: {
  beforeValidate: [
    // Auto-fetch data from ISBNdb/Google Books when ISBN is added
    async ({ data, operation }) => {
      await autoEnrichBookFromISBN(data, operation);
    }
  ],

  afterChange: [
    // Auto-link authors after book is saved
    async ({ doc, req, operation }) => {
      await autoLinkAuthors(doc, req);
    }
  ]
}
```

### Auto-Enrichment Utility (src/app/utils/autoEnrichBook.ts)

The utility:
1. Checks if book has an ISBN
2. Skips if book already has author data (won't override)
3. Fetches from both ISBNdb and Google Books in parallel
4. Merges data from both sources
5. Populates empty fields only
6. Logs what was added

## Example Workflow

### Adding a new book:

1. Go to Payload Admin → Books → Create New
2. Fill in:
   - **Editions → ISBN**: `9780143127741`
3. Click Save

**What happens automatically:**
```
🔍 Auto-enriching book from ISBN: 9780143127741
  ✅ Added title: Becoming
  ✅ Added authors: Michelle Obama
  ✅ Added publisher: Crown Publishing Group
  ✅ Added synopsis
  ✅ Added subjects: Biography & Autobiography, Political
  ✅ Added 2 image URL(s)
✅ Auto-enrichment complete for: Becoming

🔗 Auto-linking authors for: Becoming
  ✨ Created author: Michelle Obama
  ✅ Linked 1 author(s)
```

### Bulk enrichment of existing books:

```bash
# Enrich all books missing author data
tsx scripts/enrich-books-from-isbn.ts

# The script will:
# - Process ~3,700 books
# - Fetch from ISBNdb and Google Books
# - Create ~2,000 author records
# - Link all authors to their books
# - Take ~30-60 minutes (respects rate limits)
```

## Rate Limiting

Both the script and auto-enrichment respect API rate limits:

- **ISBNdb**: 100 requests per day
- **Google Books**: 1,000 requests per day
- **Script batching**: Processes 10 books, then pauses 1 second

The script is designed to run safely even with large book collections.

## Troubleshooting

**"No external data found for ISBN"**
- The ISBN might not exist in ISBNdb or Google Books
- Try searching manually at https://isbndb.com or https://books.google.com

**"ISBNdb API key not configured"**
- Add `ISBNDB_API_KEY` to your `.env` file
- Restart the Payload server

**Auto-enrichment not working:**
- Check server logs for errors
- Verify API keys are valid
- Make sure you're using ISBNs, not ISBN-10s (use 13-digit ISBNs)

## Disabling Auto-Enrichment

To disable automatic enrichment (only use manual script):

1. Edit `src/collections/Books.ts`
2. Comment out the auto-enrichment lines:

```typescript
hooks: {
  beforeValidate: [
    async ({ data, operation }) => {
      // Disabled auto-enrichment
      // await autoEnrichBookFromISBN(data, operation);
    }
  ]
}
```
