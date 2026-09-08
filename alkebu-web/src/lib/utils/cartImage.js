/** Resolve Payload's polymorphic relationship without exposing unresolved IDs. */
export function cartProduct(item) {
  const product = item?.product;
  if (!product || typeof product !== 'object') return null;
  return 'value' in product
    ? (product.value && typeof product.value === 'object' ? product.value : null)
    : product;
}

function asImage(value) {
  if (typeof value === 'string') {
    return /^(https?:\/\/|\/)/.test(value) ? { url: value } : null;
  }
  if (!value || typeof value !== 'object') return null;
  if (value.image) {
    const nested = asImage(value.image);
    if (nested) return nested;
  }
  return typeof value.url === 'string' && value.url.trim() ? value : null;
}

/** Preserve Media metadata and fall through unpopulated relationships. */
export function cartImage(item) {
  const product = cartProduct(item);
  const candidates = [
    item?.image,
    ...(product?.images || []),
    product?.featuredImage,
    product?.coverImage,
    ...(product?.scrapedImageUrls || []),
  ];
  for (const candidate of candidates) {
    const image = asImage(candidate);
    if (image) return image;
  }
  return null;
}
