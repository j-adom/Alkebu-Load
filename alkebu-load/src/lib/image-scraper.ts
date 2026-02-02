// Simple wrapper around the existing imageManager utility
import { downloadAndUploadImages as downloadAndUploadImagesUtil } from '../app/utils/imageManager'

export async function downloadAndUploadImages(urls: string[], payload: any) {
  // Transform URLs to ImageSource format
  const imageSources = urls.map(url => ({ url, alt: 'Book cover' }))
  
  // Create a minimal req object (you might need to adjust this)
  const req = { user: null } as any
  
  // Use the existing utility
  return await downloadAndUploadImagesUtil(payload, req, imageSources, 'Product')
}