import { getPayload } from 'payload'
import Papa from 'papaparse'
import fs from 'fs'
import { config as dotenvConfig } from 'dotenv'

// Load environment variables
dotenvConfig({ path: './.env' })

// Debug: Check if secret is loaded
console.log('PAYLOAD_SECRET loaded:', !!process.env.PAYLOAD_SECRET)
console.log('First 10 chars:', process.env.PAYLOAD_SECRET?.substring(0, 10))

// Helper function to convert HTML to Lexical format
const htmlToLexical = (htmlString: string) => {
  if (!htmlString) return undefined;
  
  // Simple conversion - replace <br/> with line breaks and wrap in paragraphs
  const cleanText = htmlString
    .replace(/<br\s*\/?>/gi, '\n')  // Replace <br> with newlines
    .replace(/<[^>]*>/g, '')        // Strip other HTML tags
    .trim();
  
  if (!cleanText) return undefined;
  
  // Split by double newlines to create paragraphs
  const paragraphs = cleanText.split('\n\n').filter(p => p.trim());
  
  return {
    root: {
      children: paragraphs.map(paragraph => ({
        children: [
          {
            detail: 0,
            format: 0,
            mode: "normal",
            style: "",
            text: paragraph.trim(),
            type: "text",
            version: 1
          }
        ],
        direction: "ltr",
        format: "",
        indent: 0,
        type: "paragraph",
        version: 1
      })),
      direction: "ltr",
      format: "",
      indent: 0,
      type: "root",
      version: 1
    }
  };
};
const mapCategoriesToPayload = (scrapedCategories: string[], scrapedSubjects: string[]): string[] => {
  const categories = [];
  const combined = [...scrapedCategories, ...scrapedSubjects].map(c => c.toLowerCase());
  
  // History
  if (combined.some(c => 
    c.includes('history') || 
    c.includes('historical') || 
    c.includes('civil rights') ||
    c.includes('race relations')
  )) {
    categories.push('history');
  }
  
  // Biography & Autobiography
  if (combined.some(c => 
    c.includes('biography') || 
    c.includes('biographies') || 
    c.includes('memoir') ||
    c.includes('autobiography')
  )) {
    categories.push('biography-autobiography');
  }
  
  // Literature & Fiction
  if (combined.some(c => 
    c.includes('fiction') || 
    c.includes('literature') || 
    c.includes('novel') ||
    c.includes('poetry') ||
    c.includes('drama')
  )) {
    categories.push('literature-fiction');
  }
  
  // Religion & Spirituality
  if (combined.some(c => 
    c.includes('religion') || 
    c.includes('spiritual') || 
    c.includes('theology') ||
    c.includes('faith') ||
    c.includes('christianity') ||
    c.includes('islam') ||
    c.includes('buddhism')
  )) {
    categories.push('religion-spirituality');
  }
  
  // Politics & Social Science
  if (combined.some(c => 
    c.includes('politics') || 
    c.includes('political') ||
    c.includes('social') || 
    c.includes('sociology') ||
    c.includes('activism') ||
    c.includes('government')
  )) {
    categories.push('politics-social-science');
  }
  
  // Children & Young Adult
  if (combined.some(c => 
    c.includes('children') || 
    c.includes('young adult') || 
    c.includes('juvenile') ||
    c.includes('kids') ||
    c.includes('teen')
  )) {
    categories.push('children-young-adult');
  }
  
  // Arts & Culture
  if (combined.some(c => 
    c.includes('art') || 
    c.includes('culture') || 
    c.includes('music') ||
    c.includes('photography') ||
    c.includes('film') ||
    c.includes('dance')
  )) {
    categories.push('arts-culture');
  }
  
  // Education & Academia
  if (combined.some(c => 
    c.includes('education') || 
    c.includes('academic') || 
    c.includes('reference') ||
    c.includes('textbook') ||
    c.includes('study') ||
    c.includes('learning')
  )) {
    categories.push('education-academia');
  }
  
  // Business & Economics
  if (combined.some(c => 
    c.includes('business') || 
    c.includes('economic') || 
    c.includes('entrepreneur') ||
    c.includes('leadership') ||
    c.includes('management') ||
    c.includes('finance') ||
    c.includes('marketing')
  )) {
    categories.push('business-economics');
  }
  
  // Health & Wellness
  if (combined.some(c => 
    c.includes('health') || 
    c.includes('wellness') || 
    c.includes('medical') ||
    c.includes('fitness') ||
    c.includes('nutrition') ||
    c.includes('psychology') ||
    c.includes('self-help')
  )) {
    categories.push('health-wellness');
  }
  
  return [...new Set(categories)]; // Remove duplicates
};

