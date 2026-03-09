import { w as writable, g as get } from "./index.js";
import { D as DEV } from "./false.js";
import { P as PUBLIC_SITE_URL } from "./public.js";
const browser = DEV;
const paymentProvider = {
  "slug": "stripe",
  "name": "Stripe",
  "note": "Card payments are processed securely."
};
const createEmptyCart = () => ({
  id: "",
  items: [],
  itemCount: 0,
  subtotal: 0,
  tax: 0,
  shipping: 0,
  total: 0,
  status: "active"
});
function createCartStore() {
  const store = writable(createEmptyCart());
  const { subscribe, set, update } = store;
  const getErrorMessage = (error) => {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    try {
      return JSON.stringify(error);
    } catch {
      return "Unknown error";
    }
  };
  const persistCart = (cart2) => {
  };
  return {
    subscribe,
    set,
    update,
    // Initialize cart from API
    async initialize(userId) {
      try {
        const guestCartId = browser ? localStorage.getItem("guest-cart-id") : null;
        const params = new URLSearchParams();
        if (userId) {
          params.append("userId", userId);
        } else if (guestCartId) ;
        const response = await fetch(`/api/cart/summary?${params.toString()}`);
        if (response.ok) {
          const result = await response.json();
          const cartData = result?.cart ?? result;
          set(cartData);
          if (!userId && browser) ;
        }
      } catch (error) {
        console.error("Failed to initialize cart:", error);
      }
    },
    // Add item to cart
    async addItem(productId, productType = "books", quantity = 1, customization) {
      try {
        const guestCartId = browser ? localStorage.getItem("guest-cart-id") : null;
        const currentCart = get(store);
        const response = await fetch("/api/cart/add", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            productId,
            productType,
            quantity,
            customization,
            sessionId: guestCartId,
            cartId: currentCart.id || guestCartId || void 0
          })
        });
        if (response.ok) {
          const result = await response.json();
          update((cart2) => ({
            ...cart2,
            ...result.cart ?? result
          }));
          persistCart(result.cart ?? result);
          return { success: true };
        } else {
          const error = await response.json();
          throw new Error(error.message || "Failed to add item to cart");
        }
      } catch (error) {
        const message = getErrorMessage(error);
        console.error("Failed to add item to cart:", error);
        return { success: false, error: message };
      }
    },
    // Update item quantity
    async updateQuantity(cartItemId, quantity) {
      try {
        const currentCart = get(store);
        const response = await fetch("/api/cart/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            cartId: currentCart.id,
            cartItemId,
            quantity
          })
        });
        if (response.ok) {
          const result = await response.json();
          update((cart2) => ({
            ...cart2,
            ...result.cart ?? result
          }));
          persistCart(result.cart ?? result);
          return { success: true };
        } else {
          const error = await response.json();
          throw new Error(error.message || "Failed to update item");
        }
      } catch (error) {
        const message = getErrorMessage(error);
        console.error("Failed to update item quantity:", error);
        return { success: false, error: message };
      }
    },
    // Remove item from cart
    async removeItem(cartItemId) {
      try {
        const currentCart = get(store);
        const response = await fetch("/api/cart/remove", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            cartId: currentCart.id,
            cartItemId
          })
        });
        if (response.ok) {
          const result = await response.json();
          update((cart2) => ({
            ...cart2,
            ...result.cart ?? result
          }));
          persistCart(result.cart ?? result);
          return { success: true };
        } else {
          const error = await response.json();
          throw new Error(error.message || "Failed to remove item");
        }
      } catch (error) {
        const message = getErrorMessage(error);
        console.error("Failed to remove item:", error);
        return { success: false, error: message };
      }
    },
    // Clear cart
    async clear() {
      try {
        const guestCartId = browser ? localStorage.getItem("guest-cart-id") : null;
        const currentCart = get(store);
        const response = await fetch("/api/cart/clear", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            cartId: currentCart.id || guestCartId
          })
        });
        if (response.ok) {
          const result = await response.json();
          const summary = result.cart ?? createEmptyCart();
          set(summary);
          if (browser) ;
          return { success: true };
        } else {
          const error = await response.json();
          throw new Error(error.message || "Failed to clear cart");
        }
      } catch (error) {
        const message = getErrorMessage(error);
        console.error("Failed to clear cart:", error);
        return { success: false, error: message };
      }
    },
    // Start checkout with configured provider
    async checkout(options) {
      try {
        const guestCartId = browser ? localStorage.getItem("guest-cart-id") : null;
        const response = await fetch("/api/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            cartId: guestCartId || get(store).id,
            successUrl: `${PUBLIC_SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: `${PUBLIC_SITE_URL}/checkout/cancel`,
            shippingAddress: options?.shippingAddress,
            customerEmail: options?.customerEmail,
            taxExempt: options?.taxExempt,
            provider: paymentProvider.slug
          })
        });
        if (response.ok) {
          const result = await response.json();
          if (result.checkoutUrl) {
            window.location.href = result.checkoutUrl;
          }
          return { success: true, checkoutUrl: result.checkoutUrl };
        } else {
          const error = await response.json();
          throw new Error(error.message || "Failed to start checkout");
        }
      } catch (error) {
        const message = getErrorMessage(error);
        console.error("Failed to start checkout:", error);
        return { success: false, error: message };
      }
    }
  };
}
createCartStore();
export {
  createEmptyCart as c,
  paymentProvider as p
};
