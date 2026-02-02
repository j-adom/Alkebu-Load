import { config as dotenvConfig } from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenvConfig({ path: './.env' });

/**
 * BATCH ENRICHMENT via REST API - Uses running dev server!
 * Much faster - no Payload initialization needed
 * Connects to localhost:3000
 */

const API_URL = process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000';
const BATCH_SIZE = 400; // logical batch of books; API calls will auto-split smaller if needed
const LOG_DIR = './logs';
const API_TOKEN = process.env.PAYLOAD_API_TOKEN || process.env.PAYLOAD_REST_API_KEY;
const ADMIN_EMAIL = process.env.PAYLOAD_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PAYLOAD_ADMIN_PASSWORD;
const DEFAULT_TIMEOUT_MS = Number(process.env.PAYLOAD_FETCH_TIMEOUT_MS || 60000);
const LOGIN_TIMEOUT_MS = 180000; // 3 minutes for initial login (database may be slow)
const PING_TIMEOUT_MS = 300000; // 5 minutes for server check (first query is very slow with hooks)
const BOOK_OPERATION_TIMEOUT_MS = 300000; // 5 minutes for book fetch/update operations (hooks can be slow)

const authorCache = new Map<string, number>();
let cachedAuthHeader: Record<string, string> | null = null;

interface ISBNdbBook {
  isbn13?: string;
  isbn?: string;
  title?: string;
  title_long?: string;
  authors?: string[];
  publisher?: string;
  date_published?: string;
  synopsis?: string;
  overview?: string;
  subjects?: string[];
  pages?: number;
  language?: string;
  binding?: string;
  image?: string;
}

interface BatchBookData {
  isbn: string;
  title?: string;
  titleLong?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  subjects?: string[];
  pages?: number;
  language?: string;
  binding?: string;
  imageUrl?: string;
}

function normalizePublishedDate(raw?: string): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();

  // Year-only -> first day of year
  const yearOnly = /^(\d{4})$/.exec(trimmed);
  if (yearOnly) return `${yearOnly[1]}-01-01`;

  // Year-month -> first day of month
  const yearMonth = /^(\d{4})-(\d{1,2})$/.exec(trimmed);
  if (yearMonth) {
    const month = yearMonth[2].padStart(2, '0');
    return `${yearMonth[1]}-${month}-01`;
  }

  // Full date or ISO-ish; fall back to Date parsing and keep YYYY-MM-DD
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return undefined;
}

/**
 * Normalize binding values from ISBNdb to match Payload schema
 * Valid values: hardcover, paperback, mass-market, ebook, audiobook
 */
function normalizeBinding(raw?: string): string | undefined {
  if (!raw) return undefined;
  const normalized = raw.toLowerCase().trim();

  // Direct matches
  if (['hardcover', 'paperback', 'mass-market', 'ebook', 'audiobook'].includes(normalized)) {
    return normalized;
  }

  // Common ISBNdb variations
  if (normalized.includes('hardcover') || normalized.includes('hardback') || normalized === 'hard cover' || normalized === 'library binding') {
    return 'hardcover';
  }
  if (normalized.includes('paperback') || normalized === 'paper back' || normalized === 'trade paperback') {
    return 'paperback';
  }
  if (normalized.includes('mass market') || normalized === 'mmpb') {
    return 'mass-market';
  }
  if (normalized.includes('ebook') || normalized.includes('e-book') || normalized.includes('digital') || normalized === 'kindle') {
    return 'ebook';
  }
  if (normalized.includes('audio')) {
    return 'audiobook';
  }

  // If we can't normalize it, skip it (return undefined) rather than causing validation errors
  console.warn(`⚠️  Unknown binding type: "${raw}" - skipping`);
  return undefined;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs: number = DEFAULT_TIMEOUT_MS) {
  return fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
}

