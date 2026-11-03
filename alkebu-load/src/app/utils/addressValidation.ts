import type { ShippingAddress } from './taxShippingCalculations';
import { getShippoToken } from './shippingQuotes';

const SHIPPO_ADDRESSES_URL = 'https://api.goshippo.com/addresses/';
const VALIDATION_TIMEOUT_MS = 4000;
const CACHE_TTL_MS = 30 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;

export type SuggestedAddress = {
  street: string;
  city: string;
  state: string;
  zip: string;
};

/**
 * Advisory only: checkout never blocks on this. `unavailable` means Shippo
 * wasn't configured or didn't answer, and the address is used as entered.
 */
export type AddressValidationResult =
  | { status: 'valid'; messages: string[] }
  | { status: 'corrected'; suggested: SuggestedAddress; messages: string[] }
  | { status: 'invalid'; messages: string[] }
  | { status: 'unavailable' };

type FetchLike = typeof fetch;

// USPS standard abbreviations, so "Street" vs "St" isn't treated as a correction.
const ABBREVIATIONS: Record<string, string> = {
  STREET: 'ST', AVENUE: 'AVE', ROAD: 'RD', DRIVE: 'DR', BOULEVARD: 'BLVD',
  LANE: 'LN', COURT: 'CT', PLACE: 'PL', CIRCLE: 'CIR', TERRACE: 'TER',
  HIGHWAY: 'HWY', PARKWAY: 'PKWY', TRAIL: 'TRL', SQUARE: 'SQ', CENTER: 'CTR',
  PIKE: 'PIKE', NORTH: 'N', SOUTH: 'S', EAST: 'E', WEST: 'W',
  NORTHEAST: 'NE', NORTHWEST: 'NW', SOUTHEAST: 'SE', SOUTHWEST: 'SW',
  APARTMENT: 'APT', SUITE: 'STE', BUILDING: 'BLDG', FLOOR: 'FL', UNIT: 'UNIT',
};

const normalizeText = (value: string | undefined): string =>
  (value || '')
    .toUpperCase()
    .replace(/[.,#]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => ABBREVIATIONS[word] ?? word)
    .join(' ');

const zip5 = (value: string | undefined): string => (value || '').replace(/\D/g, '').slice(0, 5);

const differsMaterially = (entered: ShippingAddress, suggested: SuggestedAddress): boolean =>
  normalizeText(entered.street) !== normalizeText(suggested.street) ||
  normalizeText(entered.city) !== normalizeText(suggested.city) ||
  normalizeText(entered.state) !== normalizeText(suggested.state) ||
  zip5(entered.zip) !== zip5(suggested.zip);

const cache = new Map<string, { result: AddressValidationResult; expiresAt: number }>();

const cacheKey = (address: ShippingAddress): string =>
  [address.street, address.city, address.state, zip5(address.zip), address.country || 'US']
    .map((part) => normalizeText(part))
    .join('|');

const remember = (key: string, result: AddressValidationResult): void => {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
};

export const clearAddressValidationCache = (): void => cache.clear();

/**
 * Check a US shipping address with Shippo. Results are cached per address so
 * the debounced checkout preview doesn't re-validate on every keystroke or
 * shipping-method change. Failures are not cached.
 */
export async function validateShippingAddress(
  address: ShippingAddress,
  options: { fetchImpl?: FetchLike; timeoutMs?: number } = {},
): Promise<AddressValidationResult> {
  const token = getShippoToken();
  if (!token) return { status: 'unavailable' };

  if ((address.country || 'US').toUpperCase() !== 'US') return { status: 'unavailable' };

  const key = cacheKey(address);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.result;

  const { fetchImpl = fetch, timeoutMs = VALIDATION_TIMEOUT_MS } = options;

  try {
    const response = await fetchImpl(SHIPPO_ADDRESSES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `ShippoToken ${token}`,
      },
      body: JSON.stringify({
        name: 'Customer',
        street1: address.street || '',
        city: address.city || '',
        state: address.state || '',
        zip: address.zip || '',
        country: 'US',
        validate: true,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) return { status: 'unavailable' };

    type ShippoAddressResponse = {
      street1?: string;
      city?: string;
      state?: string;
      zip?: string;
      validation_results?: { is_valid?: unknown; messages?: Array<{ text?: unknown }> };
    };
    const data = (await response.json()) as ShippoAddressResponse;
    const validation = data?.validation_results;
    if (!validation || typeof validation.is_valid !== 'boolean') return { status: 'unavailable' };

    const messages: string[] = Array.isArray(validation.messages)
      ? validation.messages
        .map((message) => (typeof message?.text === 'string' ? message.text.trim() : ''))
        .filter(Boolean)
      : [];

    let result: AddressValidationResult;

    if (!validation.is_valid) {
      result = { status: 'invalid', messages };
    } else {
      const suggested: SuggestedAddress = {
        street: String(data.street1 || address.street || '').trim(),
        city: String(data.city || address.city || '').trim(),
        state: String(data.state || address.state || '').trim().toUpperCase(),
        zip: String(data.zip || address.zip || '').trim(),
      };
      result = differsMaterially(address, suggested)
        ? { status: 'corrected', suggested, messages }
        : { status: 'valid', messages };
    }

    remember(key, result);
    return result;
  } catch (error) {
    console.warn('Address validation unavailable:', error instanceof Error ? error.message : error);
    return { status: 'unavailable' };
  }
}
