/**
 * Drop users table and related tables to allow clean migration
 * Uses direct database access without initializing Payload
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

const dbPath = path.join(process.cwd(), 'alkebulanimages.db');

if (!fs.existsSync(dbPath)) {
  console.error(`Database not found at: ${dbPath}`);
  process.exit(1);
}

console.log(`Opening database: ${dbPath}`);
const db = new Database(dbPath);

console.log('Dropping users-related tables...');

try {
  // Drop tables in reverse order of dependencies
  db.exec('DROP TABLE IF EXISTS users_rels;');
  db.exec('DROP TABLE IF EXISTS users_sessions;');
  db.exec('DROP TABLE IF EXISTS users_preferences_favorite_categories;');
  db.exec('DROP TABLE IF EXISTS users_shipping_addresses;');
  db.exec('DROP TABLE IF EXISTS users;');

  console.log('✅ Users tables dropped successfully!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Run: pnpm dev');
  console.log('2. The migration will create fresh users tables');
  console.log('3. Create a new admin user at http://localhost:3000/admin');
} catch (error) {
  console.error('Error dropping tables:', error);
  process.exit(1);
} finally {
  db.close();
}
