/**
 * Unified Tax and Shipping Calculations
 *
 * This is the single source of truth for all tax and shipping calculations.
 * All other files should import from here.
 */

export interface ShippingAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

export interface TaxCalculation {
  rate: number;
  amount: number;
  exempt: boolean;
  breakdown?: {
    stateTax: number;
    localTax: number;
    taxableAmount: number;
  };
}

export interface ShippingCalculation {
  method: string;
  cost: number;
  estimatedDays: number;
}

export interface CartItemForTax {
  product: {
    importSource?: string;
    pricing?: {
      taxCode?: string;
      retailPrice?: number;
      shippingWeight?: number;
    };
    editions?: Array<{
      binding?: string;
      pricing?: {
        shippingWeight?: number;
      };
    }>;
  };
  productType: string;
  quantity: number;
  unitPrice: number;
}

// Tennessee tax rates
const TENNESSEE_STATE_TAX_RATE = 0.07; // 7% state tax
const TENNESSEE_LOCAL_TAX_RATES: Record<string, number> = {
  'nashville': 0.025,      // 2.5%
  'davidson': 0.025,       // Davidson County
  'memphis': 0.0275,       // 2.75%
  'shelby': 0.0275,        // Shelby County
  'knoxville': 0.0225,     // 2.25%
  'knox': 0.0225,          // Knox County
  'chattanooga': 0.0275,   // 2.75%
  'hamilton': 0.0275,      // Hamilton County
};
const DEFAULT_LOCAL_TAX_RATE = 0.0225; // 2.25% default local rate

// Tennessee ZIP code ranges (370xx - 385xx)
const isTennesseeZip = (zip?: string | null): boolean => {
  if (!zip) return false;
  const normalized = zip.trim().replace(/\D/g, '');
  if (normalized.length < 3) return false;
  const prefix = parseInt(normalized.slice(0, 3), 10);
  return Number.isFinite(prefix) && prefix >= 370 && prefix <= 385;
};

/**
 * Check if a product is tax-exempt.
 * Launch checkout taxes all shipped goods to Tennessee unless the customer
 * is a validated tax-exempt account.
 */
export function isProductTaxExempt(item: CartItemForTax): boolean {
  return false;
}

/**
 * Calculate sales tax based on shipping address
 *
 * Rules:
 * - Only US addresses are supported
 * - Tennessee: 7% state + local rate (2.25-2.75%) on all shipped goods
 * - Other US states: No nexus, 0% tax (Alkebu-Lan only has physical presence in TN)
 * - Tax-exempt customers/institutions pay no tax
 */
export function calculateTax(
  items: CartItemForTax[],
  shippingAddress: ShippingAddress | null | undefined,
  taxExempt: boolean = false
): TaxCalculation {
  // Tax-exempt customers pay no tax
  if (taxExempt) {
    return { rate: 0, amount: 0, exempt: true };
  }

  // Require shipping address for checkout
  if (!shippingAddress) {
    return { rate: 0, amount: 0, exempt: false };
  }

  // Only US addresses are supported
  const country = (shippingAddress.country || 'US').toUpperCase();
  if (country !== 'US') {
    throw new Error('Only US shipping addresses are supported');
  }

  // Determine if Tennessee resident (by state or ZIP)
  const state = shippingAddress.state?.toUpperCase();
  const isTennessee = state === 'TN' || isTennesseeZip(shippingAddress.zip);

  // No nexus outside Tennessee - no tax collected
  if (!isTennessee) {
    return { rate: 0, amount: 0, exempt: false };
  }

  // Calculate taxable amount for all shipped goods.
  let taxableAmount = 0;

  for (const item of items) {
    const itemTotal = item.quantity * item.unitPrice;

    if (!isProductTaxExempt(item)) {
      taxableAmount += itemTotal;
    }
  }

  // Get local tax rate based on city
  const city = shippingAddress.city?.toLowerCase().trim() || '';
  const localTaxRate = TENNESSEE_LOCAL_TAX_RATES[city] || DEFAULT_LOCAL_TAX_RATE;
  const totalTaxRate = TENNESSEE_STATE_TAX_RATE + localTaxRate;

  const taxAmount = Math.round(taxableAmount * totalTaxRate);

  return {
    rate: totalTaxRate,
    amount: taxAmount,
    exempt: taxableAmount === 0,
    breakdown: {
      stateTax: Math.round(taxableAmount * TENNESSEE_STATE_TAX_RATE),
      localTax: Math.round(taxableAmount * localTaxRate),
      taxableAmount,
    },
  };
}

