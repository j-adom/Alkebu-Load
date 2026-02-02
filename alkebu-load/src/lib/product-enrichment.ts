// Simple wrapper around the existing productEnrichment utility
import { enrichProductFromIdentifiers } from '../app/utils/productEnrichment'

export async function enrichProduct(isbn: string) {
  // Try to enrich using the existing system
  const identifier = { 
    type: isbn.length === 13 ? 'isbn13' : 'isbn10' as 'isbn13' | 'isbn10', 
    value: isbn 
  }
  
  const enrichedData = await enrichProductFromIdentifiers(identifier)
  
  if (!enrichedData) {
    return null
  }
  
  // Transform to match expected format
  return {
    title: enrichedData.title,
    titleLong: enrichedData.titleLong,
    authors: enrichedData.authors,
    publisher: enrichedData.publisher,
    description: enrichedData.description,
    synopsis: enrichedData.synopsis,
    categories: enrichedData.categories,
    subjects: enrichedData.subjects,
    editions: enrichedData.editions,
    coverUrls: enrichedData.images?.map(img => img.url) || [],
    importSource: enrichedData.importSource
  }
}