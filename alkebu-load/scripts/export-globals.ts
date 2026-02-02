/**
 * Export globals data from backup database
 * This extracts all your globals (HomePage, SiteSettings, etc.) to JSON files
 */

import { LibSQLDatabase } from '@payloadcms/db-sqlite';
import fs from 'fs';
import path from 'path';

const BACKUP_DB = 'alkebulanimages.db.backup-full';
const OUTPUT_DIR = './globals-backup';

async function exportGlobals() {
  console.log('🔍 Connecting to backup database...');

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Use LibSQL to connect to the backup
  const { drizzle } = await import('drizzle-orm/libsql');
  const { createClient } = await import('@libsql/client');

  const client = createClient({ url: `file:./${BACKUP_DB}` });
  const db = drizzle(client);

  console.log('📦 Exporting globals...');

  try {
    // Get list of all tables
    const tables = await db.all(`
      SELECT name FROM sqlite_master
      WHERE type='table'
      AND name NOT LIKE 'sqlite_%'
      AND name NOT LIKE '%_rels'
      AND name NOT LIKE '%_locales'
      ORDER BY name
    `);

    console.log('Tables found:', tables.map((t: any) => t.name).join(', '));

    // Export each global table (globals usually don't have _id suffix)
    const globalTables = ['home_page', 'site_settings', 'header', 'footer'];

    for (const tableName of globalTables) {
      try {
        const data = await db.all(`SELECT * FROM ${tableName}`);

        if (data && data.length > 0) {
          const outputFile = path.join(OUTPUT_DIR, `${tableName}.json`);
          fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
          console.log(`✅ Exported ${tableName}: ${data.length} records → ${outputFile}`);
        } else {
          console.log(`⚠️  ${tableName}: No data found`);
        }
      } catch (error: any) {
        if (error.message?.includes('no such table')) {
          console.log(`⏭️  Skipping ${tableName} (table doesn't exist)`);
        } else {
          console.error(`❌ Error exporting ${tableName}:`, error.message);
        }
      }
    }

    console.log('');
    console.log('✅ Export complete! Files saved to:', OUTPUT_DIR);
    console.log('');
    console.log('Next steps:');
    console.log('1. Run: pnpm dev');
    console.log('2. Create admin user');
    console.log('3. Run: tsx scripts/import-globals.ts');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

exportGlobals();