/**
 * Calculate tax from a simple subtotal (legacy support)
 * Used when item-level tax exemption isn't needed
 */
export function calculateTaxFromSubtotal(
  subtotal: number,
  shippingAddress: ShippingAddress | null | undefined,
  taxExempt: boolean = false
): TaxCalculation {
  if (taxExempt) {
    return { rate: 0, amount: 0, exempt: true };
  }

  if (!shippingAddress) {
    return { rate: 0, amount: 0, exempt: false };
  }

  const country = (shippingAddress.country || 'US').toUpperCase();
  if (country !== 'US') {
    throw new Error('Only US shipping addresses are supported');
  }

  const state = shippingAddress.state?.toUpperCase();
  const isTennessee = state === 'TN' || isTennesseeZip(shippingAddress.zip);

  if (!isTennessee) {
    return { rate: 0, amount: 0, exempt: false };
  }

  const city = shippingAddress.city?.toLowerCase().trim() || '';
  const localTaxRate = TENNESSEE_LOCAL_TAX_RATES[city] || DEFAULT_LOCAL_TAX_RATE;
  const totalTaxRate = TENNESSEE_STATE_TAX_RATE + localTaxRate;

  return {
    rate: totalTaxRate,
    amount: Math.round(subtotal * totalTaxRate),
    exempt: false,
  };
}

// Shipping rates (all amounts in cents)
const SHIPPING_RATES = {
  standard: {
    local: { base: 599, perLb: 199, days: 3 },      // $5.99 + $1.99/lb
    national: { base: 899, perLb: 299, days: 7 },   // $8.99 + $2.99/lb
  },
  expedited: {
    local: { base: 1299, perLb: 399, days: 1 },     // $12.99 + $3.99/lb
    national: { base: 1899, perLb: 499, days: 3 },  // $18.99 + $4.99/lb
  },
  pickup: {
    local: { base: 0, perLb: 0, days: 0 },          // Free pickup (local only)
    national: { base: 0, perLb: 0, days: 0 },       // Not available
  },
};

const USPS_MEDIA_MAIL_RATES: Record<number, number> = {
  1: 413,
  2: 487,
  3: 561,
  4: 635,
  5: 709,
  6: 783,
  7: 857,
  8: 931,
  9: 1005,
  10: 1079,
};
const USPS_MEDIA_MAIL_INCREMENTAL_RATE = 74;

// Default weights by product type (in ounces)
const DEFAULT_WEIGHTS: Record<string, number> = {
  'books': 8,              // Average paperback
  'wellness-lifestyle': 4, // Small wellness items
  'fashion-jewelry': 2,    // Light jewelry
  'oils-incense': 3,       // Essential oils/incense
};

/**
 * Get default weight for a product type
 */
export function getDefaultWeight(productType: string): number {
  return DEFAULT_WEIGHTS[productType] || 4; // 4oz default
}

function normalizeBinding(binding?: string | null): string {
  return binding?.toLowerCase().trim() || '';
}

function getDefaultBookWeight(binding?: string | null): number {
  const normalizedBinding = normalizeBinding(binding);

  if (normalizedBinding === 'hardcover') {
    return 16;
  }

  if (
    normalizedBinding === 'ebook' ||
    normalizedBinding === 'audiobook'
  ) {
    return 0;
  }

  return 8;
}

function getBookBinding(item: CartItemForTax): string | undefined {
  return item.product?.editions?.find(Boolean)?.binding;
}