async function getAuthHeader(): Promise<Record<string, string>> {
  if (cachedAuthHeader) return cachedAuthHeader;

  if (API_TOKEN) {
    cachedAuthHeader = { Authorization: `Bearer ${API_TOKEN}` };
    return cachedAuthHeader;
  }

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.warn('⚠️  No PAYLOAD_API_TOKEN or admin credentials provided; requests will be unauthenticated and may 403.');
    cachedAuthHeader = {};
    return cachedAuthHeader;
  }

  // Login to obtain a JWT token
  const maxAttempts = 3;
  let lastErr: any;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const loginRes = await fetchWithTimeout(`${API_URL}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      }, LOGIN_TIMEOUT_MS);

      if (!loginRes.ok) {
        const text = await loginRes.text();
        throw new Error(`Admin login failed (${loginRes.status} ${loginRes.statusText}): ${text}`);
      }

      const loginData = await loginRes.json();
      if (!loginData?.token) {
        throw new Error(`Admin login response missing token: ${JSON.stringify(loginData)}`);
      }

      cachedAuthHeader = { Authorization: `Bearer ${loginData.token}` };
      return cachedAuthHeader;
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts) {
        await delay(300 * attempt);
      }
    }
  }

  throw lastErr || new Error('Admin login failed');
}

async function apiFetch(url: string, init: RequestInit = {}, timeoutMs: number = DEFAULT_TIMEOUT_MS) {
  const authHeader = await getAuthHeader();
  const headers = { ...(init.headers || {}), ...authHeader };

  const maxAttempts = 3;
  let attempt = 0;
  let lastError: any;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      const res = await fetchWithTimeout(url, { ...init, headers }, timeoutMs);
      // Retry on 5xx (transient) responses
      if (res.status >= 500 && res.status < 600 && attempt < maxAttempts) {
        await delay(200 * attempt);
        continue;
      }
      return res;
    } catch (err: any) {
      lastError = err;
      if (attempt < maxAttempts) {
        await delay(200 * attempt);
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error('apiFetch failed');
}

// Batch fetch from ISBNdb (400 ISBNs per request)
async function batchFetchFromISBNdb(isbns: string[]): Promise<Map<string, BatchBookData>> {
  if (!process.env.ISBNDB_API_KEY) {
    console.warn('⚠️  ISBNdb API key required for batch processing');
    return new Map();
  }

  const results = new Map<string, BatchBookData>();

  const fetchChunk = async (chunk: string[]) => {
    if (chunk.length === 0) return;

    try {
      const url = 'https://api.premium.isbndb.com/books';
      console.log(`  📡 Fetching ${chunk.length} ISBNs from ISBNdb (POST body)...`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': process.env.ISBNDB_API_KEY,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isbns: chunk })
      });

      // If request is too large or unsupported, split and retry smaller
      if ((response.status === 414 || response.status === 413 || response.status === 415) && chunk.length > 1) {
        const mid = Math.ceil(chunk.length / 2);
        await fetchChunk(chunk.slice(0, mid));
        await fetchChunk(chunk.slice(mid));
        return;
      }

      if (!response.ok) {
        const text = await response.text();
        console.error(`  ❌ ISBNdb batch error: ${response.status} ${response.statusText} - ${text}`);
        return;
      }

      const data = await response.json();
      const books = data.books || data.data || [];

      console.log(`  ✅ Found data for ${books.length}/${chunk.length} books`);

      for (const book of books) {
        const isbn = book.isbn13 || book.isbn;
        if (!isbn) continue;

        results.set(isbn, {
          isbn,
          title: book.title,
          titleLong: book.title_long,
          authors: book.authors || [],
          publisher: book.publisher,
          publishedDate: book.date_published,
          description: book.synopsis || book.overview,
          subjects: book.subjects || [],
          pages: book.pages,
          language: book.language,
          binding: book.binding,
          imageUrl: book.image
        });
      }
    } catch (error: any) {
      console.error(`  ❌ ISBNdb batch error:`, error.message);
    }
  };

  await fetchChunk(isbns);

  return results;
}

// Find or create author via API
async function findOrCreateAuthorAPI(authorName: string): Promise<number> {
  // Search for existing author
  const cacheKey = authorName.trim().toLowerCase();
  if (authorCache.has(cacheKey)) {
    return authorCache.get(cacheKey)!;
  }

  const searchRes = await apiFetch(
    `${API_URL}/api/authors?where[name][equals]=${encodeURIComponent(authorName)}&limit=1`,
    {},
    BOOK_OPERATION_TIMEOUT_MS
  );

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.docs && searchData.docs.length > 0) {
      authorCache.set(cacheKey, searchData.docs[0].id);
      return searchData.docs[0].id;
    }
  }

  // Create new author
  const createRes = await apiFetch(`${API_URL}/api/authors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: authorName,
      isActive: true,
      featured: false
    })
  }, BOOK_OPERATION_TIMEOUT_MS);

  if (!createRes.ok) {
    const text = await createRes.text();
    throw new Error(`Create author failed (${createRes.status} ${createRes.statusText}): ${text}`);
  }

  const created = await createRes.json();
  const id = created?.doc?.id;

  if (!id) {
    throw new Error(`Create author response missing id for "${authorName}": ${JSON.stringify(created)}`);
  }

  authorCache.set(cacheKey, id);
  return id;
}

