import type { PayloadRequest } from 'payload'
import path from 'path'
import { fileURLToPath } from 'url'

interface ImageSource {
  url: string
  alt?: string
  isPrimary?: boolean
}

interface UploadedImage {
  id: string
  filename: string
  url: string
  alt: string
  isPrimary: boolean
}

// Download and upload images to Payload Media collection
export async function downloadAndUploadImages(
  payload: any,
  req: PayloadRequest,
  imageUrls: ImageSource[],
  productTitle: string
): Promise<UploadedImage[]> {
  if (!imageUrls || imageUrls.length === 0) {
    console.log('📷 No images to download')
    return []
  }

  console.log(`📷 Downloading ${imageUrls.length} images for: ${productTitle}`)
  
  const uploadedImages: UploadedImage[] = []
  
  for (let i = 0; i < imageUrls.length; i++) {
    const imageSource = imageUrls[i]
    
    try {
      console.log(`📷 Downloading image ${i + 1}/${imageUrls.length}: ${imageSource.url}`)
      
      const uploadedImage = await downloadAndUploadSingleImage(
        payload,
        req,
        imageSource,
        productTitle,
        i
      )
      
      if (uploadedImage) {
        uploadedImages.push(uploadedImage)
        console.log(`✅ Successfully uploaded: ${uploadedImage.filename}`)
      }
      
    } catch (error) {
      console.error(`❌ Failed to download image ${imageSource.url}:`, error)
      // Continue with other images even if one fails
    }
  }
  
  console.log(`📷 Image upload completed: ${uploadedImages.length}/${imageUrls.length} successful`)
  return uploadedImages
}

async function downloadAndUploadSingleImage(
  payload: any,
  req: PayloadRequest,
  imageSource: ImageSource,
  productTitle: string,
  index: number
): Promise<UploadedImage | null> {
  try {
    // Download the image
    const response = await fetch(imageSource.url, {
      headers: {
        'User-Agent': 'AlkebuBot/1.0 (Book Image Scraper)'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const contentType = response.headers.get('content-type')
    if (!contentType?.startsWith('image/')) {
      throw new Error(`Invalid content type: ${contentType}`)
    }

    // Get the image buffer
    const imageBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(imageBuffer)

    // Generate filename
    const extension = getImageExtension(contentType) || 'jpg'
    const sanitizedTitle = sanitizeFilename(productTitle)
    const filename = `${sanitizedTitle}-${index + 1}.${extension}`

    // Create file object in the format Payload expects
    const fileObject = {
      data: buffer,
      name: filename,
      mimetype: contentType,
      size: buffer.length
    }

    // Upload to Payload Media collection
    const uploadResult = await payload.create({
      collection: 'media',
      data: {
        alt: imageSource.alt || `${productTitle} - Image ${index + 1}`
      },
      file: fileObject,
      req
    })

    return {
      id: uploadResult.id,
      filename: uploadResult.filename,
      url: uploadResult.url,
      alt: imageSource.alt || `${productTitle} - Image ${index + 1}`,
      isPrimary: imageSource.isPrimary || index === 0
    }

  } catch (error) {
    console.error(`❌ Error uploading image:`, error)
    return null
  }
}

function getImageExtension(contentType: string): string | null {
  const extensionMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg'
  }
  
  return extensionMap[contentType.toLowerCase()] || null
}

function sanitizeFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .substring(0, 50) // Limit length
}

// Enhanced image scraping for book covers
export async function scrapeBookCoverImages(
  isbn: string,
  title: string,
  author?: string
): Promise<ImageSource[]> {
  console.log(`📷 Scraping book cover images for ISBN: ${isbn}`)
  
  const images: ImageSource[] = []
  
  // Try multiple image sources
  const imageSources = [
    () => getOpenLibraryImages(isbn),
    () => getGoogleBooksImages(isbn),
    () => getIsbnDbImages(isbn),
    () => searchBookCoverImages(title, author)
  ]
  
  for (const getImages of imageSources) {
    try {
      const sourceImages = await getImages()
      if (sourceImages.length > 0) {
        images.push(...sourceImages)
        console.log(`📷 Found ${sourceImages.length} images from source`)
      }
    } catch (error) {
      console.log(`⚠️  Image source failed:`, error instanceof Error ? error.message : 'Unknown error')
    }
  }
  
  // Remove duplicates and limit to 3 images
  const uniqueImages = deduplicateImages(images).slice(0, 3)
  
  console.log(`📷 Total unique images found: ${uniqueImages.length}`)
  return uniqueImages
}

async function getOpenLibraryImages(isbn: string): Promise<ImageSource[]> {
  try {
    // Open Library provides multiple sizes: S, M, L
    const sizes = ['L', 'M', 'S']
    const images: ImageSource[] = []
    
    for (const size of sizes) {
      const url = `https://covers.openlibrary.org/b/isbn/${isbn}-${size}.jpg`
      
      // Check if image exists
      const response = await fetch(url, { method: 'HEAD' })
      if (response.ok) {
        images.push({
          url,
          alt: `Book cover from Open Library (${size})`,
          isPrimary: size === 'L'
        })
      }
    }
    
    return images
  } catch (error) {
    console.log('⚠️  Open Library images failed:', error)
    return []
  }
}

async function getGoogleBooksImages(isbn: string): Promise<ImageSource[]> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
    )
    
    if (!response.ok) return []
    
    const data = await response.json()
    
    if (!data.items || data.items.length === 0) return []
    
    const bookInfo = data.items[0].volumeInfo
    const images: ImageSource[] = []
    
    if (bookInfo.imageLinks) {
      // Google Books provides multiple sizes
      const imageTypes = ['extraLarge', 'large', 'medium', 'small', 'thumbnail', 'smallThumbnail']
      
      for (const type of imageTypes) {
        if (bookInfo.imageLinks[type]) {
          images.push({
            url: bookInfo.imageLinks[type].replace('http://', 'https://'), // Force HTTPS
            alt: `Book cover from Google Books (${type})`,
            isPrimary: type === 'large' || type === 'extraLarge'
          })
        }
      }
    }
    
    return images
  } catch (error) {
    console.log('⚠️  Google Books images failed:', error)
    return []
  }
}

