#!/usr/bin/env tsx

/**
 * Migration script to prepare existing data for new e-commerce collections
 * Run with: tsx scripts/migrate-to-ecommerce.ts
 */

import dotenv from 'dotenv';
import { getPayload } from 'payload';
import config from '../src/payload.config';

// Load environment variables
dotenv.config();

async function migrateToEcommerce() {
  console.log('🚀 Starting e-commerce migration...');
  
  try {
    const payload = await getPayload({ config });

    // 1. Add pricing to existing books that don't have it
    console.log('📚 Adding default pricing to books...');
    const books = await payload.find({
      collection: 'books',
      where: {
        'pricing.retailPrice': { exists: false },
      },
      limit: 1000,
    });

    let booksUpdated = 0;
    for (const book of books.docs) {
      try {
        await payload.update({
          collection: 'books',
          id: book.id,
          data: {
            pricing: {
              retailPrice: 1999, // Default $19.99
              taxCode: 'books_tax_free',
              requiresShipping: true,
              shippingWeight: 8, // 8 oz average book weight
            },
            inventory: {
              trackQuantity: true,
              stockLevel: 0,
              lowStockThreshold: 5,
              allowBackorders: false,
              location: 'main_store',
              isConsignment: false,
              dateAdded: new Date().toISOString(),
            },
          },
        });
        booksUpdated++;
      } catch (error) {
        console.error(`Error updating book ${book.id}:`, error);
      }
    }
    console.log(`✅ Updated ${booksUpdated} books with pricing and inventory fields`);

    // 2. Add pricing to other product collections
    const productCollections = ['wellness-lifestyle', 'fashion-jewelry', 'oils-incense'];
    
    for (const collection of productCollections) {
      console.log(`🛍️ Adding default pricing to ${collection}...`);
      
      const products = await payload.find({
        collection: collection as any,
        limit: 1000,
      });

      let productsUpdated = 0;
      for (const product of products.docs) {
        try {
          // Check if product already has pricing
          if (!product.pricing?.retailPrice) {
            await payload.update({
              collection: collection as any,
              id: product.id,
              data: {
                pricing: {
                  retailPrice: 2999, // Default $29.99 for non-book items
                  taxCode: 'taxable',
                  requiresShipping: true,
                  shippingWeight: 4, // 4 oz default
                },
                inventory: {
                  trackQuantity: true,
                  stockLevel: 0,
                  lowStockThreshold: 3,
                  allowBackorders: false,
                  location: 'main_store',
                  isConsignment: false,
                  dateAdded: new Date().toISOString(),
                },
              },
            });
            productsUpdated++;
          }
        } catch (error) {
          console.error(`Error updating ${collection} ${product.id}:`, error);
        }
      }
      console.log(`✅ Updated ${productsUpdated} ${collection} items with pricing`);
    }

    // 3. Create sample test data for development
    console.log('🧪 Creating sample test data...');
    
    // Create a test customer
    try {
      const testCustomer = await payload.create({
        collection: 'customers',
        data: {
          email: 'test@alkebulanimages.com',
          password: 'testpassword123',
          firstName: 'Test',
          lastName: 'Customer',
          shippingAddresses: [{
            label: 'Home',
            isDefault: true,
            firstName: 'Test',
            lastName: 'Customer',
            street: '123 Music City Blvd',
            city: 'Nashville',
            state: 'TN',
            zip: '37203',
            country: 'US',
            phone: '615-555-0123',
          }],
          preferences: {
            marketingEmails: true,
            newsletterSubscribed: true,
          },
          accountStatus: {
            isActive: true,
            taxExempt: false,
          },
        },
      });
      console.log(`✅ Created test customer: ${testCustomer.email}`);
    } catch (error) {
      console.log('ℹ️ Test customer may already exist, skipping...');
    }

    // 4. Create sample institutional account
    try {
      const testInstitution = await payload.create({
        collection: 'institutional-accounts',
        data: {
          organizationName: 'Nashville Public Library',
          type: 'library',
          status: 'active',
          contactInfo: {
            primaryContact: {
              firstName: 'Library',
              lastName: 'Director',
              title: 'Director',
              email: 'director@library.nashville.gov',
              phone: '615-862-5800',
            },
          },
          addresses: {
            billing: {
              street: '615 Church St',
              city: 'Nashville',
              state: 'TN',
              zip: '37219',
              country: 'US',
            },
          },
          taxInfo: {
            taxExempt: true,
            taxExemptNumber: 'TN-EXEMPT-12345',
          },
          paymentTerms: {
            preferredMethod: 'net_terms',
            netTerms: 30,
            creditLimit: 500000, // $5,000 credit limit
          },
          discounting: {
            discountTier: 'educational_15',
            minimumOrderForDiscount: 10000, // $100 minimum
          },
          verification: {
            verificationStatus: 'verified',
            verifiedAt: new Date().toISOString(),
          },
        },
      });
      console.log(`✅ Created test institutional account: ${testInstitution.organizationName}`);
    } catch (error) {
      console.log('ℹ️ Test institutional account may already exist, skipping...');
    }

    console.log('🎉 E-commerce migration completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Update product pricing in admin panel');
    console.log('2. Configure Stripe API keys in .env');
    console.log('3. Test cart operations with: tsx scripts/test-checkout-flow.ts');
    console.log('4. Run search reindex: tsx scripts/initialize-search.ts');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

migrateToEcommerce();