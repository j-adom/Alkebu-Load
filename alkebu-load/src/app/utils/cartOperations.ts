import type { Payload } from 'payload';
import {
  calculateTax,
  calculateShipping,
  calculateTotalWeight,
  calculateOrderTotals,
  type CartItemForTax,
  type ShippingAddress,
} from './taxShippingCalculations';
import { sendAbandonedCartEmail, type AbandonedCartData } from './emailService';

const AVAILABLE_VENDOR_KEYWORDS = [
  'ingram',
  'afrikan world',
  'lushena',
  'harper',
  'penguin',
];

const getRelationValue = (value: unknown): unknown => {
  if (!value || typeof value !== 'object') return value;
  if ('value' in (value as Record<string, unknown>)) {
    return (value as Record<string, unknown>).value;
  }
  return value;
};

const hasAllowedVendorKeyword = (name: string): boolean => {
  const normalized = name.toLowerCase();
  return AVAILABLE_VENDOR_KEYWORDS.some((keyword) => normalized.includes(keyword));
};

async function resolveRelatedName(
  payload: Payload,
  relation: unknown,
  collection: 'vendors' | 'publishers',
): Promise<string | null> {
  if (!relation) return null;

  const relationValue = getRelationValue(relation);

  if (relationValue && typeof relationValue === 'object') {
    const relationObj = relationValue as Record<string, unknown>;
    if (typeof relationObj.name === 'string' && relationObj.name.trim()) {
      return relationObj.name.trim();
    }
    if ('id' in relationObj) {
      relation = relationObj.id;
    }
  } else {
    relation = relationValue;
  }

  if (typeof relation === 'number' || typeof relation === 'string') {
    const relationId = String(relation).trim();
    if (!relationId) return null;

    try {
      const doc = await payload.findByID({
        collection,
        id: relationId as any,
      });
      if (doc && typeof (doc as any).name === 'string' && (doc as any).name.trim()) {
        return (doc as any).name.trim();
      }
    } catch {
      // If lookup fails, relation may already be a plain-text name.
      if (typeof relation === 'string' && relation.trim()) {
        return relation.trim();
      }
    }
  }

  return null;
}

async function getSupplierNames(payload: Payload, product: any): Promise<string[]> {
  const names = new Set<string>();

  const vendorName = await resolveRelatedName(payload, product?.vendor, 'vendors');
  if (vendorName) {
    names.add(vendorName);
  }

  const publisherName = await resolveRelatedName(payload, product?.publisher, 'publishers');
  if (publisherName) {
    names.add(publisherName);
  }

  if (typeof product?.publisherText === 'string' && product.publisherText.trim()) {
    names.add(product.publisherText.trim());
  }

  if (Array.isArray(product?.editions)) {
    for (const edition of product.editions) {
      const editionPublisher = await resolveRelatedName(payload, edition?.publisher, 'publishers');
      if (editionPublisher) {
        names.add(editionPublisher);
      }
      if (typeof edition?.publisherText === 'string' && edition.publisherText.trim()) {
        names.add(edition.publisherText.trim());
      }
    }
  }

  return Array.from(names);
}

async function isVendorAvailableForBackorder(
  payload: Payload,
  product: any,
): Promise<boolean> {
  const supplierNames = await getSupplierNames(payload, product);
  return supplierNames.some(hasAllowedVendorKeyword);
}

/**
 * Convert Payload cart items to CartItemForTax format
 */
function mapCartItemsForTax(items: any[]): CartItemForTax[] {
  return items.map((item) => {
    // Extract product data from polymorphic relationship
    let productData: any = null;
    if (typeof item.product === 'object' && item.product !== null) {
      // Handle polymorphic relationship format { relationTo, value }
      if ('value' in item.product && typeof item.product.value === 'object') {
        productData = item.product.value;
      } else {
        productData = item.product;
      }
    }
    return {
      product: productData ? { pricing: productData.pricing } : { pricing: {} },
      productType: item.productType || 'books',
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || 0,
    };
  });
}

/**
 * Convert cart shipping address to ShippingAddress format
 */
function normalizeShippingAddress(addr: any): ShippingAddress | undefined {
  if (!addr) return undefined;
  return {
    street: addr.street || undefined,
    city: addr.city || undefined,
    state: addr.state || undefined,
    zip: addr.zip || undefined,
    country: addr.country || 'US',
  };
}