async function getIsbnDbImages(isbn: string): Promise<ImageSource[]> {
  if (!process.env.ISBNDB_API_KEY) return []
  
  try {
    const response = await fetch(`https://api2.isbndb.com/book/${isbn}`, {
      headers: {
        'Authorization': process.env.ISBNDB_API_KEY
      }
    })
    
    if (!response.ok) return []
    
    const data = await response.json()
    const images: ImageSource[] = []
    
    if (data.book?.image) {
      images.push({
        url: data.book.image,
        alt: 'Book cover from ISBNDB',
        isPrimary: true
      })
    }
    
    if (data.book?.image_original && data.book.image_original !== data.book.image) {
      images.push({
        url: data.book.image_original,
        alt: 'Original book cover from ISBNDB',
        isPrimary: false
      })
    }
    
    return images
  } catch (error) {
    console.log('⚠️  ISBNDB images failed:', error)
    return []
  }
}

async function searchBookCoverImages(title: string, author?: string): Promise<ImageSource[]> {
  // This is a placeholder for more advanced image search
  // You could integrate with services like:
  // - Bing Image Search API
  // - Custom web scraping
  // - Amazon Product API
  
  console.log(`📷 Advanced image search not implemented for: ${title}`)
  return []
}

function deduplicateImages(images: ImageSource[]): ImageSource[] {
  const seen = new Set<string>()
  const unique: ImageSource[] = []
  
  for (const image of images) {
    // Normalize URL for comparison
    const normalizedUrl = image.url.replace(/^https?:\/\//, '').toLowerCase()
    
    if (!seen.has(normalizedUrl)) {
      seen.add(normalizedUrl)
      unique.push(image)
    }
  }
  
  return unique
}

// Utility function to validate image URLs
export async function validateImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' })
    const contentType = response.headers.get('content-type')
    
    return response.ok && (contentType?.startsWith('image/') || false)
  } catch {
    return false
  }
}

// Batch image processing for multiple products
export async function batchProcessImages(
  payload: any,
  req: PayloadRequest,
  products: Array<{
    id: string
    title: string
    isbn?: string
    imageUrls?: string[]
  }>
): Promise<void> {
  console.log(`📷 Starting batch image processing for ${products.length} products`)
  
  for (let i = 0; i < products.length; i++) {
    const product = products[i]
    console.log(`📷 Processing images for product ${i + 1}/${products.length}: ${product.title}`)
    
    try {
      let imageSources: ImageSource[] = []
      
      // If we have an ISBN, scrape book covers
      if (product.isbn) {
        imageSources = await scrapeBookCoverImages(product.isbn, product.title)
      }
      // Otherwise use provided URLs
      else if (product.imageUrls) {
        imageSources = product.imageUrls.map(url => ({ url, alt: product.title }))
      }
      
      if (imageSources.length > 0) {
        const uploadedImages = await downloadAndUploadImages(
          payload,
          req,
          imageSources,
          product.title
        )
        
        // Update the product with the uploaded images
        if (uploadedImages.length > 0) {
          await updateProductImages(payload, req, product.id, uploadedImages)
        }
      }
      
      // Small delay to be respectful to external APIs
      await new Promise(resolve => setTimeout(resolve, 500))
      
    } catch (error) {
      console.error(`❌ Failed to process images for ${product.title}:`, error)
    }
  }
  
  console.log('📷 Batch image processing completed')
}

async function updateProductImages(
  payload: any,
  req: PayloadRequest,
  productId: string,
  uploadedImages: UploadedImage[]
): Promise<void> {
  try {
    // Assume books collection for now - you could make this dynamic
    await payload.update({
      collection: 'books',
      id: productId,
      data: {
        images: uploadedImages.map(img => ({
          image: img.id,
          alt: img.alt,
          isPrimary: img.isPrimary
        }))
      },
      req
    })
    
    console.log(`✅ Updated product ${productId} with ${uploadedImages.length} images`)
  } catch (error) {
    console.error(`❌ Failed to update product images:`, error)
  }
}