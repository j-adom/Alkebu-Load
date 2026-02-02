/**
 * Drop users tables using Drizzle (Payload's ORM)
 */

import { drizzle } from 'drizzle-orm/better-sqlite3';
import { sql } from 'drizzle-orm';
import Database from '@libsql/client';

const dbPath = 'file:./alkebulanimages.db';

console.log(`Opening database: ${dbPath}`);

// Create libsql client
const client = Database.createClient({ url: dbPath });
const db = drizzle(client as any);

console.log('Dropping users-related tables...');

async function dropTables() {
  try {
    await db.run(sql`DROP TABLE IF EXISTS users_rels`);
    await db.run(sql`DROP TABLE IF EXISTS users_sessions`);
    await db.run(sql`DROP TABLE IF EXISTS users_preferences_favorite_categories`);
    await db.run(sql`DROP TABLE IF EXISTS users_shipping_addresses`);
    await db.run(sql`DROP TABLE IF EXISTS users`);

    console.log('✅ Users tables dropped successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Run: pnpm dev');
    console.log('2. The migration will create fresh users tables');
    console.log('3. Create a new admin user at http://localhost:3000/admin');
  } catch (error) {
    console.error('Error dropping tables:', error);
    process.exit(1);
  }
}

dropTables();