function resolveItemWeight(item: CartItemForTax): number {
  const editionWeight = item.product?.editions?.find(
    (edition) =>
      typeof edition?.pricing?.shippingWeight === 'number' &&
      edition.pricing.shippingWeight > 0,
  )?.pricing?.shippingWeight;

  if (typeof editionWeight === 'number' && editionWeight > 0) {
    return editionWeight;
  }

  const topLevelWeight = item.product?.pricing?.shippingWeight;

  if (item.productType === 'books') {
    const binding = getBookBinding(item);

    // Most current book records appear to have a blanket 16oz top-level weight.
    // Treat that as a placeholder unless an edition weight is present.
    if (typeof topLevelWeight === 'number' && topLevelWeight > 0 && topLevelWeight !== 16) {
      return topLevelWeight;
    }

    return getDefaultBookWeight(binding);
  }

  if (typeof topLevelWeight === 'number' && topLevelWeight > 0) {
    return topLevelWeight;
  }

  return getDefaultWeight(item.productType);
}

function isBookOnlyOrder(items: CartItemForTax[]): boolean {
  return items.length > 0 && items.every((item) => item.productType === 'books');
}

/**
 * Calculate total weight for cart items
 */
export function calculateTotalWeight(items: CartItemForTax[]): number {
  return items.reduce((total, item) => {
    const weight = resolveItemWeight(item);
    return total + (weight * item.quantity);
  }, 0);
}

/**
 * Calculate shipping cost based on weight, method, and destination
 */
export function calculateShipping(
  totalWeightOz: number,
  method: string = 'standard',
  destinationState: string = 'TN'
): ShippingCalculation {
  const isLocal = destinationState?.toUpperCase() === 'TN';

  // Pickup only available locally
  if (method === 'pickup' && !isLocal) {
    method = 'standard';
  }

  const rates = SHIPPING_RATES[method as keyof typeof SHIPPING_RATES] || SHIPPING_RATES.standard;
  const zone = isLocal ? rates.local : rates.national;

  // Convert ounces to pounds (round up)
  const weightInPounds = Math.ceil(totalWeightOz / 16);

  // Base rate + per-pound rate for additional pounds
  const cost = zone.base + (Math.max(0, weightInPounds - 1) * zone.perLb);

  return {
    method,
    cost,
    estimatedDays: zone.days,
  };
}

export function calculateUspsMediaMailShipping(totalWeightOz: number): ShippingCalculation {
  const billablePounds = Math.max(1, Math.ceil(totalWeightOz / 16));
  const baseCost =
    USPS_MEDIA_MAIL_RATES[billablePounds] ??
    USPS_MEDIA_MAIL_RATES[10] + ((billablePounds - 10) * USPS_MEDIA_MAIL_INCREMENTAL_RATE);

  return {
    method: 'media-mail',
    cost: baseCost,
    estimatedDays: 5,
  };
}

/**
 * Check if order qualifies for free shipping
 */
export function qualifiesForFreeShipping(subtotal: number): boolean {
  const threshold = parseInt(process.env.FREE_SHIPPING_THRESHOLD || '7500', 10);
  return subtotal >= threshold;
}

/**
 * Calculate complete order totals
 */
export function calculateOrderTotals(
  items: CartItemForTax[],
  shippingAddress: ShippingAddress | null | undefined,
  options: {
    taxExempt?: boolean;
    shippingMethod?: string;
  } = {}
): {
  subtotal: number;
  tax: TaxCalculation;
  shipping: ShippingCalculation;
  total: number;
} {
  const { taxExempt = false, shippingMethod = 'standard' } = options;

  // Calculate subtotal
  const subtotal = items.reduce((sum, item) => {
    return sum + (item.quantity * item.unitPrice);
  }, 0);

  // Calculate tax (all shipped goods are taxable in Tennessee unless customer exempt)
  const tax = calculateTax(items, shippingAddress, taxExempt);

  // Calculate shipping
  const totalWeight = calculateTotalWeight(items);
  const shipping =
    isBookOnlyOrder(items) && shippingMethod === 'standard'
      ? calculateUspsMediaMailShipping(totalWeight)
      : calculateShipping(
        totalWeight,
        shippingMethod,
        shippingAddress?.state || 'TN'
      );

  // Apply free shipping threshold
  if (qualifiesForFreeShipping(subtotal)) {
    shipping.cost = 0;
  }

  return {
    subtotal,
    tax,
    shipping,
    total: subtotal + tax.amount + shipping.cost,
  };
}
