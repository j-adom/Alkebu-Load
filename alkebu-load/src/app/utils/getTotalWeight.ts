/**
 * Calculate total weight for shipping calculations
 * Based on Payload e-commerce template patterns
 */

export interface CartItem {
  product: any;
  productType: string;
  quantity: number;
  selectedVariant?: string; // For book editions or product variants
}

/**
 * Get total weight in ounces for shipping calculation
 */
export function getTotalWeight(items: CartItem[]): number {
  return items.reduce((totalWeight, item) => {
    const { product, quantity, selectedVariant } = item;
    let weight = 0;

    // Handle variant-specific weights (for book editions)
    if (selectedVariant && product.editions) {
      const edition = product.editions.find((ed: any) => ed.isbn === selectedVariant);
      weight = edition?.shippingWeight || product.pricing?.shippingWeight || getDefaultWeight(item.productType);
    } else {
      weight = product.pricing?.shippingWeight || getDefaultWeight(item.productType);
    }

    return totalWeight + (weight * quantity);
  }, 0);
}

/**
 * Get default weight by product type (in ounces)
 */
function getDefaultWeight(productType: string): number {
  const defaultWeights: { [key: string]: number } = {
    'books': 8, // Average paperback book
    'wellness-lifestyle': 4, // Small wellness items
    'fashion-jewelry': 2, // Light jewelry items
    'oils-incense': 3, // Essential oils/incense
  };

  return defaultWeights[productType] || 4; // 4oz default
}

/**
 * Calculate shipping cost based on weight and destination
 */
export function calculateShippingByWeight(
  totalWeight: number,
  destinationState: string = 'TN',
  method: string = 'standard'
): {
  cost: number;
  estimatedDays: number;
  method: string;
} {
  const weightInPounds = Math.ceil(totalWeight / 16);
  const isLocal = destinationState === 'TN';

  const shippingRates = {
    standard: {
      local: { base: 599, perLb: 199, days: 3 },
      national: { base: 899, perLb: 299, days: 7 },
    },
    expedited: {
      local: { base: 1299, perLb: 399, days: 1 },
      national: { base: 1899, perLb: 499, days: 3 },
    },
    pickup: {
      local: { base: 0, perLb: 0, days: 0 },
      national: { base: 0, perLb: 0, days: 0 }, // Not available
    },
  };

  const rates = shippingRates[method as keyof typeof shippingRates] || shippingRates.standard;
  const zone = isLocal ? rates.local : rates.national;

  // Pickup only available locally
  if (method === 'pickup' && !isLocal) {
    method = 'standard';
    const standardZone = isLocal ? shippingRates.standard.local : shippingRates.standard.national;
    const cost = standardZone.base + (Math.max(0, weightInPounds - 1) * standardZone.perLb);
    return { cost, estimatedDays: standardZone.days, method };
  }

  const cost = zone.base + (Math.max(0, weightInPounds - 1) * zone.perLb);

  return {
    cost,
    estimatedDays: zone.days,
    method,
  };
}