export interface CartItem {
  productId: string;
  productType: string;
  quantity: number;
  customization?: {
    giftWrap?: boolean;
    giftMessage?: string;
    personalNote?: string;
  };
}

export interface CartSummary {
  id: string;
  itemCount: number;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  items: any[];
}

/**
 * Add item to cart using Local API for performance
 */
export async function addToCart(
  payload: Payload,
  cartId: string,
  item: CartItem,
  sessionId?: string
): Promise<{ success: boolean; cartItem?: any; error?: string }> {
  try {
    // Get product details
    const product = await payload.findByID({
      collection: item.productType as any,
      id: item.productId,
    });

    if (!product) {
      return { success: false, error: 'Product not found' };
    }

    // Check inventory/availability rules.
    const stockLevel =
      typeof product?.inventory?.stockLevel === 'number'
        ? product.inventory.stockLevel
        : 0;
    const trackQuantity = Boolean(product?.inventory?.trackQuantity);
    const allowBackorders = Boolean(product?.inventory?.allowBackorders);
    const inStockForQuantity = !trackQuantity || stockLevel >= item.quantity;

    if (!inStockForQuantity) {
      const vendorAvailable = await isVendorAvailableForBackorder(payload, product);
      if (!allowBackorders && !vendorAvailable) {
        return {
          success: false,
          error: `Only ${stockLevel} items available in stock`,
        };
      }
    }

    // Get or create cart
    let cart;
    if (cartId) {
      cart = await payload.findByID({
        collection: 'carts',
        id: cartId,
      });
    }

    if (!cart && sessionId) {
      // Create new cart for session
      cart = await payload.create({
        collection: 'carts',
        data: {
          sessionId,
          status: 'active',
          totalAmount: 0,
        },
      });
    }

    if (!cart) {
      return { success: false, error: 'Unable to create or find cart' };
    }

    // Check if item already exists in cart. We filter in memory because
    // polymorphic relationship queries on `product` are unreliable across adapters.
    const existingItems = await payload.find({
      collection: 'cart-items',
      where: {
        cart: { equals: cart.id },
      },
      depth: 0,
      limit: 100,
    });

    const existing = existingItems.docs.find((cartItem: any) => {
      const relation = cartItem?.product;
      let relatedProductId: unknown = relation;
      let relatedProductType: unknown = cartItem?.productType;

      if (relation && typeof relation === 'object') {
        if ('value' in relation) {
          relatedProductId = relation.value;
        }
        if ('relationTo' in relation) {
          relatedProductType = relation.relationTo;
        }
      }

      if (
        relatedProductId &&
        typeof relatedProductId === 'object' &&
        'id' in (relatedProductId as Record<string, unknown>)
      ) {
        relatedProductId = (relatedProductId as Record<string, unknown>).id;
      }

      return (
        String(relatedProductId) === String(item.productId) &&
        String(relatedProductType) === String(item.productType)
      );
    });

    let cartItem;
    if (existing) {
      // Update existing item quantity
      cartItem = await payload.update({
        collection: 'cart-items',
        id: existing.id,
        data: {
          quantity: existing.quantity + item.quantity,
          customization: item.customization || existing.customization,
        },
      });
    } else {
      // Create new cart item
      cartItem = await (payload as any).create({
        collection: 'cart-items',
        data: {
          cart: cart.id,
          product: {
            relationTo: (item as any).productType as any,
            value: (item as any).productId,
          },
          productType: (item as any).productType,
          productTitle: (product as any).title,
          quantity: (item as any).quantity,
          unitPrice: (product as any).pricing?.retailPrice || 0,
          stripePriceId: (product as any).stripePriceId,
          customization: item.customization,
          availability: {
            inStock: inStockForQuantity,
            stockLevel,
          },
        },
      });
    }

    // Update cart totals
    await updateCartTotals(payload, String(cart.id));

    return { success: true, cartItem };

  } catch (error) {
    console.error('Error adding to cart:', error);
    return { success: false, error: 'Failed to add item to cart' };
  }
}

/**
 * Remove item from cart
 */