// Auto-assign collections based on content
const mapToCollections = (title: string, authors: string[], subjects: string[], description?: string): string[] => {
  const collections = [];
  const content = [title, ...authors, ...subjects, description || ''].join(' ').toLowerCase();
  
  // Civil Rights Movement
  if (content.includes('civil rights') || 
      content.includes('race relations') || 
      content.includes('reparations') ||
      content.includes('barack obama') ||
      content.includes('discrimination')) {
    collections.push('civil-rights-movement');
  }
  
  // African Diaspora
  if (content.includes('diaspora') || 
      content.includes('caribbean') ||
      content.includes('haiti') ||
      content.includes('jamaica') ||
      content.includes('migration')) {
    collections.push('african-diaspora');
  }
  
  // Pan-Africanism
  if (content.includes('pan-african') || 
      content.includes('marcus garvey') ||
      content.includes('kwame nkrumah') ||
      content.includes('unity') && content.includes('africa')) {
    collections.push('pan-africanism');
  }
  
  // Black Business Leaders
  if (content.includes('business') && 
      (content.includes('entrepreneur') || 
       content.includes('ceo') ||
       content.includes('leadership') ||
       content.includes('founder'))) {
    collections.push('black-business-leaders');
  }
  
  // Essential Black History
  if (content.includes('slavery') || 
      content.includes('emancipation') ||
      content.includes('reconstruction') ||
      content.includes('jim crow') ||
      content.includes('harlem renaissance') ||
      content.includes('black history')) {
    collections.push('essential-black-history');
  }
  
  // Contemporary Black Voices
  if (content.includes('contemporary') ||
      content.includes('modern') ||
      content.includes('current') ||
      content.includes('obama') ||
      content.includes('present day')) {
    collections.push('contemporary-black-voices');
  }
  
  // Spirituality & Consciousness
  if (content.includes('spiritual') || 
      content.includes('consciousness') ||
      content.includes('meditation') ||
      content.includes('awakening') ||
      content.includes('wisdom')) {
    collections.push('spirituality-consciousness');
  }
  
  return collections;
};

// CSV row interface
interface CsvBookRow {
  ISBN?: number | string;
  Sales?: number;
  Stores?: number;
  Title?: string;
  Authors?: string;
  Publisher?: string;
  Categories?: string;
  Description?: string;
  Binding?: string;
  Subjects?: string;
}

// Transform CSV data to PayloadCMS format
const transformCsvToPayload = (csvRow: CsvBookRow) => {
  // Parse authors (single author in your CSV)
  const authors = csvRow.Authors ? [{ name: csvRow.Authors.trim() }] : [];
  
  // Parse categories and subjects
  const rawCategories = (csvRow.Categories || '').split(',').map(cat => ({ category: cat.trim() })).filter(c => c.category);
  const subjects = (csvRow.Subjects || '').split(',').map(subj => ({ subject: subj.trim() })).filter(s => s.subject);
  
  // Auto-categorize
  const categoryStrings = rawCategories.map(rc => rc.category);
  const subjectStrings = subjects.map(s => s.subject);
  const categories = mapCategoriesToPayload(categoryStrings, subjectStrings);
  
  // Auto-assign to collections
  const collections = mapToCollections(
    csvRow.Title || '',
    authors.map(a => a.name),
    subjectStrings,
    csvRow.Description
  ).map(collectionName => ({ collectionName: collectionName as any })); // Type assertion for collection names
  
  // Create edition with better binding validation
  let binding = 'paperback'; // default
  if (csvRow.Binding) {
    const cleanBinding = csvRow.Binding.toLowerCase().trim();
    // Map common binding types to valid values
    if (cleanBinding.includes('hardcover') || cleanBinding.includes('hard')) {
      binding = 'hardcover';
    } else if (cleanBinding.includes('paperback') || cleanBinding.includes('paper')) {
      binding = 'paperback';
    } else if (cleanBinding.includes('board')) {
      binding = 'paperback'; // Map board book to paperback for now
    } else if (cleanBinding.includes('mass')) {
      binding = 'mass-market';
    } else {
      binding = 'paperback'; // Default fallback
    }
  }
  
  const edition = {
    isbn: csvRow.ISBN?.toString() || '',
    isbn10: csvRow.ISBN?.toString() || '',
    binding: binding,
    publisher: csvRow.Publisher || '',
    isAvailable: true
  };
  
  return {
    title: csvRow.Title || '',
    authors,
    // Convert HTML description to Lexical format
    description: htmlToLexical(csvRow.Description),
    editions: [edition],
    categories,
    rawCategories,
    subjects,
    collections,
    importSource: 'csv-import',
    importDate: new Date().toISOString(),
    isActive: true,
    seo: {
      title: csvRow.Title || '',
      description: csvRow.Description?.replace(/<[^>]*>/g, '').substring(0, 160) || undefined,
      keywords: subjectStrings.join(', ')
    }
  };
};

