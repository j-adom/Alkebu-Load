import type { PayloadRequest } from 'payload';

// Type definitions for isbndb response
export interface IsbndbBook {
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

export interface GoogleBooksVolumeInfo {
  title?: string;
  subtitle?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  categories?: string[];
  pageCount?: number;
  language?: string;
  printType?: string;
  industryIdentifiers?: Array<{
    type?: string;
    identifier?: string;
  }>;
  imageLinks?: {
    smallThumbnail?: string;
    thumbnail?: string;
    small?: string;
    medium?: string;
    large?: string;
    extraLarge?: string;
  };
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

const toOunces = (value?: number, unit?: string): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }

  const normalizedUnit = unit?.toLowerCase().trim();

  switch (normalizedUnit) {
    case 'oz':
    case 'ounce':
    case 'ounces':
      return Math.round(value * 100) / 100;
    case 'lb':
    case 'lbs':
    case 'pound':
    case 'pounds':
      return Math.round(value * 16 * 100) / 100;
    case 'g':
    case 'gram':
    case 'grams':
      return Math.round((value / 28.349523125) * 100) / 100;
    case 'kg':
    case 'kilogram':
    case 'kilograms':
      return Math.round((value * 35.27396195) * 100) / 100;
    default:
      return undefined;
  }
};

const toCents = (value?: string): number | undefined => {
  if (!value) return undefined;

  const normalized = value.replace(/[^0-9.]/g, '').trim();
  if (!normalized) return undefined;

  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;

  return Math.round(parsed * 100);
};

const normalizeText = (value?: string | null): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
};

const uniqueStrings = (values: Array<string | undefined>): string[] => {
  const seen = new Set<string>();
  const results: string[] = [];

  for (const value of values) {
    const normalized = normalizeText(value);
    if (!normalized) continue;

    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    results.push(normalized);
  }

  return results;
};