export async function removeFromCart(
  payload: Payload,
  cartId: string,
  cartItemId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify cart item belongs to cart
    const cartItem = await payload.findByID({
      collection: 'cart-items',
      id: cartItemId,
    });

    if (!cartItem || (String(typeof cartItem.cart === 'object' ? cartItem.cart.id : cartItem.cart)) !== String(cartId)) {
      return { success: false, error: 'Cart item not found or unauthorized' };
    }

    // Delete cart item
    await payload.delete({
      collection: 'cart-items',
      id: cartItemId,
    });

    // Update cart totals
    await updateCartTotals(payload, cartId);

    return { success: true };

  } catch (error) {
    console.error('Error removing from cart:', error);
    return { success: false, error: 'Failed to remove item from cart' };
  }
}

/**
 * Update cart item quantity
 */
export async function updateCartItemQuantity(
  payload: Payload,
  cartId: string,
  cartItemId: string,
  quantity: number
): Promise<{ success: boolean; error?: string }> {
  try {
    if (quantity <= 0) {
      return removeFromCart(payload, cartId, cartItemId);
    }

    // Get cart item with product details
    const cartItem = await payload.findByID({
      collection: 'cart-items',
      id: cartItemId,
      depth: 2,
    });

    if (!cartItem || (String(typeof cartItem.cart === 'object' ? cartItem.cart.id : cartItem.cart)) !== String(cartId)) {
      return { success: false, error: 'Cart item not found or unauthorized' };
    }

    // Check inventory/availability rules
    const product = getRelationValue(cartItem.product) as any;
    const stockLevel =
      typeof product?.inventory?.stockLevel === 'number'
        ? product.inventory.stockLevel
        : 0;
    const trackQuantity = Boolean(product?.inventory?.trackQuantity);
    const allowBackorders = Boolean(product?.inventory?.allowBackorders);
    const inStockForQuantity = !trackQuantity || stockLevel >= quantity;

    if (!inStockForQuantity) {
      const vendorAvailable = await isVendorAvailableForBackorder(payload, product);
      if (!allowBackorders && !vendorAvailable) {
        return {
          success: false,
          error: `Only ${stockLevel} items available in stock`,
        };
      }
    }

    // Update quantity
    await (payload as any).update({
      collection: 'cart-items',
      id: cartItemId,
      data: {
        quantity,
        availability: {
          inStock: inStockForQuantity,
          stockLevel,
        },
      },
    });

    // Update cart totals
    await updateCartTotals(payload, cartId);

    return { success: true };

  } catch (error) {
    console.error('Error updating cart item quantity:', error);
    return { success: false, error: 'Failed to update quantity' };
  }
}

/**
 * Get cart summary with totals
 */
export async function getCartSummary(
  payload: Payload,
  cartId: string
): Promise<CartSummary | null> {
  try {
    const cart = await payload.findByID({
      collection: 'carts',
      id: cartId,
      depth: 3,
    });

    if (!cart) {
      return null;
    }

    const items = await payload.find({
      collection: 'cart-items',
      where: {
        cart: { equals: cartId },
      },
      depth: 2,
    });

    // Build items for tax calculation
    const taxItems = mapCartItemsForTax(items.docs);

    // Calculate totals using unified calculation (respects book tax exemption)
    const totals = (calculateOrderTotals as any)(taxItems, normalizeShippingAddress((cart as any).shippingAddress), {
      taxExempt: (cart as any).taxExempt || false,
      shippingMethod: 'standard',
    });

    return {
      id: String(cart.id),
      itemCount: items.docs.reduce((count, item) => count + (item.quantity || 0), 0),
      subtotal: totals.subtotal,
      tax: totals.tax.amount,
      shipping: totals.shipping.cost,
      total: totals.total,
      items: items.docs as any,
    };

  } catch (error) {
    console.error('Error getting cart summary:', error);
    return null;
  }
}

/**
 * Clear entire cart
 */
export async function clearCart(
  payload: Payload,
  cartId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete all cart items
    const items = await payload.find({
      collection: 'cart-items',
      where: {
        cart: { equals: cartId },
      },
    });

    for (const item of items.docs) {
      await payload.delete({
        collection: 'cart-items',
        id: item.id,
      });
    }

    // Update cart
    await payload.update({
      collection: 'carts',
      id: cartId,
      data: {
        totalAmount: 0,
        totalTax: 0,
        status: 'active',
      },
    });

    return { success: true };

  } catch (error) {
    console.error('Error clearing cart:', error);
    return { success: false, error: 'Failed to clear cart' };
  }
}

/**
 * Update cart shipping address
 */
