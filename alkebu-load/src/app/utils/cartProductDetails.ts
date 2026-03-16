type Customization = Record<string, unknown> | undefined;

const asNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const asFiniteNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return value;
};

const normalizePriceToCents = (value: unknown): number | null => {
  const amount = asFiniteNumber(value);

  if (amount === null) return null;

  // Existing book prices are stored in cents, while apparel data is stored in dollars.
  return Math.round(amount >= 1000 ? amount : amount * 100);
};

const matchesText = (left: unknown, right: unknown): boolean => {
  const leftValue = asNonEmptyString(left);
  const rightValue = asNonEmptyString(right);

  if (!leftValue || !rightValue) {
    return false;
  }

  return leftValue.toLowerCase() === rightValue.toLowerCase();
};

const resolveBookEdition = (product: any, customization?: Customization) => {
  if (!Array.isArray(product?.editions) || product.editions.length === 0) {
    return null;
  }

  const requestedBinding = customization?.binding;

  if (requestedBinding) {
    const matchedEdition = product.editions.find((edition: any) =>
      matchesText(edition?.binding, requestedBinding),
    );

    if (matchedEdition) {
      return matchedEdition;
    }
  }

  return product.editions[0];
};

const resolveFashionVariation = (product: any, customization?: Customization) => {
  if (!Array.isArray(product?.variations) || product.variations.length === 0) {
    return null;
  }

  const requestedSku = customization?.variationSku;
  if (requestedSku) {
    const matchedBySku = product.variations.find((variation: any) =>
      matchesText(variation?.sku, requestedSku),
    );

    if (matchedBySku) {
      return matchedBySku;
    }
  }

  const requestedType = customization?.productType;
  const requestedSize = customization?.size;
  const requestedColor = customization?.color;

  const matchedVariation = product.variations.find((variation: any) => {
    const typeMatches = !requestedType || matchesText(variation?.productType, requestedType);
    const sizeMatches = !requestedSize || matchesText(variation?.size, requestedSize);
    const colorMatches = !requestedColor || matchesText(variation?.color, requestedColor);

    return typeMatches && sizeMatches && colorMatches;
  });

  return matchedVariation ?? product.variations[0];
};

export const resolveCartProductTitle = (
  product: any,
  customization?: Customization,
): string => {
  const fashionVariation = resolveFashionVariation(product, customization);

  return (
    asNonEmptyString(product?.title) ??
    asNonEmptyString(product?.name) ??
    asNonEmptyString(fashionVariation?.customVariationName) ??
    asNonEmptyString(product?.baseScent) ??
    asNonEmptyString(product?.primaryIngredient) ??
    'Untitled product'
  );
};

export const resolveCartProductUnitPrice = (
  product: any,
  customization?: Customization,
): number => {
  const bookEdition = resolveBookEdition(product, customization);
  const fashionVariation = resolveFashionVariation(product, customization);

  return (
    normalizePriceToCents(bookEdition?.pricing?.retailPrice) ??
    normalizePriceToCents(product?.pricing?.retailPrice) ??
    normalizePriceToCents(fashionVariation?.price) ??
    normalizePriceToCents(product?.price) ??
    0
  );
};

export const resolveCartStripePriceId = (
  product: any,
  customization?: Customization,
): string | undefined => {
  const bookEdition = resolveBookEdition(product, customization);
  const fashionVariation = resolveFashionVariation(product, customization);

  return (
    asNonEmptyString(bookEdition?.stripePriceId) ??
    asNonEmptyString(product?.stripePriceId) ??
    asNonEmptyString(fashionVariation?.stripePriceId) ??
    undefined
  );
};
