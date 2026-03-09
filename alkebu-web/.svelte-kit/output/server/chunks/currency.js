const DEFAULT_LOCALE = "en-US";
const DEFAULT_CURRENCY = "USD";
function formatCurrency(value, currency = DEFAULT_CURRENCY, locale = DEFAULT_LOCALE) {
  const amount = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}
export {
  formatCurrency as f
};