export async function updateCartShipping(
  payload: Payload,
  cartId: string,
  shippingAddress: any
): Promise<{ success: boolean; error?: string }> {
  try {
    await payload.update({
      collection: 'carts',
      id: cartId,
      data: {
        shippingAddress,
      },
    });

    // Recalculate totals with new address (for tax calculation)
    await updateCartTotals(payload, cartId);

    return { success: true };

  } catch (error) {
    console.error('Error updating cart shipping:', error);
    return { success: false, error: 'Failed to update shipping address' };
  }
}

/**
 * Mark cart as abandoned (for abandoned cart recovery)
 */
export async function markCartAbandoned(
  payload: Payload,
  cartId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await payload.update({
      collection: 'carts',
      id: cartId,
      data: {
        status: 'abandoned',
      },
    });

    return { success: true };

  } catch (error) {
    console.error('Error marking cart as abandoned:', error);
    return { success: false, error: 'Failed to mark cart as abandoned' };
  }
}

/**
 * Internal helper to recalculate cart totals
 */
async function updateCartTotals(payload: Payload, cartId: string): Promise<void> {
  try {
    const cart = await payload.findByID({
      collection: 'carts',
      id: cartId,
      depth: 1,
    });

    const items = await payload.find({
      collection: 'cart-items',
      where: {
        cart: { equals: cartId },
      },
      depth: 2,
    });

    // Build items for tax calculation
    const taxItems = mapCartItemsForTax(items.docs);

    // Calculate totals using unified calculation (respects book tax exemption)
    const totals = (calculateOrderTotals as any)(taxItems, normalizeShippingAddress((cart as any).shippingAddress), {
      taxExempt: (cart as any).taxExempt || false,
      shippingMethod: 'standard',
    });

    // Update cart with new totals
    await (payload as any).update({
      collection: 'carts',
      id: String(cartId),
      data: {
        totalAmount: totals.total,
        totalTax: totals.tax.amount,
        shippingAmount: totals.shipping.cost,
        lastActivity: new Date().toISOString(),
      } as any,
    });

  } catch (error) {
    console.error('Error updating cart totals:', error);
    throw error;
  }
}

/**
 * Find or create cart for user/session
 */
export async function findOrCreateCart(
  payload: Payload,
  userId?: string,
  sessionId?: string
): Promise<any> {
  try {
    const whereClause: any = {
      status: { equals: 'active' },
    };

    if (userId) {
      whereClause.user = { equals: userId };
    } else if (sessionId) {
      whereClause.sessionId = { equals: sessionId };
    } else {
      throw new Error('Either userId or sessionId is required');
    }

    // Find existing active cart
    const carts = await payload.find({
      collection: 'carts',
      where: whereClause,
      limit: 1,
    });

    if (carts.docs.length > 0) {
      return carts.docs[0];
    }

    // Create new cart
    const cartData: any = {
      status: 'active',
      totalAmount: 0,
      totalTax: 0,
    };

    if (userId) {
      cartData.user = userId;
      cartData.sessionId = `user_${userId}_${Date.now()}`;
    } else {
      cartData.sessionId = sessionId;
    }

    return await payload.create({
      collection: 'carts',
      data: cartData,
    });

  } catch (error) {
    console.error('Error finding or creating cart:', error);
    throw error;
  }
}

/**
 * Cleanup abandoned carts and send recovery emails (run via cron job)
 */
