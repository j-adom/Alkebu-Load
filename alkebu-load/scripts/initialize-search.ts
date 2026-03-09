#!/usr/bin/env tsx

/**
 * Search Index Initialization Script
 * 
 * This script initializes the FlexSearch indices with existing data from the database.
 * Run this script after setting up the new collections to populate the search indices.
 * 
 * Usage: tsx scripts/initialize-search.ts
 */

import { getPayload } from 'payload';
import config from '../src/payload.config';
import { searchEngine } from '../src/app/utils/searchEngine';

async function initializeSearchIndices() {
  console.log('🔍 Initializing search indices...');
  
  try {
    // Get payload instance
    const payload = await getPayload({ config });
    console.log('✅ Connected to Payload CMS');

    // Initialize search engine with existing data
    await searchEngine.initializeWithData(payload);
    console.log('✅ Search indices initialized with existing data');

    // Get collection counts for reporting
    const stats = await getCollectionStats(payload);
    console.log('\n📊 Search Index Statistics:');
    Object.entries(stats).forEach(([collection, count]) => {
      console.log(`   ${collection}: ${count} documents indexed`);
    });

    // Test search functionality
    console.log('\n🧪 Testing search functionality...');
    await testSearchFunctionality();

    console.log('\n🎉 Search initialization completed successfully!');
    console.log('\n💡 You can now use the search API at /api/search');
    console.log('💡 External book search is available at /api/external-books');
    console.log('💡 Quote requests can be made at /api/quote-request');

  } catch (error) {
    console.error('❌ Error initializing search indices:', error);
    process.exit(1);
  }
}

async function getCollectionStats(payload: any): Promise<Record<string, number>> {
  const collections = [
    'books',
    'blogPosts',
    'events', 
    'businesses',
    'wellnessLifestyle',
    'fashionJewelry',
    'oilsIncense'
  ];

  const stats: Record<string, number> = {};

  for (const collection of collections) {
    try {
      const result = await payload.find({
        collection,
        limit: 0 // Just get count
      });
      stats[collection] = result.totalDocs;
    } catch (error) {
      console.warn(
        `⚠️  Could not get stats for ${collection}:`,
        error instanceof Error ? error.message : 'Unknown error',
      );
      stats[collection] = 0;
    }
  }

  return stats;
}

