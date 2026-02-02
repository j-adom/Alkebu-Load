import type { PayloadRequest } from 'payload'
import { createOrFindVendor } from './vendorManager'

// Simple vendor extraction from Square's vendor field
export interface VendorExtractionResult {
  vendorName: string | null
  source: 'vendor_field' | 'fallback'
}

// Default vendor for items that don't have a vendor field
const DEFAULT_VENDOR = 'Unknown Vendor'

// Extract vendor information directly from Square item vendor field
export function extractVendorFromSquareItem(item: any): VendorExtractionResult {
  // Check if Square item has a vendor field
  const vendorName = item.itemData?.vendor || item.vendor
  
  if (vendorName && vendorName.trim()) {
    return {
      vendorName: vendorName.trim(),
      source: 'vendor_field'
    }
  }

  // Fallback to default vendor
  return {
    vendorName: DEFAULT_VENDOR,
    source: 'fallback'
  }
}

// Extract and create vendor for a Square item
export async function extractAndCreateVendor(
  payload: any,
  req: PayloadRequest,
  item: any
): Promise<string | null> {
  try {
    const extraction = extractVendorFromSquareItem(item)
    
    if (!extraction.vendorName) {
      console.log('⚠️ No vendor name extracted from Square item')
      return null
    }

    console.log(`🏪 Extracted vendor "${extraction.vendorName}" from ${extraction.source}`)

    // Create or find the vendor
    const vendorId = await createOrFindVendor(payload, req, extraction.vendorName)

    if (vendorId && extraction.source === 'fallback') {
      console.log('⚠️ Using fallback vendor - consider setting vendor field in Square')
    }

    return vendorId
  } catch (error) {
    console.error('❌ Error extracting vendor from Square item:', error)
    return null
  }
}

// Get current configuration for review
export function getCurrentConfiguration() {
  return {
    defaultVendor: DEFAULT_VENDOR
  }
}