const normalizeImageUrl = (url?: string | null): string | undefined => {
  const normalized = normalizeText(url);
  if (!normalized) return undefined;

  return normalized.replace(/^http:\/\//i, 'https://');
};

export const normalizeBookBinding = (binding?: string | null): string | undefined => {
  const normalized = binding?.toLowerCase().trim();
  if (!normalized) return undefined;

  if (normalized.includes('mass')) return 'mass-market';
  if (normalized.includes('hard')) return 'hardcover';
  if (
    normalized.includes('paperback') ||
    normalized.includes('softcover') ||
    normalized.includes('soft cover') ||
    normalized.includes('trade paperback')
  ) {
    return 'paperback';
  }
  if (normalized.includes('audio')) return 'audiobook';
  if (normalized.includes('ebook') || normalized.includes('kindle') || normalized.includes('digital')) {
    return 'ebook';
  }

  return undefined;
};

export const normalizePublishedDate = (date?: string | null): string | undefined => {
  const normalized = normalizeText(date);
  if (!normalized) return undefined;

  if (/^\d{4}$/.test(normalized)) {
    return `${normalized}-01-01`;
  }

  if (/^\d{4}-\d{2}$/.test(normalized)) {
    return `${normalized}-01`;
  }

  return normalized;
};

// Auto-categorization mapping helper
export const mapCategoriesToPayload = (scrapedCategories: string[], scrapedSubjects: string[]): string[] => {
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
export const mapToCollections = (title: string, authors: string[], subjects: string[], synopsis?: string): string[] => {
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
  const authorsText = uniqueStrings(book.authors || []).map(name => ({ name }));
  
  // Parse subjects
  const subjectValues = uniqueStrings(book.subjects || []);
  const subjects = subjectValues.map(subject => ({ subject }));
  
  // Create raw categories array (isbndb doesn't have categories, so we use subjects)
  const rawCategories = subjectValues.map(subject => ({ category: subject }));
  
  // Auto-categorize
  const categories = mapCategoriesToPayload([], subjectValues);
  
  // Auto-assign to collections
  const collections = mapToCollections(
    book.title || book.title_long || '',
    uniqueStrings(book.authors || []),
    subjectValues,
    book.synopsis || book.overview
  ).map(collectionName => ({ collectionName }));
  
  // Handle dimensions
  let dimensionsText = book.dimensions;
  const shippingWeightOz = toOunces(
    book.dimensions_structured?.weight?.value,
    book.dimensions_structured?.weight?.unit,
  );
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
    publisherText: normalizeText(book.publisher),
    binding: normalizeBookBinding(book.binding) || 'paperback',
    edition: normalizeText(book.edition),
    pages: book.pages || undefined,
    datePublished: normalizePublishedDate(book.date_published),
    language: normalizeText(book.language) || 'en',
    dimensions: dimensionsText || undefined,
    pricing: shippingWeightOz ? { shippingWeight: shippingWeightOz } : undefined,
    isAvailable: true
  };
  
  // Handle images
  const scrapedImageUrls = uniqueStrings([
    normalizeImageUrl(book.image),
    normalizeImageUrl(book.image_original),
  ]).map((url) => ({ url }));
  
  // Handle reviews
  const reviews = uniqueStrings(book.reviews || []).map(review => ({ review }));
  
  // Handle dewey decimal
  const deweyValues = Array.isArray(book.dewey_decimal)
    ? uniqueStrings(book.dewey_decimal)
    : uniqueStrings([book.dewey_decimal as unknown as string]);
  const deweyDecimal = deweyValues.map(code => ({ code }));

  const compareAtPrice = toCents(book.msrp);
  const topLevelPricing: Record<string, unknown> = {};

  if (shippingWeightOz) {
    topLevelPricing.shippingWeight = shippingWeightOz;
  }

  if (compareAtPrice) {
    topLevelPricing.compareAtPrice = compareAtPrice;
  }
  
  return {
    title: book.title || book.title_long || '',
    titleLong: book.title_long || undefined,
    authorsText,
    publisherText: normalizeText(book.publisher),
    description: normalizeText(book.overview) || normalizeText(book.synopsis),
    synopsis: normalizeText(book.synopsis) || normalizeText(book.overview),
    excerpt: normalizeText(book.excerpt),
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
    pricing: Object.keys(topLevelPricing).length > 0 ? topLevelPricing : undefined,
    seo: {
      title: book.title || book.title_long || '',
      description: (normalizeText(book.synopsis) || normalizeText(book.overview))?.substring(0, 160) || undefined,
      keywords: subjectValues.join(', ')
    }
  };
};

export const transformGoogleBooksToPayload = (
  volumeInfo: GoogleBooksVolumeInfo,
  identifier?: { isbn13?: string; isbn10?: string },
) => {
  const authors = uniqueStrings(volumeInfo.authors || []);
  const categories = uniqueStrings(volumeInfo.categories || []);
  const title = normalizeText(volumeInfo.title) || '';
  const subtitle = normalizeText(volumeInfo.subtitle);
  const titleLong = subtitle ? `${title}: ${subtitle}` : undefined;

  let isbn13 = normalizeText(identifier?.isbn13);
  let isbn10 = normalizeText(identifier?.isbn10);

  for (const id of volumeInfo.industryIdentifiers || []) {
    if (id.type === 'ISBN_13' && !isbn13) isbn13 = normalizeText(id.identifier);
    if (id.type === 'ISBN_10' && !isbn10) isbn10 = normalizeText(id.identifier);
  }

  const scrapedImageUrls = uniqueStrings([
    normalizeImageUrl(volumeInfo.imageLinks?.extraLarge),
    normalizeImageUrl(volumeInfo.imageLinks?.large),
    normalizeImageUrl(volumeInfo.imageLinks?.medium),
    normalizeImageUrl(volumeInfo.imageLinks?.thumbnail),
    normalizeImageUrl(volumeInfo.imageLinks?.small),
    normalizeImageUrl(volumeInfo.imageLinks?.smallThumbnail),
  ]).map((url) => ({ url }));

  return {
    title,
    titleLong,
    authorsText: authors.map((name) => ({ name })),
    publisherText: normalizeText(volumeInfo.publisher),
    description: normalizeText(volumeInfo.description),
    synopsis: normalizeText(volumeInfo.description)?.substring(0, 500),
    editions: [{
      isbn: isbn13,
      isbn10,
      publisherText: normalizeText(volumeInfo.publisher),
      binding: normalizeBookBinding(volumeInfo.printType),
      pages: volumeInfo.pageCount || undefined,
      datePublished: normalizePublishedDate(volumeInfo.publishedDate),
      language: normalizeText(volumeInfo.language) || 'en',
      isAvailable: true,
    }],
    categories: mapCategoriesToPayload(categories, categories),
    rawCategories: categories.map((category) => ({ category })),
    subjects: categories.map((subject) => ({ subject })),
    collections: mapToCollections(
      title,
      authors,
      categories,
      normalizeText(volumeInfo.description),
    ).map((collectionName) => ({ collectionName })),
    scrapedImageUrls,
    importSource: 'google-books',
    importDate: new Date().toISOString(),
    isActive: true,
    seo: {
      title,
      description: normalizeText(volumeInfo.description)?.substring(0, 160),
      keywords: categories.join(', '),
    },
  };
};

// Transform CSV data to PayloadCMS format
export const transformCsvToPayload = (csvRow: CsvBookRow) => {
  // Parse authors (comma-separated in CSV)
  const authorNames = uniqueStrings((csvRow.Authors || '').split(','));
  const authorsText = authorNames.map(name => ({ name }));
  
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
    authorNames,
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
    authorsText,
    publisherText: csvRow.Publisher || undefined,
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

const isMeaningfulText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const mergeObjectArrays = <T extends Record<string, unknown>>(
  existing: T[] | undefined,
  incoming: T[] | undefined,
  key: keyof T,
): T[] | undefined => {
  const merged: T[] = [];
  const seen = new Set<string>();

  for (const item of [...(existing || []), ...(incoming || [])]) {
    const raw = item?.[key];
    if (!isMeaningfulText(raw)) continue;

    const normalized = raw.trim();
    const lookup = normalized.toLowerCase();
    if (seen.has(lookup)) continue;

    seen.add(lookup);
    merged.push({
      ...item,
      [key]: normalized,
    });
  }

  return merged.length > 0 ? merged : undefined;
};

const mergeSeo = (existingSeo: any, incomingSeo: any) => {
  const nextSeo = { ...(existingSeo || {}) };
  let changed = false;

  if (!isMeaningfulText(nextSeo.title) && isMeaningfulText(incomingSeo?.title)) {
    nextSeo.title = incomingSeo.title.trim();
    changed = true;
  }

  if (!isMeaningfulText(nextSeo.description) && isMeaningfulText(incomingSeo?.description)) {
    nextSeo.description = incomingSeo.description.trim();
    changed = true;
  }

  if (!isMeaningfulText(nextSeo.keywords) && isMeaningfulText(incomingSeo?.keywords)) {
    nextSeo.keywords = incomingSeo.keywords.trim();
    changed = true;
  }

  return changed ? nextSeo : undefined;
};

export const buildBookMetadataPatch = (
  book: any,
  args: {
    isbndbBook?: IsbndbBook | null;
    googleVolumeInfo?: GoogleBooksVolumeInfo | null;
    markChecked?: boolean;
  },
) => {
  const { isbndbBook, googleVolumeInfo, markChecked = true } = args;

  const currentIsbn = book?.editions?.[0]?.isbn;
  const currentIsbn10 = book?.editions?.[0]?.isbn10;
  const isbndbPayload = isbndbBook ? transformIsbndbToPayload({ book: isbndbBook }) : null;
  const googlePayload = googleVolumeInfo
    ? transformGoogleBooksToPayload(googleVolumeInfo, {
      isbn13: currentIsbn,
      isbn10: currentIsbn10,
    })
    : null;
  const preferred = [isbndbPayload, googlePayload].filter(Boolean) as Array<Record<string, any>>;

  const patch: Record<string, unknown> = {};
  let fieldsUpdated = 0;

  const pickText = (...values: unknown[]): string | undefined => {
    for (const value of values) {
      if (isMeaningfulText(value)) return value.trim();
    }

    return undefined;
  };

  const setIfMissing = (field: string, ...values: unknown[]) => {
    if (isMeaningfulText(book?.[field])) return;
    const nextValue = pickText(...values);
    if (!nextValue) return;
    patch[field] = nextValue;
    fieldsUpdated += 1;
  };

  setIfMissing('title', ...preferred.map((source) => source.title));
  setIfMissing('titleLong', ...preferred.map((source) => source.titleLong));
  setIfMissing('publisherText', ...preferred.map((source) => source.publisherText));
  setIfMissing('description', ...preferred.map((source) => source.description));
  setIfMissing(
    'synopsis',
    ...preferred.map((source) => source.synopsis),
    ...preferred.map((source) => source.description),
  );
  setIfMissing('excerpt', ...preferred.map((source) => source.excerpt));

  const mergedAuthors = mergeObjectArrays(book?.authorsText, preferred.flatMap((source) => source.authorsText || []), 'name');
  if (JSON.stringify(mergedAuthors || []) !== JSON.stringify(book?.authorsText || [])) {
    patch.authorsText = mergedAuthors;
    fieldsUpdated += 1;
  }

  const mergedSubjects = mergeObjectArrays(book?.subjects, preferred.flatMap((source) => source.subjects || []), 'subject');
  if (JSON.stringify(mergedSubjects || []) !== JSON.stringify(book?.subjects || [])) {
    patch.subjects = mergedSubjects;
    fieldsUpdated += 1;
  }

  const mergedRawCategories = mergeObjectArrays(book?.rawCategories, preferred.flatMap((source) => source.rawCategories || []), 'category');
  if (JSON.stringify(mergedRawCategories || []) !== JSON.stringify(book?.rawCategories || [])) {
    patch.rawCategories = mergedRawCategories;
    fieldsUpdated += 1;
  }

  const mergedCollections = mergeObjectArrays(book?.collections, preferred.flatMap((source) => source.collections || []), 'collectionName');
  if (JSON.stringify(mergedCollections || []) !== JSON.stringify(book?.collections || [])) {
    patch.collections = mergedCollections;
    fieldsUpdated += 1;
  }

  const mergedImages = mergeObjectArrays(book?.scrapedImageUrls, preferred.flatMap((source) => source.scrapedImageUrls || []), 'url');
  if (JSON.stringify(mergedImages || []) !== JSON.stringify(book?.scrapedImageUrls || [])) {
    patch.scrapedImageUrls = mergedImages;
    fieldsUpdated += 1;
  }

  const mergedDewey = mergeObjectArrays(book?.deweyDecimal, preferred.flatMap((source) => source.deweyDecimal || []), 'code');
  if (JSON.stringify(mergedDewey || []) !== JSON.stringify(book?.deweyDecimal || [])) {
    patch.deweyDecimal = mergedDewey;
    fieldsUpdated += 1;
  }

  const mergedReviews = mergeObjectArrays(book?.reviews, preferred.flatMap((source) => source.reviews || []), 'review');
  if (JSON.stringify(mergedReviews || []) !== JSON.stringify(book?.reviews || [])) {
    patch.reviews = mergedReviews;
    fieldsUpdated += 1;
  }

  if (preferred.length > 0) {
    const existingEdition = book?.editions?.[0] || {};
    const nextEdition = { ...existingEdition };
    let editionChanged = false;

    const maybeSetEdition = (field: string, ...values: unknown[]) => {
      if (existingEdition?.[field]) return;
      const nextValue = values.find((value) => value !== undefined && value !== null && value !== '');
      if (nextValue === undefined) return;
      nextEdition[field] = nextValue;
      editionChanged = true;
      fieldsUpdated += 1;
    };

    maybeSetEdition('isbn10', ...preferred.map((source) => source.editions?.[0]?.isbn10));
    maybeSetEdition('publisherText', ...preferred.map((source) => source.editions?.[0]?.publisherText), patch.publisherText);
    maybeSetEdition('binding', ...preferred.map((source) => source.editions?.[0]?.binding));
    maybeSetEdition('edition', ...preferred.map((source) => source.editions?.[0]?.edition));
    maybeSetEdition('pages', ...preferred.map((source) => source.editions?.[0]?.pages));
    maybeSetEdition('datePublished', ...preferred.map((source) => source.editions?.[0]?.datePublished));
    maybeSetEdition('language', ...preferred.map((source) => source.editions?.[0]?.language));
    maybeSetEdition('dimensions', ...preferred.map((source) => source.editions?.[0]?.dimensions));

    const incomingEditionWeight = preferred.find((source) => source.editions?.[0]?.pricing?.shippingWeight)
      ?.editions?.[0]?.pricing?.shippingWeight;
    if (!existingEdition?.pricing?.shippingWeight && incomingEditionWeight) {
      nextEdition.pricing = {
        ...(existingEdition.pricing || {}),
        shippingWeight: incomingEditionWeight,
      };
      editionChanged = true;
      fieldsUpdated += 1;
    }

    if (editionChanged) {
      patch.editions = [nextEdition, ...(book?.editions || []).slice(1)];
    }
  }

  const nextTopLevelWeight = preferred.find((source) => source.pricing?.shippingWeight)?.pricing?.shippingWeight;
  if (!book?.pricing?.shippingWeight && nextTopLevelWeight) {
    patch.pricing = {
      ...(book?.pricing || {}),
      shippingWeight: nextTopLevelWeight,
    };
    fieldsUpdated += 1;
  }

  const seoPatch = mergeSeo(book?.seo, preferred.find((source) => source.seo)?.seo);
  if (seoPatch) {
    patch.seo = seoPatch;
    fieldsUpdated += 1;
  }

  if (markChecked) {
    if (!book?.isbndbChecked) {
      patch.isbndbChecked = true;
      fieldsUpdated += 1;
    }
    patch.lastEnrichedAt = new Date().toISOString();
  }

  return {
    updateData: patch,
    fieldsUpdated,
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
