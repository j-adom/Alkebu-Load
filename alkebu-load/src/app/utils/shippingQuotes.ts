import { createHash } from 'node:crypto';

import {
  calculateShipping,
  calculateTotalWeight,
  calculateUspsMediaMailShipping,
  qualifiesForFreeShipping,
  type CartItemForTax,
  type ShippingAddress,
} from './taxShippingCalculations';

const SHIPPO_API_BASE = 'https://api.goshippo.com';
const QUOTE_TTL_MS = 30 * 60 * 1000;
const DEFAULT_ALLOWED_CARRIERS = ['USPS', 'UPS', 'FEDEX'];

export type ShippingOption = {
  id: string;
  carrier: string;
  service: string;
  amount: number;
  estimatedDays: number;
  isDefault: boolean;
  isMediaMail: boolean;
  method: string;
  // Set on the single free option offered above FREE_SHIPPING_THRESHOLD. Its
  // carrier/service stay the real ones so staff know how to ship it.
  isFreeShipping?: boolean;
};

export type ShippingQuoteResult = {
  shippingOptions: ShippingOption[];
  selectedShippingRateId: string;
  selectedOption: ShippingOption;
  quoteExpiresAt: string;
  quoteSource: 'shippo' | 'estimated';
};

type FetchLike = typeof fetch;

type ShippoAddress = {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  email?: string;
  phone?: string;
};

const readEnv = (key: string): string | undefined => {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
};

export const isShippingQuoteExpired = (
  value: string | Date | null | undefined,
  now: number = Date.now(),
): boolean => {
  const expiresAt =
    value instanceof Date
      ? value.getTime()
      : typeof value === 'string'
        ? Date.parse(value)
        : Number.NaN;

  return !Number.isFinite(expiresAt) || expiresAt <= now;
};

const toSlug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const toCents = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value * 100);
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return Math.round(parsed * 100);
    }
  }

  return null;
};

const getEstimatedDays = (rate: Record<string, unknown>): number => {
  const direct = rate.estimated_days;
  if (typeof direct === 'number' && Number.isFinite(direct)) {
    return direct;
  }

  const durationTerms = rate.duration_terms;
  if (typeof durationTerms === 'string') {
    const match = durationTerms.match(/(\d+)/);
    if (match) {
      return Number.parseInt(match[1], 10);
    }
  }

  return 0;
};

const isBookOnlyOrder = (items: CartItemForTax[]): boolean =>
  items.length > 0 && items.every((item) => item.productType === 'books');

// Media Mail priced from the USPS table by the cart's real total weight
// (each book floored at its binding minimum in calculateTotalWeight).
const calculateEstimatedBookMediaMailShipping = (items: CartItemForTax[]) =>
  calculateUspsMediaMailShipping(calculateTotalWeight(items));

const getShipFromAddress = (): ShippoAddress => ({
  name: readEnv('SHIPPO_SHIP_FROM_NAME') || 'Alkebu-Lan Images',
  street1: readEnv('SHIPPO_SHIP_FROM_STREET1') || '2721 Jefferson St.',
  street2: readEnv('SHIPPO_SHIP_FROM_STREET2'),
  city: readEnv('SHIPPO_SHIP_FROM_CITY') || 'Nashville',
  state: readEnv('SHIPPO_SHIP_FROM_STATE') || 'TN',
  zip: readEnv('SHIPPO_SHIP_FROM_ZIP') || '37208',
  country: readEnv('SHIPPO_SHIP_FROM_COUNTRY') || 'US',
  email: readEnv('SHIPPO_SHIP_FROM_EMAIL') || 'info@alkebulanimages.com',
  phone: readEnv('SHIPPO_SHIP_FROM_PHONE') || '6153214111',
});

const buildAddressTo = (address: ShippingAddress): ShippoAddress => ({
  name: 'Customer',
  street1: address.street || '',
  city: address.city || '',
  state: address.state || '',
  zip: address.zip || '',
  country: address.country || 'US',
});

const buildParcel = (items: CartItemForTax[]) => {
  const totalWeightOz = Math.max(1, calculateTotalWeight(items));
  const booksOnly = isBookOnlyOrder(items);

  return {
    length: booksOnly ? '11' : '12',
    width: booksOnly ? '8.5' : '10',
    height: booksOnly ? String(Math.max(1, Math.ceil(totalWeightOz / 48))) : String(Math.max(4, Math.ceil(totalWeightOz / 32))),
    distance_unit: 'in',
    weight: String(totalWeightOz),
    mass_unit: 'oz',
  };
};

const buildMethod = (carrier: string, service: string, isMediaMail: boolean): string => {
  if (isMediaMail) return 'media-mail';

  const normalized = `${carrier} ${service}`.toLowerCase();

  if (normalized.includes('priority') || normalized.includes('express') || normalized.includes('2-day')) {
    return 'expedited';
  }

  return 'standard';
};

