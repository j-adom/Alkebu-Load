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
};

export type ShippingQuoteResult = {
  shippingOptions: ShippingOption[];
  selectedShippingRateId: string;
  selectedOption: ShippingOption;
  quoteExpiresAt: string;
  quoteSource: 'shippo' | 'fallback';
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

const chooseDefaultShippingOption = (
  options: ShippingOption[],
  items: CartItemForTax[],
): ShippingOption | null => {
  if (!options.length) return null;

  if (isBookOnlyOrder(items)) {
    return options.find((option) => option.isMediaMail) || options[0];
  }

  return options.find((option) => option.method === 'standard') || options[0];
};

const withFreeShipping = (options: ShippingOption[], subtotal: number): ShippingOption[] => {
  if (!qualifiesForFreeShipping(subtotal)) {
    return options;
  }

  return options.map((option) => ({
    ...option,
    amount: 0,
  }));
};

const buildFallbackOptions = (
  items: CartItemForTax[],
  shippingAddress: ShippingAddress,
  subtotal: number,
): ShippingOption[] => {
  const totalWeightOz = calculateTotalWeight(items);
  const options: ShippingOption[] = [];

  if (isBookOnlyOrder(items)) {
    const mediaMail = calculateUspsMediaMailShipping(totalWeightOz);
    options.push({
      id: 'fallback-media-mail',
      carrier: 'USPS',
      service: 'Media Mail',
      amount: mediaMail.cost,
      estimatedDays: mediaMail.estimatedDays,
      isDefault: true,
      isMediaMail: true,
      method: mediaMail.method,
    });
  }

  const standard = calculateShipping(totalWeightOz, 'standard', shippingAddress.state || 'TN');
  options.push({
    id: 'fallback-standard',
    carrier: 'Fallback',
    service: 'Standard',
    amount: standard.cost,
    estimatedDays: standard.estimatedDays,
    isDefault: !options.length,
    isMediaMail: false,
    method: standard.method,
  });

  const expedited = calculateShipping(totalWeightOz, 'expedited', shippingAddress.state || 'TN');
  options.push({
    id: 'fallback-expedited',
    carrier: 'Fallback',
    service: 'Expedited',
    amount: expedited.cost,
    estimatedDays: expedited.estimatedDays,
    isDefault: false,
    isMediaMail: false,
    method: expedited.method,
  });

  return withFreeShipping(options, subtotal);
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

export const isShippoConfigured = (): boolean => Boolean(readEnv('SHIPPO_API_TOKEN'));

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

  const shippoToken = readEnv('SHIPPO_API_TOKEN');

  let options: ShippingOption[] = [];
  let quoteSource: 'shippo' | 'fallback' = 'shippo';

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
    } catch (error) {
      console.warn(
        'Falling back to static shipping quotes after Shippo quote failure:',
        error,
      );
      quoteSource = 'fallback';
      options = buildFallbackOptions(items, shippingAddress, subtotal);
    }
  } else {
    quoteSource = 'fallback';
    options = buildFallbackOptions(items, shippingAddress, subtotal);
  }

  if (!options.length) {
    throw new Error('No shipping rates available for this address');
  }

  options = withFreeShipping(options, subtotal);

  const defaultOption = chooseDefaultShippingOption(options, items);
  if (!defaultOption) {
    throw new Error('No default shipping rate available');
  }

  const selectedOption =
    options.find((option) => option.id === selectedShippingRateId) ||
    defaultOption;

  options = options.map((option) => ({
    ...option,
    isDefault: option.id === selectedOption.id,
  }));

  return {
    shippingOptions: options,
    selectedShippingRateId: selectedOption.id,
    selectedOption,
    quoteExpiresAt: getShippingQuoteExpiry(),
    quoteSource,
  };
}

export const formatShippingMethodLabel = (option: Pick<ShippingOption, 'carrier' | 'service'>): string =>
  `${option.carrier} ${option.service}`.trim();

export const getShippingMethodCode = (option: ShippingOption): string => {
  if (option.isMediaMail) return 'media_mail';
  if (option.method === 'expedited') return 'expedited';
  return 'standard';
};
