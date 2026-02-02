/**
 * Drop users table and related tables to allow clean migration
 * This preserves all other data (globals, products, etc.)
 */

import { getPayload } from 'payload';
import config from '../src/payload.config';

async function dropUsersTables() {
  console.log('Connecting to database...');
  const payload = await getPayload({ config });

  console.log('Dropping users-related tables...');

  try {
    // @ts-ignore - accessing internal db connection
    const db = payload.db.drizzle;

    // Drop tables in reverse order of dependencies
    await db.run({ sql: 'DROP TABLE IF EXISTS users_rels;' });
    await db.run({ sql: 'DROP TABLE IF EXISTS users_sessions;' });
    await db.run({ sql: 'DROP TABLE IF EXISTS users_preferences_favorite_categories;' });
    await db.run({ sql: 'DROP TABLE IF EXISTS users_shipping_addresses;' });
    await db.run({ sql: 'DROP TABLE IF EXISTS users;' });

    console.log('✅ Users tables dropped successfully');
    console.log('You can now run: pnpm dev');
    console.log('The migration will create fresh users tables with the correct schema.');
  } catch (error) {
    console.error('Error dropping tables:', error);
  }

  process.exit(0);
}

dropUsersTables();
