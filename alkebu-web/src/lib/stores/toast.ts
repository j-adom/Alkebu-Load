import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'info' | 'cart';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

export const toasts = writable<ToastItem[]>([]);

export function removeToast(id: string) {
  toasts.update((list) => list.filter((t) => t.id !== id));
}

function add(type: ToastType, message: string, duration = 4000) {
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;
  toasts.update((list) => [...list, { id, type, message, duration }]);
  if (duration > 0) {
    setTimeout(() => removeToast(id), duration);
  }
  return id;
}

/**
 * App-wide toast API. Call from anywhere (event handlers, stores) to surface
 * feedback in the globally-mounted <Toast /> instance:
 *   toast.error('Could not add item to cart');
 */
export const toast = {
  success: (message: string, duration?: number) => add('success', message, duration),
  error: (message: string, duration?: number) => add('error', message, duration),
  info: (message: string, duration?: number) => add('info', message, duration),
  cart: (message: string, duration?: number) => add('cart', message, duration),
};
