import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { PUBLIC_SITE_URL } from '$env/static/public';
import { paymentProvider } from '$lib/paymentProvider';

export interface CartItem {
  id: string;
  productId: string;
  productType: string;
  productTitle: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  image?: string;
  availability: {
    inStock: boolean;
    stockLevel: number;
  };
  customization?: Record<string, unknown>;
}

export interface Cart {
  id: string;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  hasEstimatedTotals: boolean;
  status: 'active' | 'abandoned' | 'converted' | 'checkout';
}

export const createEmptyCart = (): Cart => ({
  id: '',
  items: [],
  itemCount: 0,
  subtotal: 0,
  tax: 0,
  shipping: 0,
  total: 0,
  hasEstimatedTotals: false,
  status: 'active'
});

// Create cart store
function createCartStore() {
  const store = writable<Cart>(createEmptyCart());
  const { subscribe, set, update } = store;

  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    try {
      return JSON.stringify(error);
    } catch {
      return 'Unknown error';
    }
  };

  const getResponseErrorMessage = async (
    response: Response,
    fallback: string,
  ): Promise<string> => {
    try {
      const data = await response.json();
      if (typeof data === 'string' && data.trim()) {
        return data;
      }

      if (data && typeof data === 'object') {
        const errorData = data as Record<string, unknown>;
        const message =
          errorData.error ??
          errorData.message ??
          errorData.details;

        if (typeof message === 'string' && message.trim()) {
          return message;
        }
      }
    } catch {
      // Ignore parse errors and use fallback below.
    }

    return fallback;
  };

  const persistCart = (cart?: Partial<Cart>) => {
    if (browser && cart?.id) {
      localStorage.setItem('guest-cart-id', cart.id);
    }
  };

  const resetLocalCart = () => {
    set(createEmptyCart());

    if (browser) {
      localStorage.removeItem('guest-cart-id');
    }
  };

  return {
    subscribe,
    set,
    update,

    // Initialize cart from API
    async initialize(userId?: string) {
      try {
        const guestCartId = browser ? localStorage.getItem('guest-cart-id') : null;
        const params = new URLSearchParams();

        if (userId) {
          params.append('userId', userId);
        } else if (guestCartId) {
          params.append('cartId', guestCartId);
        }

        const response = await fetch(`/api/cart/summary?${params.toString()}`);

        if (response.ok) {
          const result = await response.json();
          const cartData = result?.cart ?? result;
          set(cartData);

          // Store cart ID for guest users
          if (!userId && browser) {
            persistCart(cartData);
          }
        }
      } catch (error) {
        console.error('Failed to initialize cart:', error);
      }
    },

    // Add item to cart
    async addItem(
      productId: string,
      productType: string = 'books',
      quantity: number = 1,
      customization?: Record<string, unknown>
    ) {
      try {
        const guestCartId = browser ? localStorage.getItem('guest-cart-id') : null;

        const currentCart = get(store);

        const response = await fetch('/api/cart/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productId,
            productType,
            quantity,
            customization,
            sessionId: guestCartId,
            cartId: currentCart.id || guestCartId || undefined
          }),
        });

        if (response.ok) {
          const result = await response.json();
          // Update store with new cart data
          update(cart => ({
            ...cart,
            ...(result.cart ?? result)
          }));

          // Store cart ID for guest users
          persistCart(result.cart ?? result);

          return { success: true };
        } else {
          throw new Error(
            await getResponseErrorMessage(response, 'Failed to add item to cart'),
          );
        }
      } catch (error) {
        const message = getErrorMessage(error);
        console.error('Failed to add item to cart:', error);
        return { success: false, error: message };
      }
    },

    // Update item quantity
    async updateQuantity(cartItemId: string, quantity: number) {
      try {
        const currentCart = get(store);

        const response = await fetch('/api/cart/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cartId: currentCart.id,
            cartItemId,
            quantity
          }),
        });

        if (response.ok) {
          const result = await response.json();
          update(cart => ({
            ...cart,
            ...(result.cart ?? result)
          }));
          persistCart(result.cart ?? result);
          return { success: true };
        } else {
          throw new Error(
            await getResponseErrorMessage(response, 'Failed to update item'),
          );
        }
      } catch (error) {
        const message = getErrorMessage(error);
        console.error('Failed to update item quantity:', error);
        return { success: false, error: message };
      }
    },

    // Remove item from cart
    async removeItem(cartItemId: string) {
      try {
        const currentCart = get(store);

        const response = await fetch('/api/cart/remove', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cartId: currentCart.id,
            cartItemId
          }),
        });

        if (response.ok) {
          const result = await response.json();
          update(cart => ({
            ...cart,
            ...(result.cart ?? result)
          }));
          persistCart(result.cart ?? result);
          return { success: true };
        } else {
          throw new Error(
            await getResponseErrorMessage(response, 'Failed to remove item'),
          );
        }
      } catch (error) {
        const message = getErrorMessage(error);
        console.error('Failed to remove item:', error);
        return { success: false, error: message };
      }
    },

    // Clear cart
    async clear() {
      try {
        const guestCartId = browser ? localStorage.getItem('guest-cart-id') : null;

        const currentCart = get(store);

        const response = await fetch('/api/cart/clear', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cartId: currentCart.id || guestCartId
          }),
        });

        if (response.ok) {
          const result = await response.json();
          const summary = result.cart ?? createEmptyCart();

          set(summary);

          if (browser) {
            localStorage.removeItem('guest-cart-id');
          }
          return { success: true };
        } else {
          throw new Error(
            await getResponseErrorMessage(response, 'Failed to clear cart'),
          );
        }
      } catch (error) {
        const message = getErrorMessage(error);
        console.error('Failed to clear cart:', error);
        return { success: false, error: message };
      }
    },

    resetLocal() {
      resetLocalCart();
    },

    // Start checkout with configured provider
    async checkout(options?: {
      shippingAddress?: any
      customerEmail?: string
      taxExempt?: boolean
      selectedShippingRateId?: string
    }) {
      try {
        const guestCartId = browser ? localStorage.getItem('guest-cart-id') : null;

        const response = await fetch('/api/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cartId: guestCartId || get(store).id,
            successUrl: `${PUBLIC_SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: `${PUBLIC_SITE_URL}/checkout/cancel`,
            shippingAddress: options?.shippingAddress,
            customerEmail: options?.customerEmail,
            taxExempt: options?.taxExempt,
            selectedShippingRateId: options?.selectedShippingRateId,
            provider: paymentProvider.slug,
          }),
        });

        if (response.ok) {
          const result = await response.json();

          // Redirect to Stripe checkout
          if (result.checkoutUrl) {
            window.location.href = result.checkoutUrl;
          }

          return { success: true, checkoutUrl: result.checkoutUrl };
        } else {
          throw new Error(
            await getResponseErrorMessage(response, 'Failed to start checkout'),
          );
        }
      } catch (error) {
        const message = getErrorMessage(error);
        console.error('Failed to start checkout:', error);
        return { success: false, error: message };
      }
    }
  };
}

export const cart = createCartStore();