const normalizeShippoRates = (
  rates: unknown[],
  items: CartItemForTax[],
): ShippingOption[] => {
  const booksOnly = isBookOnlyOrder(items);
  const normalized: ShippingOption[] = [];
  const seen = new Set<string>();

  for (const entry of rates) {
    if (!entry || typeof entry !== 'object') continue;
    const rate = entry as Record<string, unknown>;

    const carrier = String(rate.provider || rate.carrier_account || '').trim().toUpperCase();
    if (!DEFAULT_ALLOWED_CARRIERS.includes(carrier)) continue;

    const serviceLevel = (rate.servicelevel && typeof rate.servicelevel === 'object')
      ? rate.servicelevel as Record<string, unknown>
      : {};
    const serviceName = String(serviceLevel.name || serviceLevel.token || rate.servicelevel_name || '').trim();
    const rateId = String(rate.object_id || '').trim();
    const amount = toCents(rate.amount_local ?? rate.amount);

    if (!rateId || !serviceName || amount === null) continue;

    const isMediaMail = /media mail/i.test(serviceName) || /media_mail/i.test(String(serviceLevel.token || ''));
    const dedupeKey = `${carrier}:${serviceName}:${amount}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    normalized.push({
      id: rateId,
      carrier,
      service: serviceName,
      amount,
      estimatedDays: getEstimatedDays(rate),
      isDefault: false,
      isMediaMail,
      method: buildMethod(carrier, serviceName, isMediaMail),
    });
  }

  normalized.sort((a, b) => a.amount - b.amount || a.estimatedDays - b.estimatedDays);

  if (booksOnly) {
    return normalized;
  }

  return normalized.filter((option) => !option.isMediaMail);
};

const cheapestOption = (options: ShippingOption[]): ShippingOption | null =>
  options.reduce<ShippingOption | null>(
    (best, option) =>
      !best ||
      option.amount < best.amount ||
      (option.amount === best.amount && option.estimatedDays < best.estimatedDays)
        ? option
        : best,
    null,
  );

// Book-only carts default to Media Mail; everything else to the cheapest rate.
const chooseDefaultShippingOption = (
  options: ShippingOption[],
  items: CartItemForTax[],
): ShippingOption | null => {
  if (!options.length) return null;

  if (isBookOnlyOrder(items)) {
    const mediaMail = options.find((option) => option.isMediaMail);
    if (mediaMail) return mediaMail;
  }

  return cheapestOption(options);
};

/**
 * Above the free-shipping threshold, offer one free option (the method we'd
 * pick by default: Media Mail for books, otherwise the cheapest) and price
 * every other method as an upgrade: what it costs beyond that free baseline.
 * Methods no dearer than the baseline are dropped as redundant.
 */
const withFreeShipping = (
  options: ShippingOption[],
  subtotal: number,
  items: CartItemForTax[],
): ShippingOption[] => {
  if (!qualifiesForFreeShipping(subtotal)) {
    return options;
  }

  const baseline = chooseDefaultShippingOption(options, items);
  if (!baseline) return options;

  const free: ShippingOption = { ...baseline, amount: 0, isFreeShipping: true };
  const upgrades = options
    .filter((option) => option.id !== baseline.id && option.amount > baseline.amount)
    .map((option) => ({ ...option, amount: option.amount - baseline.amount }));

  return [free, ...upgrades];
};

const buildEstimatedMediaMailOption = (items: CartItemForTax[]): ShippingOption => {
  const mediaMail = calculateEstimatedBookMediaMailShipping(items);
  return {
    id: 'best-available-media-mail',
    carrier: 'USPS',
    service: 'Media Mail',
    amount: mediaMail.cost,
    estimatedDays: mediaMail.estimatedDays,
    isDefault: true,
    isMediaMail: true,
    method: mediaMail.method,
  };
};

/**
 * Shippo's USPS integration doesn't return Media Mail rates, so book-only
 * carts would otherwise lose it. Add the USPS-table Media Mail option to a
 * live quote whenever Shippo didn't supply one.
 */
const withEstimatedMediaMail = (
  options: ShippingOption[],
  items: CartItemForTax[],
): ShippingOption[] => {
  if (!isBookOnlyOrder(items) || options.some((option) => option.isMediaMail)) {
    return options;
  }

  return [buildEstimatedMediaMailOption(items), ...options];
};

const buildFallbackOptions = (
  items: CartItemForTax[],
  shippingAddress: ShippingAddress,
): ShippingOption[] => {
  const totalWeightOz = calculateTotalWeight(items);
  const options: ShippingOption[] = [];

  if (isBookOnlyOrder(items)) {
    options.push(buildEstimatedMediaMailOption(items));
  }

  const standard = calculateShipping(totalWeightOz, 'standard', shippingAddress.state || 'TN');
  options.push({
    id: 'best-available-standard',
    carrier: 'Best Available',
    service: 'Standard',
    amount: standard.cost,
    estimatedDays: standard.estimatedDays,
    isDefault: !options.length,
    isMediaMail: false,
    method: standard.method,
  });

  const expedited = calculateShipping(totalWeightOz, 'expedited', shippingAddress.state || 'TN');
  options.push({
    id: 'best-available-expedited',
    carrier: 'Best Available',
    service: 'Expedited',
    amount: expedited.cost,
    estimatedDays: expedited.estimatedDays,
    isDefault: false,
    isMediaMail: false,
    method: expedited.method,
  });

  return options;
};

export const buildShippingQuoteFingerprint = (
  items: CartItemForTax[],
  shippingAddress: ShippingAddress,
  taxExempt: boolean,
): string => {
  const payload = JSON.stringify({
    items: items.map((item) => ({
      productType: item.productType,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      shippingWeight: item.product?.pricing?.shippingWeight ?? null,
      editionWeights: (item.product?.editions || []).map((edition) => ({
        binding: edition.binding ?? null,
        shippingWeight: edition.pricing?.shippingWeight ?? null,
      })),
    })),
    shippingAddress: {
      street: shippingAddress.street || '',
      city: shippingAddress.city || '',
      state: shippingAddress.state || '',
      zip: shippingAddress.zip || '',
      country: shippingAddress.country || 'US',
    },
    taxExempt,
  });

  return createHash('sha256').update(payload).digest('hex');
};

export const getShippingQuoteExpiry = (): string =>
  new Date(Date.now() + QUOTE_TTL_MS).toISOString();

// Coolify stores the live key as SHIPPO_API_KEY; older docs used SHIPPO_API_TOKEN.
// Accept both so a naming mismatch never silently disables live rates.
export const getShippoToken = (): string | undefined =>
  readEnv('SHIPPO_API_TOKEN') || readEnv('SHIPPO_API_KEY');

export const isShippoConfigured = (): boolean => Boolean(getShippoToken());

export async function getShippingQuotes(
  args: {
    items: CartItemForTax[];
    shippingAddress: ShippingAddress;
    subtotal: number;
    selectedShippingRateId?: string | null;
    fetchImpl?: FetchLike;
  },
): Promise<ShippingQuoteResult> {
  const {
    items,
    shippingAddress,
    subtotal,
    selectedShippingRateId,
    fetchImpl = fetch,
  } = args;

  const shippoToken = getShippoToken();

  let options: ShippingOption[] = [];
  let quoteSource: 'shippo' | 'estimated' = 'shippo';

  if (shippoToken) {
    try {
      const response = await fetchImpl(`${SHIPPO_API_BASE}/shipments/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `ShippoToken ${shippoToken}`,
        },
        body: JSON.stringify({
          address_from: getShipFromAddress(),
          address_to: buildAddressTo(shippingAddress),
          parcels: [buildParcel(items)],
          async: false,
        }),
      });

      const data = await response.json() as Record<string, unknown>;

      if (!response.ok) {
        const message =
          typeof data.detail === 'string'
            ? data.detail
            : typeof data.error === 'string'
              ? data.error
              : 'Shippo quote request failed';
        throw new Error(message);
      }

      const rates = Array.isArray(data.rates) ? data.rates : [];
      options = normalizeShippoRates(rates, items);

      if (!options.length) {
        throw new Error('Shippo returned no usable shipping rates');
      }

      options = withEstimatedMediaMail(options, items);
    } catch (error) {
      console.warn(
        'Using estimated shipping quotes after Shippo quote failure:',
        error,
      );
      quoteSource = 'estimated';
      options = buildFallbackOptions(items, shippingAddress);
    }
  } else {
    quoteSource = 'estimated';
    options = buildFallbackOptions(items, shippingAddress);
  }

  if (!options.length) {
    throw new Error('No shipping rates available for this address');
  }

  options = withFreeShipping(options, subtotal, items);

  const defaultOption = chooseDefaultShippingOption(options, items);
  if (!defaultOption) {
    throw new Error('No default shipping rate available');
  }

  const selectedOption =
    options.find((option) => option.id === selectedShippingRateId) ||
    defaultOption;

  options = options
    .map((option) => ({
      ...option,
      isDefault: option.id === selectedOption.id,
    }))
    .sort((a, b) => a.amount - b.amount || a.estimatedDays - b.estimatedDays);

  return {
    shippingOptions: options,
    selectedShippingRateId: selectedOption.id,
    selectedOption,
    quoteExpiresAt: getShippingQuoteExpiry(),
    quoteSource,
  };
}

export const formatShippingMethodLabel = (
  option: Pick<ShippingOption, 'carrier' | 'service' | 'isFreeShipping'>,
): string =>
  option.isFreeShipping ? 'Free Shipping' : `${option.carrier} ${option.service}`.trim();

export const getShippingMethodCode = (option: ShippingOption): string => {
  if (option.isMediaMail) return 'media_mail';
  if (option.method === 'expedited') return 'expedited';
  return 'standard';
};