async function testSearchFunctionality() {
  const testQueries = [
    'book',
    'wellness',
    'african',
    'history'
  ];

  for (const query of testQueries) {
    try {
      const results = await searchEngine.search(query, { limit: 5 });
      console.log(`   "${query}": ${results.totalResults} results (${results.searchTime}ms)`);
      
      if (results.internal.length > 0) {
        console.log(`     Sample: "${results.internal[0].title}" (${results.internal[0].type})`);
      }
    } catch (error) {
      console.warn(
        `   ⚠️  Test search failed for "${query}":`,
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }
}

async function createSampleData(payload: any) {
  console.log('📝 Creating sample data for testing...');

  try {
    // Create sample blog post
    const sampleBlogPost = await payload.create({
      collection: 'blogPosts',
      data: {
        title: 'Welcome to Alkebulanimages 2.0',
        slug: 'welcome-to-alkebulanimages-2-0',
        excerpt: 'Discover our new digital platform featuring books, events, and community connections.',
        content: 'We are excited to launch our new digital platform that connects our community through books, events, and local business directory.',
        author: null, // Will need to be linked to a user
        guestAuthor: 'Alkebulanimages Team',
        category: 'store-news',
        tags: [
          { tag: 'announcement' },
          { tag: 'platform' },
          { tag: 'community' }
        ],
        status: 'published',
        publishDate: new Date().toISOString(),
        featured: true,
        allowComments: true,
        seo: {
          title: 'Welcome to Alkebulanimages 2.0 - Your Community Bookstore',
          description: 'Discover our new digital platform featuring books, events, and community connections in Nashville.',
          keywords: 'bookstore, Nashville, Black books, community, events'
        }
      }
    });

    console.log(`   ✅ Created sample blog post: ${sampleBlogPost.id}`);

    // Create sample event
    const sampleEvent = await payload.create({
      collection: 'events',
      data: {
        title: 'Monthly Book Club: African American Literature',
        slug: 'monthly-book-club-african-american-literature',
        description: 'Join us for our monthly book club discussion featuring contemporary African American authors.',
        shortDescription: 'Monthly book club discussion featuring contemporary African American authors.',
        eventType: 'book-club',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Next week
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), // 2 hours later
        venue: {
          name: 'Alkebulanimages Bookstore',
          address: '123 Music Row\nNashville, TN 37203',
          isVirtual: false,
          accessInstructions: 'Enter through the main entrance. We will be in the reading area.'
        },
        registrationRequired: true,
        registrationDetails: {
          maxAttendees: 15,
          registrationDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          price: 0,
          paymentRequired: false,
          registrationInstructions: 'Email us at events@alkebulanimages.com to register'
        },
        organizer: null, // Will need to be linked to a user
        guestOrganizer: 'Sarah Johnson',
        categories: ['literature-reading', 'community-building'],
        tags: [
          { tag: 'book-club' },
          { tag: 'literature' },
          { tag: 'discussion' }
        ],
        status: 'published',
        featured: true,
        allowComments: true,
        seo: {
          title: 'Monthly Book Club - African American Literature Discussion',
          description: 'Join our monthly book club for engaging discussions about contemporary African American literature.',
          keywords: 'book club, African American literature, Nashville, community event'
        }
      }
    });

    console.log(`   ✅ Created sample event: ${sampleEvent.id}`);

    // Create sample business
    const sampleBusiness = await payload.create({
      collection: 'businesses',
      data: {
        name: 'Soul Food Kitchen Nashville',
        slug: 'soul-food-kitchen-nashville',
        description: 'Authentic Southern soul food restaurant serving the Nashville community for over 20 years.',
        shortDescription: 'Authentic Southern soul food restaurant with traditional recipes and warm hospitality.',
        category: 'restaurants-food',
        subcategories: [
          { subcategory: 'Soul Food' },
          { subcategory: 'Southern Cuisine' }
        ],
        contact: {
          phone: '(615) 555-0123',
          email: 'info@soulfoodkitchennashville.com',
          website: 'https://soulfoodkitchennashville.com',
          socialMedia: {
            facebook: 'https://facebook.com/soulfoodkitchennashville',
            instagram: '@soulfoodkitchennashville'
          }
        },
        address: {
          street: '456 Jefferson Street',
          city: 'Nashville',
          state: 'TN',
          zipCode: '37208',
          neighborhood: 'Jefferson Street'
        },
        hours: {
          monday: '11:00 AM - 9:00 PM',
          tuesday: '11:00 AM - 9:00 PM',
          wednesday: '11:00 AM - 9:00 PM',
          thursday: '11:00 AM - 9:00 PM',
          friday: '11:00 AM - 10:00 PM',
          saturday: '11:00 AM - 10:00 PM',
          sunday: '12:00 PM - 8:00 PM'
        },
        services: [
          { service: 'Dine-in' },
          { service: 'Takeout' },
          { service: 'Catering' }
        ],
        specialties: [
          { specialty: 'Fried Chicken' },
          { specialty: 'Mac and Cheese' },
          { specialty: 'Collard Greens' },
          { specialty: 'Cornbread' }
        ],
        priceRange: 'moderate',
        owner: {
          name: 'Mary Johnson',
          bio: 'Chef Mary has been perfecting her family recipes for over 30 years, bringing authentic Southern flavors to Nashville.'
        },
        tags: [
          { tag: 'family-owned' },
          { tag: 'traditional-recipes' },
          { tag: 'community-favorite' }
        ],
        status: 'published',
        featured: true,
        verified: true,
        submissionDate: new Date().toISOString(),
        allowComments: true,
        seo: {
          title: 'Soul Food Kitchen Nashville - Authentic Southern Cuisine',
          description: 'Experience authentic Southern soul food in Nashville with traditional recipes and warm hospitality.',
          keywords: 'soul food, Nashville restaurant, Southern cuisine, fried chicken, family owned'
        }
      }
    });

    console.log(`   ✅ Created sample business: ${sampleBusiness.id}`);

    console.log('✅ Sample data created successfully');

  } catch (error) {
    console.warn(
      '⚠️  Error creating sample data:',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}

async function setupEnvironmentCheck() {
  console.log('🔧 Checking environment configuration...');

  const requiredEnvVars = [
    'PAYLOAD_SECRET',
    'DATABASE_URI'
  ];

  const optionalEnvVars = [
    'ISBNDB_API_KEY',
    'GOOGLE_BOOKS_API_KEY'
  ];

  let missingRequired = 0;
  let missingOptional = 0;

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`   ❌ Missing required environment variable: ${envVar}`);
      missingRequired++;
    } else {
      console.log(`   ✅ ${envVar} is configured`);
    }
  }

  for (const envVar of optionalEnvVars) {
    if (!process.env[envVar]) {
      console.warn(`   ⚠️  Missing optional environment variable: ${envVar}`);
      missingOptional++;
    } else {
      console.log(`   ✅ ${envVar} is configured`);
    }
  }

  if (missingRequired > 0) {
    console.error(`\n❌ ${missingRequired} required environment variables are missing`);
    console.error('Please set up your .env file before running this script');
    return false;
  }

  if (missingOptional > 0) {
    console.warn(`\n⚠️  ${missingOptional} optional environment variables are missing`);
    console.warn('External book search features may not work properly');
  }

  console.log('✅ Environment configuration check passed');
  return true;
}

// Main execution
async function main() {
  console.log('🚀 Alkebulanimages 2.0 - Search Initialization');
  console.log('================================================\n');

  // Check environment
  const envOk = await setupEnvironmentCheck();
  if (!envOk) {
    process.exit(1);
  }

  console.log('');

  // Initialize search
  await initializeSearchIndices();

  // Optionally create sample data
  const createSamples = process.argv.includes('--sample-data');
  if (createSamples) {
    console.log('\n📝 Creating sample data...');
    const payload = await getPayload({ config });
    await createSampleData(payload);
  }

  console.log('\n🎯 Next Steps:');
  console.log('   1. Start the development server: pnpm dev');
  console.log('   2. Test search at: http://localhost:3000/api/search?q=test');
  console.log('   3. Access admin panel: http://localhost:3000/admin');
  console.log('   4. Review collections and add more content');

  if (!process.env.ISBNDB_API_KEY) {
    console.log('\n💡 Pro Tip: Get an ISBNdb API key for enhanced external book searches');
    console.log('   Visit: https://isbndb.com/api');
  }

  process.exit(0);
}

// Handle errors gracefully
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Run the script
main();
