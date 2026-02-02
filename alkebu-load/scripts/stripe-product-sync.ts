#!/usr/bin/env tsx

/**
 * Sync products with Stripe for payment processing
 * Run with: tsx scripts/stripe-product-sync.ts
 */

import { getPayload } from 'payload';
import config from '../src/payload.config';

async function syncProductsWithStripe() {
  console.log('💳 Starting Stripe product sync...');
  
  try {
    const payload = await getPayload({ config });

    // Note: This is a mock implementation since Stripe SDK isn't installed yet
    // In production, you would install stripe: npm install stripe
    // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    const collections = ['books', 'wellness-lifestyle', 'fashion-jewelry', 'oils-incense'];
    let totalSynced = 0;

    for (const collectionSlug of collections) {
      console.log(`\n📦 Syncing ${collectionSlug} products...`);
      
      const products = await payload.find({
        collection: collectionSlug as any,
        where: {
          stripePriceId: { exists: false },
        },
        limit: 100,
      });

      console.log(`Found ${products.docs.length} products without Stripe price IDs`);

      for (const product of products.docs) {
        try {
          // Mock Stripe product creation
          const mockStripeProduct = {
            id: `prod_mock_${product.id}`,
            name: product.title,
            description: product.description?.slice(0, 500) || '',
            metadata: {
              payloadId: product.id,
              collection: collectionSlug,
            },
          };

          // Mock Stripe price creation
          const mockStripePrice = {
            id: `price_mock_${product.id}`,
            product: mockStripeProduct.id,
            unit_amount: product.pricing?.retailPrice || 1999,
            currency: 'usd',
            metadata: {
              payloadId: product.id,
              collection: collectionSlug,
            },
          };

          // In production, this would be:
          // const stripeProduct = await stripe.products.create({
          //   name: product.title,
          //   description: product.description?.slice(0, 500) || '',
          //   metadata: {
          //     payloadId: product.id,
          //     collection: collectionSlug,
          //   },
          // });
          //
          // const stripePrice = await stripe.prices.create({
          //   product: stripeProduct.id,
          //   unit_amount: product.pricing?.retailPrice || 1999,
          //   currency: 'usd',
          //   metadata: {
          //     payloadId: product.id,
          //     collection: collectionSlug,
          //   },
          // });

          // Update product with Stripe price ID
          await payload.update({
            collection: collectionSlug as any,
            id: product.id,
            data: {
              stripePriceId: mockStripePrice.id,
            },
          });

          console.log(`✅ Synced: ${product.title} -> ${mockStripePrice.id}`);
          totalSynced++;

        } catch (error) {
          console.error(`❌ Failed to sync ${product.title}: ${error.message}`);
        }
      }
    }

    console.log(`\n🎉 Stripe sync completed! Synced ${totalSynced} products.`);
    
    console.log('\n📋 Production setup notes:');
    console.log('1. Install Stripe SDK: pnpm add stripe');
    console.log('2. Replace mock calls with real Stripe API calls');
    console.log('3. Configure webhook endpoints in Stripe dashboard');
    console.log('4. Test with Stripe test mode before going live');

  } catch (error) {
    console.error('❌ Stripe sync failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

syncProductsWithStripe();