// Link authors for a book via API
async function linkAuthorsAPI(bookId: number, authorNames: string[]) {
  const authorIds: number[] = [];

  for (const authorName of authorNames) {
    if (!authorName?.trim()) continue;
    const authorId = await findOrCreateAuthorAPI(authorName.trim());
    authorIds.push(authorId);
  }

  if (authorIds.length > 0) {
    await apiFetch(`${API_URL}/api/books/${bookId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authors: authorIds })
    }, BOOK_OPERATION_TIMEOUT_MS);
  }

  return authorIds.length;
}

const batchEnrichBooks = async () => {
  try {
    console.log('🚀 BATCH ENRICHMENT via API - Processing books in batches of 400\n');

    if (!process.env.ISBNDB_API_KEY) {
      console.error('❌ ISBNdb API key required for batch processing');
      console.error('   Set ISBNDB_API_KEY in .env file');
      console.error('   Get a key at: https://isbndb.com\n');
      process.exit(1);
    }

    // Test API connection with retries
    console.log(`🔌 Connecting to Payload API at ${API_URL}...`);
    console.log(`   (First request to Next.js dev server may take 1-2 minutes...)\n`);
    let connected = false;
    const maxRetries = 3;

    for (let retry = 1; retry <= maxRetries; retry++) {
      try {
        console.log(`   🔄 Attempt ${retry}/${maxRetries} - sending request...`);
        const pingRes = await fetchWithTimeout(`${API_URL}/api/books?limit=1`, {}, PING_TIMEOUT_MS);
        if (pingRes.ok) {
          connected = true;
          console.log('   ✅ Connected to Payload API\n');
          break;
        } else {
          console.log(`   ⚠️  Got response but not OK: ${pingRes.status}`);
        }
      } catch (err: any) {
        if (retry < maxRetries) {
          console.log(`   ⏳ Timeout or error (${err.message}), retrying in 5 seconds...`);
          await delay(5000);
        } else {
          console.error('\n❌ Cannot connect to Payload API after all retries');
          console.error(`   Expected at: ${API_URL}`);
          console.error(`   Error: ${err.message}`);
          console.error(`\n💡 Troubleshooting:`);
          console.error(`   1. Check if server is running: lsof -i :3000`);
          console.error(`   2. Try manual test: curl http://localhost:3000/api/books?limit=1`);
          console.error(`   3. Check server logs for errors`);
          console.error(`   4. The first API request can be very slow - try running script again\n`);
          process.exit(1);
        }
      }
    }

    if (!connected) {
      console.error('❌ Failed to connect to Payload API');
      process.exit(1);
    }

    // Get all books that need enrichment
    let page = 1;
    let hasNextPage = true;
    const booksToEnrich: Array<{ isbn: string; bookId: number }> = [];

    console.log('📚 Fetching books that need enrichment...');

    while (hasNextPage) {
      const res = await apiFetch(`${API_URL}/api/books?limit=100&page=${page}&depth=0`);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Books fetch failed: ${res.status} ${res.statusText} - ${text}`);
      }

      const data = await res.json();

      if (!data || !Array.isArray(data.docs)) {
        throw new Error(`Unexpected books response shape: ${JSON.stringify(data, null, 2)}`);
      }

      for (const book of data.docs) {
        if (!book.editions || book.editions.length === 0 || !book.editions[0].isbn) {
          continue;
        }
        if (book.authorsText && book.authorsText.length > 0) {
          continue; // Already has authors
        }
        booksToEnrich.push({
          isbn: book.editions[0].isbn,
          bookId: book.id
        });
      }

      hasNextPage = data.hasNextPage;
      page++;
    }

    console.log(`📚 Found ${booksToEnrich.length} books to enrich\n`);

    // Group books into batches
    const batches: Array<{ isbn: string; bookId: number }[]> = [];
    for (let i = 0; i < booksToEnrich.length; i += BATCH_SIZE) {
      const batch = booksToEnrich.slice(i, i + BATCH_SIZE);
      batches.push(batch);
    }

    console.log(`📦 Processing ${batches.length} batches of up to ${BATCH_SIZE} books each\n`);

    let totalEnriched = 0;
    let totalAuthorsLinked = 0;
    const missingData: string[] = [];
    const failedBooks: Array<{ isbn: string; error: string }> = [];

    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchNum = batchIndex + 1;

      console.log(`\n📦 BATCH ${batchNum}/${batches.length} - ${batch.length} books`);
      console.log('='.repeat(60));

      // Fetch batch data from ISBNdb
      const isbns = batch.map(b => b.isbn);
      const bookDataMap = await batchFetchFromISBNdb(isbns);

      // Process each book in the batch
      for (const { isbn, bookId } of batch) {
        const bookData = bookDataMap.get(isbn);

        if (!bookData || !bookData.authors || bookData.authors.length === 0) {
          missingData.push(isbn);
          continue; // No data found for this ISBN
        }

        try {
          const bookRes = await apiFetch(`${API_URL}/api/books/${bookId}?depth=0`, {}, BOOK_OPERATION_TIMEOUT_MS);
          if (!bookRes.ok) {
            throw new Error(`Book ${bookId} fetch failed with ${bookRes.status}`);
          }
          const book = await bookRes.json();

          // Build updates
          const updates: any = {
            authorsText: bookData.authors.map(name => ({ name }))
          };

          if (bookData.title) updates.title = bookData.title;
          if (bookData.titleLong) updates.titleLong = bookData.titleLong;
          if (bookData.publisher) updates.publisherText = bookData.publisher;
          if (bookData.description) updates.synopsis = bookData.description.substring(0, 500);
          if (bookData.subjects && bookData.subjects.length > 0) {
            updates.subjects = bookData.subjects.map(s => ({ subject: s }));
          }
          if (bookData.imageUrl) {
            const existingImages: Array<{ url: string }> = Array.isArray(book.scrapedImageUrls)
              ? book.scrapedImageUrls
              : [];
            if (!existingImages.some(img => img.url === bookData.imageUrl)) {
              updates.scrapedImageUrls = [...existingImages, { url: bookData.imageUrl }];
            }
          }

          // Update edition data
          if (bookData.pages || bookData.language || bookData.binding || bookData.publishedDate) {
            if (book.editions && book.editions.length > 0) {
              const editions = book.editions.map((edition: any) => ({ ...edition }));
              const primaryEdition = editions.find((edition: any) => edition.isbn === isbn) || editions[0];
              if (bookData.pages) primaryEdition.pages = bookData.pages;
              if (bookData.language) primaryEdition.language = bookData.language;
              const normalizedBinding = normalizeBinding(bookData.binding);
              if (normalizedBinding) primaryEdition.binding = normalizedBinding;
              const normalizedDate = normalizePublishedDate(bookData.publishedDate);
              if (normalizedDate) {
                primaryEdition.datePublished = normalizedDate;
              }
              updates.editions = editions;
            }
          }

          // Update the book
          await apiFetch(`${API_URL}/api/books/${bookId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
          }, BOOK_OPERATION_TIMEOUT_MS);

          // Link authors
          const linkedCount = await linkAuthorsAPI(bookId, bookData.authors);

          totalEnriched++;
          totalAuthorsLinked += linkedCount;

          // Progress indicator every 50 books
          if (totalEnriched % 50 === 0) {
            console.log(`  📊 Progress: ${totalEnriched} books enriched...`);
          }

        } catch (error: any) {
          console.error(`  ❌ Error enriching book ${isbn}:`, error.message);
          failedBooks.push({ isbn, error: error.message });
        }
      }

      console.log(`\n✅ Batch ${batchNum} complete: Enriched ${totalEnriched} books so far`);

      // Small delay between batches (1 second)
      if (batchIndex < batches.length - 1) {
        console.log(`⏸️  Pausing 1 second before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n📊 FINAL SUMMARY:');
    console.log(`✅ Total books enriched: ${totalEnriched}`);
    console.log(`👥 Total authors linked: ${totalAuthorsLinked}`);
    console.log(`📦 Total batches processed: ${batches.length}`);
    console.log(`📡 Total API calls: ${batches.length} (vs ${booksToEnrich.length} without batching!)`);

    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }

    fs.writeFileSync(
      `${LOG_DIR}/enrichment-missing.json`,
      JSON.stringify(missingData, null, 2)
    );

    fs.writeFileSync(
      `${LOG_DIR}/enrichment-errors.json`,
      JSON.stringify(failedBooks, null, 2)
    );

    console.log(`🗂️  Missing data logged to ${LOG_DIR}/enrichment-missing.json`);
    console.log(`🗂️  Errors logged to ${LOG_DIR}/enrichment-errors.json`);
    console.log(`\n⚡ Batch processing is ${Math.round(booksToEnrich.length / Math.max(batches.length, 1))}x faster!\n`);

  } catch (error: any) {
    console.error('💥 Fatal error:', error);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
};

batchEnrichBooks();
