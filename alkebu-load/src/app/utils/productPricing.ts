/**
 * Price units are declared per collection, never inferred.
 *
 * The previous implementation guessed from magnitude (`amount >= 1000 ? cents : dollars`),
 * which mis-priced any cents value below $10.00 and any dollars value above $1000.
 */
export const PRICE_UNITS: Record<string, 'cents' | 'dollars'> = {
  books: 'cents',
  'fashion-jewelry': 'dollars',
  'wellness-lifestyle': 'cents',
  'oils-incense': 'cents',
};

export const toCents = (value: unknown, collection: string): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;

  const unit = PRICE_UNITS[collection];
  if (!unit) return null;

  return Math.round(unit === 'dollars' ? value * 100 : value);
};
