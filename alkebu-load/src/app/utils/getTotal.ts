/**
 * Calculate order totals with multi-currency support
 * Based on Payload e-commerce template patterns
 */

export interface CartItem {
  product: any;
  productType: string;
  quantity: number;
  selectedVariant?: string; // For book editions
}

export interface PriceTotal {
  currency: string;
  value: number;
  formatted: string;
}

/**
 * Calculate total price for cart items
 * Supports variant pricing and multi-currency (future expansion)
 */
export function getTotal(items: CartItem[]): PriceTotal[] {
  const totals: { [currency: string]: number } = {};

  items.forEach((item) => {
    const { product, quantity, selectedVariant } = item;
    let price = 0;
    const currency = 'USD'; // Default currency

    // Handle variant pricing (for book editions)
    if (selectedVariant && product.editions) {
      const edition = product.editions.find((ed: any) => ed.isbn === selectedVariant);
      price = edition?.pricing?.retailPrice || product.pricing?.retailPrice || 0;
    } else {
      price = product.pricing?.retailPrice || 0;
    }

    // Add to currency total
    if (!totals[currency]) {
      totals[currency] = 0;
    }
    totals[currency] += price * quantity;
  });

  // Convert to PriceTotal array
  return Object.entries(totals).map(([currency, value]) => ({
    currency,
    value: Math.round(value), // Round to avoid floating point issues
    formatted: `$${(value / 100).toFixed(2)}`, // Format as currency
  }));
}

/**
 * Calculate subtotal, tax, shipping, and final total
 */
export function calculateOrderTotals(
  items: CartItem[],
  shippingAddress?: any,
  taxExempt: boolean = false
): {
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  currency: string;
} {
  // Get subtotal
  const subtotalArray = getTotal(items);
  const subtotal = subtotalArray[0]?.value || 0;

  // Calculate tax (Tennessee rates)
  let tax = 0;
  if (!taxExempt) {
    const city = shippingAddress?.city?.toLowerCase() || 'nashville';
    const localTaxRates: { [key: string]: number } = {
      'nashville': 0.025,
      'memphis': 0.0275,
      'knoxville': 0.0225,
      'chattanooga': 0.0275,
    };
    
    const stateTax = 0.07; // 7% Tennessee state tax
    const localTax = localTaxRates[city] || 0.02; // Default 2%
    const totalTaxRate = stateTax + localTax;
    
    // Books are tax-free in Tennessee, other items are taxable
    const taxableAmount = items.reduce((total, item) => {
      const itemPrice = getTotal([item])[0]?.value || 0;
      const isTaxFree = item.product.pricing?.taxCode === 'books_tax_free';
      return total + (isTaxFree ? 0 : itemPrice);
    }, 0);
    
    tax = Math.round(taxableAmount * totalTaxRate);
  }

  // Calculate shipping
  const totalWeight = getTotalWeight(items);
  const isLocalTN = shippingAddress?.state === 'TN';
  
  let shipping = 0;
  if (totalWeight > 0) {
    const weightInPounds = Math.ceil(totalWeight / 16);
    if (isLocalTN) {
      shipping = 599 + (Math.max(0, weightInPounds - 1) * 199); // $5.99 + $1.99/lb
    } else {
      shipping = 899 + (Math.max(0, weightInPounds - 1) * 299); // $8.99 + $2.99/lb
    }
  }

  // Free shipping threshold
  const freeShippingThreshold = parseInt(process.env.FREE_SHIPPING_THRESHOLD || '7500');
  if (subtotal >= freeShippingThreshold) {
    shipping = 0;
  }

  return {
    subtotal,
    tax,
    shipping,
    total: subtotal + tax + shipping,
    currency: 'USD',
  };
}

/**
 * Get total weight for shipping calculations
 */
function getTotalWeight(items: CartItem[]): number {
  return items.reduce((totalWeight, item) => {
    const { product, quantity, selectedVariant } = item;
    let weight = 0;

    // Handle variant weights (for book editions)
    if (selectedVariant && product.editions) {
      const edition = product.editions.find((ed: any) => ed.isbn === selectedVariant);
      weight = edition?.shippingWeight || product.pricing?.shippingWeight || 8; // 8oz default
    } else {
      weight = product.pricing?.shippingWeight || 8; // 8oz default
    }

    return totalWeight + (weight * quantity);
  }, 0);
}