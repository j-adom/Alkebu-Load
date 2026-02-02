/**
 * Simple export of globals using Payload
 * Run this BEFORE deleting the database
 */

import { config as dotenvConfig } from 'dotenv';
import { getPayload } from 'payload';
import config from '../src/payload.config';
import fs from 'fs';

// Load environment variables
dotenvConfig();

const OUTPUT_DIR = './globals-backup';

async function exportGlobals() {
  console.log('🔍 Initializing Payload with backup database...');

  // Temporarily point to backup database
  process.env.DATABASE_URI = 'file:./alkebulanimages.db.backup-full';

  // Ensure PAYLOAD_SECRET is set
  if (!process.env.PAYLOAD_SECRET) {
    console.error('❌ PAYLOAD_SECRET not found in .env file');
    process.exit(1);
  }

  const payload = await getPayload({ config });

  console.log('📦 Exporting globals...');

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Your globals from payload.config.ts
  const globals = ['home-page', 'about-page', 'contact-page', 'shop-page', 'site-settings'];

  for (const globalSlug of globals) {
    try {
      const data = await payload.findGlobal({
        slug: globalSlug,
      });

      const outputFile = `${OUTPUT_DIR}/${globalSlug}.json`;
      fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
      console.log(`✅ Exported ${globalSlug} → ${outputFile}`);
    } catch (error: any) {
      console.log(`⚠️  Skipping ${globalSlug}: ${error.message}`);
    }
  }

  console.log('');
  console.log('✅ Export complete! Files saved to:', OUTPUT_DIR);
  console.log('');
  console.log('Next steps:');
  console.log('1. Run: pnpm dev');
  console.log('2. Create admin user');
  console.log('3. Run: tsx scripts/import-globals.ts');

  process.exit(0);
}

exportGlobals().catch(console.error);
