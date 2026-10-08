/**
 * Maps stored cart items to the line-item shape order emails render.
 *
 * The full mapping (staff view) carries everything the identifiers snapshot
 * captured at add-to-cart time — ISBN, SKU, edition/binding, publisher — plus
 * the author and storefront link resolved from the populated product doc.
 * Customer confirmations get the same items with internal fields stripped.
 */

import type { EmailLineItem } from './emailService';
import { describeWellnessVariation, resolveWellnessVariation } from './cartProductDetails';
import { buildProductPageUrl, resolveRelatedProductDoc } from './productUrls';

const asNonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

const resolveAuthor = (productDoc: Record<string, unknown> | null): string | undefined => {
  if (!productDoc || !Array.isArray(productDoc.authorsText)) return undefined;
  const names = productDoc.authorsText
    .map((entry) => asNonEmptyString((entry as Record<string, unknown> | null)?.name))
    .filter((name): name is string => Boolean(name));
  return names.length ? names.join(', ') : undefined;
};

// Scent/size of the purchased variation, matched by the sku captured at
// add-to-cart. Omitted when the title already carries it (lines added since
// resolveCartProductTitle started appending it) so it isn't shown twice.
const resolveVariant = (item: any, productDoc: Record<string, unknown> | null): string | undefined => {
  const sku = asNonEmptyString(item.identifiers?.sku);
  if (!productDoc || !sku) return undefined;
  const label = describeWellnessVariation(
    productDoc,
    resolveWellnessVariation(productDoc, { variationSku: sku }),
  );
  if (!label || String(item.productTitle ?? '').includes(label)) return undefined;
  return label;
};

export function buildOrderEmailLineItems(cartItems: any[]): EmailLineItem[] {
  return cartItems.map((item) => {
    const productDoc = resolveRelatedProductDoc(item.product);
    return {
      productTitle: item.productTitle,
      variant: resolveVariant(item, productDoc),
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.quantity * item.unitPrice,
      isbn: asNonEmptyString(item.identifiers?.isbn),
      edition: asNonEmptyString(item.identifiers?.edition),
      sku: asNonEmptyString(item.identifiers?.sku),
      publisher: asNonEmptyString(item.identifiers?.publisher),
      author: resolveAuthor(productDoc),
      productUrl: buildProductPageUrl(item.productType, productDoc),
    };
  });
}

export function toCustomerLineItems(items: EmailLineItem[]): EmailLineItem[] {
  return items.map(({ sku: _sku, publisher: _publisher, ...customerItem }) => customerItem);
}
