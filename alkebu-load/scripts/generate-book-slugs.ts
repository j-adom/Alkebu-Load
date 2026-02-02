import { config as dotenvConfig } from 'dotenv';

// Load environment variables
dotenvConfig({ path: './.env' });

/**
 * Generate slugs for all books in the database
 * This is a one-time migration script to add slugs to existing books
 */

const API_URL = process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.PAYLOAD_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PAYLOAD_ADMIN_PASSWORD;

interface Book {
  id: number;
  title: string;
  slug?: string;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

async function login(): Promise<string> {
  const loginRes = await fetch(`${API_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  });

  if (!loginRes.ok) {
    throw new Error(`Login failed: ${loginRes.status} ${loginRes.statusText}`);
  }

  const loginData = await loginRes.json();
  return loginData.token;
}

async function main() {
  console.log('🔧 Generating slugs for all books...\n');

  // Login to get auth token
  const token = await login();
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // Fetch all books
  let page = 1;
  let hasNextPage = true;
  let totalProcessed = 0;
  let totalUpdated = 0;

  while (hasNextPage) {
    const booksRes = await fetch(`${API_URL}/api/books?page=${page}&limit=100&depth=0`, { headers });

    if (!booksRes.ok) {
      throw new Error(`Failed to fetch books: ${booksRes.status}`);
    }

    const booksData = await booksRes.json();
    const books: Book[] = booksData.docs;
    hasNextPage = booksData.hasNextPage;

    console.log(`📄 Page ${page}: Processing ${books.length} books...`);

    for (const book of books) {
      totalProcessed++;

      // Skip if book already has a slug
      if (book.slug) {
        continue;
      }

      // Generate slug from title
      const slug = generateSlug(book.title);

      // Update book with slug
      const updateRes = await fetch(`${API_URL}/api/books/${book.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ slug })
      });

      if (!updateRes.ok) {
        console.error(`   ❌ Failed to update book ${book.id}: ${book.title}`);
        continue;
      }

      totalUpdated++;
      if (totalUpdated % 50 === 0) {
        console.log(`   ✅ Updated ${totalUpdated} books so far...`);
      }
    }

    page++;
  }

  console.log(`\n✅ Done! Processed ${totalProcessed} books, updated ${totalUpdated} books with slugs.`);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
