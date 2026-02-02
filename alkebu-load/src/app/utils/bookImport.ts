import type { PayloadRequest } from 'payload';

// Type definitions for isbndb response
interface IsbndbBook {
  publisher?: string;
  synopsis?: string;
  language?: string;
  image?: string;
  image_original?: string;
  title_long?: string;
  dimensions?: string;
  dimensions_structured?: {
    length?: { unit: string; value: number };
    width?: { unit: string; value: number };
    height?: { unit: string; value: number };
    weight?: { unit: string; value: number };
  };
  pages?: number;
  date_published?: string;
  subjects?: string[];
  authors?: string[];
  title?: string;
  isbn13?: string;
  isbn10?: string;
  isbn?: string;
  msrp?: string;
  binding?: string;
  overview?: string;
  excerpt?: string;
  dewey_decimal?: string[];
  edition?: string;
  reviews?: string[];
  other_isbns?: Array<{
    isbn: string;
    binding: string;
  }>;
}

// Type for CSV row data
interface CsvBookRow {
  ISBN?: number | string;
  Title?: string;
  Authors?: string;
  Publisher?: string;
  Categories?: string;
  Description?: string;
  Binding?: string;
  Subjects?: string;
  Sales?: number;
  Stores?: number;
}

// Auto-categorization mapping helper
const mapCategoriesToPayload = (scrapedCategories: string[], scrapedSubjects: string[]): string[] => {
  const categories = [];
  const combined = [...scrapedCategories, ...scrapedSubjects].map(c => c.toLowerCase());
  
  // History
  if (combined.some(c => 
    c.includes('history') || 
    c.includes('historical') || 
    c.includes('civil rights') ||
    c.includes('biography') && c.includes('historical')
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
const mapToCollections = (title: string, authors: string[], subjects: string[], synopsis?: string): string[] => {
  const collections = [];
  const content = [title, ...authors, ...subjects, synopsis || ''].join(' ').toLowerCase();
  
  // Civil Rights Movement
  if (content.includes('martin luther king') || 
      content.includes('civil rights') || 
      content.includes('rosa parks') ||
      content.includes('malcolm x') ||
      content.includes('segregation')) {
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
      content.includes('harlem renaissance')) {
    collections.push('essential-black-history');
  }
  
  // Spirituality & Consciousness
  if (content.includes('spiritual') || 
      content.includes('consciousness') ||
      content.includes('meditation') ||
      content.includes('awakening') ||
      content.includes('wisdom')) {
    collections.push('spirituality-consciousness');
  }
  
  // Youth & Education
  if (content.includes('children') || 
      content.includes('education') ||
      content.includes('school') ||
      content.includes('learning') ||
      content.includes('young')) {
    collections.push('youth-education');
  }
  
  return collections;
};

// Transform isbndb data to PayloadCMS format
export const transformIsbndbToPayload = (isbndbResponse: { book: IsbndbBook }) => {
  const book = isbndbResponse.book;
  
  // Parse authors
  const authors = (book.authors || []).map(name => ({ name: name.trim() }));
  
  // Parse subjects
  const subjects = (book.subjects || []).map(subject => ({ subject: subject.trim() }));
  
  // Create raw categories array (isbndb doesn't have categories, so we use subjects)
  const rawCategories = (book.subjects || []).map(subject => ({ category: subject.trim() }));
  
  // Auto-categorize
  const categories = mapCategoriesToPayload([], book.subjects || []);
  
  // Auto-assign to collections
  const collections = mapToCollections(
    book.title || '',
    book.authors || [],
    book.subjects || [],
    book.synopsis
  ).map(collectionName => ({ collectionName }));
  
  // Handle dimensions
  let dimensionsText = book.dimensions;
  if (book.dimensions_structured) {
    const { length, width, height, weight } = book.dimensions_structured;
    const parts = [];
    if (height) parts.push(`H: ${height.value}${height.unit}`);
    if (width) parts.push(`W: ${width.value}${width.unit}`);
    if (length) parts.push(`L: ${length.value}${length.unit}`);
    if (weight) parts.push(`Weight: ${weight.value}${weight.unit}`);
    if (parts.length > 0) dimensionsText = parts.join(', ');
  }
  
  // Create the edition entry
  const edition = {
    isbn: book.isbn13 || book.isbn || book.isbn10,
    isbn10: book.isbn10 || book.isbn,
    binding: book.binding?.toLowerCase().replace(/\s+/g, '-') || 'paperback',
    pages: book.pages || undefined,
    datePublished: book.date_published || undefined,
    language: book.language || 'en',
    dimensions: dimensionsText || undefined,
    isAvailable: true
  };
  
  // Handle images
  const scrapedImageUrls = [];
  if (book.image) scrapedImageUrls.push({ url: book.image });
  if (book.image_original && book.image_original !== book.image) {
    scrapedImageUrls.push({ url: book.image_original });
  }
  
  // Handle reviews
  const reviews = (book.reviews || []).map(review => ({ review: review.trim() }));
  
  // Handle dewey decimal
  const deweyDecimal = (book.dewey_decimal || []).map(code => ({ code: code.trim() }));
  
  return {
    title: book.title || '',
    titleLong: book.title_long || undefined,
    authors,
    publisher: book.publisher || undefined,
    description: book.overview || book.synopsis || undefined,
    synopsis: book.synopsis || undefined,
    excerpt: book.excerpt || undefined,
    editions: [edition],
    categories,
    rawCategories,
    subjects,
    deweyDecimal,
    collections,
    scrapedImageUrls,
    reviews,
    importSource: 'isbndb',
    importDate: new Date().toISOString(),
    isActive: true,
    seo: {
      title: book.title || '',
      description: book.synopsis?.substring(0, 160) || undefined,
      keywords: (book.subjects || []).join(', ')
    }
  };
};

// Transform CSV data to PayloadCMS format
export const transformCsvToPayload = (csvRow: CsvBookRow) => {
  // Parse authors (comma-separated in CSV)
  const authors = (csvRow.Authors || '').split(',').map(name => ({ name: name.trim() })).filter(a => a.name);
  
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
  ).map(collectionName => ({ collectionName }));
  
  // Create edition
  const edition = {
    isbn: csvRow.ISBN?.toString() || '',
    binding: csvRow.Binding?.toLowerCase().replace(/\s+/g, '-') || 'paperback',
    isAvailable: true
  };
  
  return {
    title: csvRow.Title || '',
    authors,
    publisher: csvRow.Publisher || undefined,
    description: csvRow.Description || undefined,
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
      description: csvRow.Description?.substring(0, 160) || undefined,
      keywords: subjectStrings.join(', ')
    }
  };
};

// Bulk import function for PayloadCMS
export const bulkImportBooks = async (
  payload: any,
  req: PayloadRequest,
  books: Array<{ book: IsbndbBook } | CsvBookRow>,
  sourceType: 'isbndb' | 'csv' = 'isbndb'
) => {
  const results = {
    success: 0,
    errors: 0,
    duplicates: 0,
    errorDetails: [] as string[]
  };
  
  for (const bookData of books) {
    try {
      let transformedData;
      
      if (sourceType === 'isbndb') {
        transformedData = transformIsbndbToPayload(bookData as { book: IsbndbBook });
      } else {
        transformedData = transformCsvToPayload(bookData as CsvBookRow);
      }
      
      // Check for existing book by ISBN
      const existingBooks = await payload.find({
        collection: 'books',
        where: {
          'editions.isbn': {
            equals: transformedData.editions[0].isbn
          }
        },
        req
      });
      
      if (existingBooks.docs.length > 0) {
        results.duplicates++;
        console.log(`Duplicate found for ISBN: ${transformedData.editions[0].isbn}`);
        continue;
      }
      
      // Create the book
      await payload.create({
        collection: 'books',
        data: transformedData,
        req
      });
      
      results.success++;
      console.log(`✅ Imported: ${transformedData.title}`);
      
    } catch (error) {
      results.errors++;
      const errorMsg = `Error importing book: ${error instanceof Error ? error.message : 'Unknown error'}`;
      results.errorDetails.push(errorMsg);
      console.error('❌', errorMsg);
    }
  }
  
  return results;
};

// Example usage functions
export const importFromIsbndbResponse = async (payload: any, req: PayloadRequest, isbndbResponse: { book: IsbndbBook }) => {
  const transformedData = transformIsbndbToPayload(isbndbResponse);
  
  // Check for duplicates
  const existingBooks = await payload.find({
    collection: 'books',
    where: {
      'editions.isbn': {
        equals: transformedData.editions[0].isbn
      }
    },
    req
  });
  
  if (existingBooks.docs.length > 0) {
    throw new Error(`Book with ISBN ${transformedData.editions[0].isbn} already exists`);
  }
  
  return await payload.create({
    collection: 'books',
    data: transformedData,
    req
  });
};

// Test the transformation with your example data
export const testTransformation = () => {
  const sampleIsbndbResponse = {
    "book": {
      "publisher": "HarperCollins Leadership",
      "synopsis": "Leadership insights from one of history's most influential voices...",
      "language": "en",
      "image": "https://images.isbndb.com/covers/14809083482686.jpg",
      "image_original": "https://images.isbndb.com/covers/original/14809083482686.jpg",
      "title_long": "Lead Boldly: Seven Principles from Dr. Martin Luther King, Jr.",
      "dimensions": "Height: 10 inches, Length: 1 inches, Width: 7.5 inches",
      "pages": 224,
      "date_published": "2025-08-12",
      "subjects": [
        "Business & Money",
        "Business Culture",
        "Motivation & Self-Improvement",
        "Management & Leadership",
        "Leadership & Motivation",
        "Motivational",
        "Personal Finance",
        "Human Resources",
        "Diversity & Inclusion"
      ],
      "authors": ["Robert F. Smith"],
      "title": "Lead Boldly: Seven Principles from Dr. Martin Luther King, Jr.",
      "isbn13": "9781400244102",
      "msrp": "0.00",
      "binding": "Hardcover",
      "isbn": "1400244102",
      "isbn10": "1400244102"
    }
  };
  
  const result = transformIsbndbToPayload(sampleIsbndbResponse);
  console.log('Transformed data:', JSON.stringify(result, null, 2));
  return result;
};