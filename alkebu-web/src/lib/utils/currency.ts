const DEFAULT_LOCALE = 'en-US';
const DEFAULT_CURRENCY = 'USD';

export function formatCurrency(
  value: number | null | undefined,
  currency: string = DEFAULT_CURRENCY,
  locale: string = DEFAULT_LOCALE,
): string {
  const amount = typeof value === 'number' && Number.isFinite(value) ? value : 0;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCents(
  value: number | null | undefined,
  currency: string = DEFAULT_CURRENCY,
  locale: string = DEFAULT_LOCALE,
): string {
  const amount = typeof value === 'number' && Number.isFinite(value) ? value / 100 : 0;
  return formatCurrency(amount, currency, locale);
}

export function formatNumber(
  value: number | null | undefined,
  locale: string = DEFAULT_LOCALE,
  options: Intl.NumberFormatOptions = {},
): string {
  const amount = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat(locale, options).format(amount);
}