const importBooks = async () => {
  try {
    console.log('🚀 Starting book import...');
    
    // Import config dynamically and await it properly
    const { default: config } = await import('../src/payload.config');
    
    // Await the config if it's a promise
    let resolvedConfig = config;
    if (config && typeof config.then === 'function') {
      resolvedConfig = await config;
    }
    
    // Debug: Check config structure
    console.log('Config type:', typeof resolvedConfig);
    console.log('Has collections:', !!resolvedConfig?.collections);
    console.log('Collections length:', resolvedConfig?.collections?.length);
    
    const payload = await getPayload({ 
      config: resolvedConfig
    });
    
    console.log('✅ PayloadCMS initialized');

    // Read your CSV
    const csvData = fs.readFileSync('./output-29.csv', 'utf8');
    const parsed = Papa.parse(csvData, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true
    });

    console.log(`📚 Found ${parsed.data.length} books to import`);

    let successful = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    // Import all books (or set a higher limit)
    const booksToImport = Math.min(50, parsed.data.length); // Import 50 for now
    
    for (let i = 0; i < booksToImport; i++) {
      const csvBook = parsed.data[i] as CsvBookRow;
      
      try {
        const bookData = transformCsvToPayload(csvBook);
        
        // Debug: Log the first book data structure
        if (i === 0) {
          console.log('📝 Sample book data structure:');
          console.log(JSON.stringify(bookData, null, 2));
        }
        
        // Check for existing book by ISBN
        const existingBooks = await payload.find({
          collection: 'books',
          where: {
            'editions.isbn': {
              equals: bookData.editions[0].isbn
            }
          }
        });
        
        if (existingBooks.docs.length > 0) {
          console.log(`⚠️  Duplicate found for ISBN: ${bookData.editions[0].isbn} - ${bookData.title}`);
          continue;
        }
        
        const book = await payload.create({
          collection: 'books',
          data: bookData as any // Type assertion to bypass strict payload types
        });
        
        successful++;
        console.log(`✅ Imported: ${book.title}`);
        console.log(`   📖 Categories: ${bookData.categories.join(', ')}`);
        console.log(`   🏷️  Collections: ${bookData.collections.map(c => c.collectionName).join(', ')}`);
        console.log('');
        
      } catch (error: any) {
        errors++;
        const errorMsg = `Error importing "${csvBook.Title}": ${error.message}`;
        errorDetails.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
        
        // Debug: Log binding value if it's a binding error
        if (error.message.includes('Binding')) {
          console.error(`   📖 Original binding: "${csvBook.Binding}"`);
        }
      }
    }
    
    console.log('\n📊 Import Summary:');
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Errors: ${errors}`);
    
    if (errorDetails.length > 0) {
      console.log('\n🔍 Error Details:');
      errorDetails.forEach(error => console.log(`  - ${error}`));
    }
    
  } catch (error: any) {
    console.error('💥 Fatal error:', error);
  } finally {
    process.exit(0);
  }
};

importBooks();