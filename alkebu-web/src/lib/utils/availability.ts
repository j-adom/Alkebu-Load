const APPROVED_VENDOR_KEYWORDS = [
  'ingram',
  'afrikan world',
  'lushena',
  'harper',
  'penguin',
];

const toNormalized = (value: string): string => value.trim().toLowerCase();

const getRelationName = (value: unknown): string | null => {
  if (!value) return null;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  if (typeof value === 'object') {
    const relation = value as Record<string, unknown>;
    if (typeof relation.name === 'string' && relation.name.trim()) {
      return relation.name.trim();
    }

    if ('value' in relation) {
      return getRelationName(relation.value);
    }
  }

  return null;
};

export const isApprovedVendorName = (name: string | null | undefined): boolean => {
  if (!name) return false;
  const normalized = toNormalized(name);
  return APPROVED_VENDOR_KEYWORDS.some((keyword) => normalized.includes(keyword));
};

export const getProductSupplierNames = (product: any): string[] => {
  const names = new Set<string>();

  const vendorName = getRelationName(product?.vendor);
  if (vendorName) names.add(vendorName);

  const publisherName = getRelationName(product?.publisher);
  if (publisherName) names.add(publisherName);

  if (typeof product?.publisherText === 'string' && product.publisherText.trim()) {
    names.add(product.publisherText.trim());
  }

  if (Array.isArray(product?.editions)) {
    for (const edition of product.editions) {
      const editionPublisher = getRelationName(edition?.publisher);
      if (editionPublisher) names.add(editionPublisher);
      if (typeof edition?.publisherText === 'string' && edition.publisherText.trim()) {
        names.add(edition.publisherText.trim());
      }
    }
  }

  return Array.from(names);
};

export const isVendorAvailableProduct = (product: any): boolean => {
  const supplierNames = getProductSupplierNames(product);
  return supplierNames.some((name) => isApprovedVendorName(name));
};
