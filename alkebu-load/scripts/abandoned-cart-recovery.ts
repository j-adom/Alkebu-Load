#!/usr/bin/env tsx

/**
 * Abandoned Cart Recovery Script
 *
 * Run this script via cron job to:
 * 1. Find carts abandoned for > 1 hour
 * 2. Send recovery emails to customers
 * 3. Clean up old abandoned carts
 *
 * Suggested cron schedule: every 30 minutes
 */

import { getPayload } from 'payload';
import config from '../src/payload.config.js';
import { cleanupAbandonedCarts } from '../src/app/utils/cartOperations.js';

async function runAbandonedCartRecovery() {
  try {
    console.log('Starting abandoned cart recovery process...');
    
    const payload = await getPayload({ config });
    
    // Run the cleanup process
    await cleanupAbandonedCarts(payload);
    
    console.log('Abandoned cart recovery process completed successfully');
    process.exit(0);
    
  } catch (error) {
    console.error('Error running abandoned cart recovery:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAbandonedCartRecovery();
}

export { runAbandonedCartRecovery };