export async function cleanupAbandonedCarts(payload: Payload): Promise<void> {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // Find active carts older than 1 hour that haven't had abandoned email sent
    const abandonedCarts = await payload.find({
      collection: 'carts',
      where: {
        and: [
          { status: { equals: 'active' } },
          { lastActivity: { less_than: oneHourAgo } },
          { abandonedEmailSent: { not_equals: true } },
        ],
      },
      depth: 2,
    });

    for (const cart of abandonedCarts.docs) {
      // Get cart items for email
      const items = await payload.find({
        collection: 'cart-items',
        where: {
          cart: { equals: cart.id },
        },
        depth: 2,
      });

      if (items.docs.length === 0) {
        // Empty cart - just mark as abandoned without email
        await payload.update({
          collection: 'carts',
          id: cart.id,
          data: {
            status: 'abandoned',
          },
        });
        continue;
      }

      // Determine customer email
      let customerEmail = '';
      let customerName = '';

      if (cart.user && typeof cart.user === 'object') {
        customerEmail = (cart.user as any).email;
        customerName = (cart.user as any).name || '';
      } else if (cart.guestEmail) {
        customerEmail = cart.guestEmail;
      }

      if (!customerEmail) {
        console.log(`No email found for abandoned cart ${cart.id}`);
        continue;
      }

      // Calculate subtotal
      const subtotal = items.docs.reduce((total, item) => {
        return total + (item.quantity * item.unitPrice);
      }, 0);

      // Generate recovery URL with cart ID
      const recoveryUrl = `${process.env.PAYLOAD_PUBLIC_SERVER_URL}/cart?recover=${cart.id}`;

      // Prepare email data
      const emailData: AbandonedCartData = {
        customerName,
        customerEmail,
        cartId: String(cart.id),
        items: items.docs.map(item => ({
          productTitle: item.productTitle,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
        })),
        subtotal,
        recoveryUrl,
      };

      // Send abandoned cart email
      try {
        const emailSent = await sendAbandonedCartEmail(emailData);

        // Update cart status and mark email as sent
        await payload.update({
          collection: 'carts',
          id: cart.id,
          data: {
            status: 'abandoned',
            abandonedEmailSent: emailSent,
            abandonedEmailSentAt: emailSent ? new Date().toISOString() : null,
          },
        });

        if (emailSent) {
          console.log(`Sent abandoned cart email to ${customerEmail} for cart ${cart.id}`);
        }
      } catch (emailError) {
        console.error(`Failed to send abandoned cart email for cart ${cart.id}:`, emailError);

        // Still mark as abandoned even if email failed
        await payload.update({
          collection: 'carts',
          id: cart.id,
          data: {
            status: 'abandoned',
          },
        });
      }
    }

    // Delete very old abandoned carts (30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const oldCarts = await payload.find({
      collection: 'carts',
      where: {
        and: [
          { status: { equals: 'abandoned' } },
          { lastActivity: { less_than: thirtyDaysAgo } },
        ],
      },
    });

    for (const cart of oldCarts.docs) {
      // Delete cart items first
      const items = await payload.find({
        collection: 'cart-items',
        where: {
          cart: { equals: cart.id },
        },
      });

      for (const item of items.docs) {
        await payload.delete({
          collection: 'cart-items',
          id: item.id,
        });
      }

      // Delete cart
      await payload.delete({
        collection: 'carts',
        id: cart.id,
      });
    }

    console.log(`Cleaned up ${oldCarts.docs.length} old abandoned carts`);

  } catch (error) {
    console.error('Error cleaning up abandoned carts:', error);
    throw error;
  }
}

/**
 * Transfer guest cart to user account
 */
export async function transferGuestCartToUser(
  payload: Payload,
  guestSessionId: string,
  userId: string
): Promise<{ success: boolean; cartId?: string; error?: string }> {
  try {
    // Find guest cart
    const guestCarts = await payload.find({
      collection: 'carts',
      where: {
        and: [
          { sessionId: { equals: guestSessionId } },
          { status: { equals: 'active' } },
          { user: { exists: false } },
        ],
      },
    });

    if (!guestCarts.docs.length) {
      return { success: false, error: 'Guest cart not found' };
    }

    const guestCart = guestCarts.docs[0];

    // Check if user already has an active cart
    const userCarts = await payload.find({
      collection: 'carts',
      where: {
        and: [
          { user: { equals: userId } },
          { status: { equals: 'active' } },
        ],
      },
    });

    if (userCarts.docs.length > 0) {
      // Merge guest cart into existing user cart
      const userCart = userCarts.docs[0];

      // Transfer items
      const guestItems = await payload.find({
        collection: 'cart-items',
        where: {
          cart: { equals: guestCart.id },
        },
      });

      for (const item of guestItems.docs) {
        await (payload as any).update({
          collection: 'cart-items',
          id: item.id,
          data: {
            cart: userCart.id,
          } as any,
        });
      }

      // Delete guest cart
      await payload.delete({
        collection: 'carts',
        id: guestCart.id,
      });

      // Update user cart totals
      await updateCartTotals(payload, String(userCart.id));

      return { success: true, cartId: String(userCart.id) };
    } else {
      // Transfer guest cart to user
      await (payload as any).update({
        collection: 'carts',
        id: guestCart.id,
        data: {
          user: userId,
        } as any,
      });

      return { success: true, cartId: String(guestCart.id) };
    }

  } catch (error) {
    console.error('Error transferring guest cart:', error);
    return { success: false, error: 'Failed to transfer cart' };
  }
}
