import type { Payload } from 'payload';

import { stripeAdapter } from './stripeAdapter';
import { squareAdapter } from './squareAdapter';

export type InitPaymentParams = {
  cartId: string;
  customerEmail?: string;
  billingAddress?: Record<string, unknown>;
  shippingAddress?: Record<string, unknown>;
  successUrl: string;
  cancelUrl: string;
  taxExempt?: boolean;
  metadata?: Record<string, string>;
};

export type PaymentInitResult = {
  clientSecret?: string;
  checkoutUrl?: string;
  providerPaymentId: string;
  provider: string;
};

export type PaymentAdapter = {
  slug: string;
  initPayment: (payload: Payload, params: InitPaymentParams) => Promise<PaymentInitResult>;
  confirmPayment?: (payload: Payload, args: { providerPaymentId: string; cartId: string }) => Promise<void>;
  refund?: (payload: Payload, args: { providerPaymentId: string; amount?: number }) => Promise<void>;
  validateWebhook: (rawBody: string, headers: Headers) => unknown;
  handleWebhook: (payload: Payload, event: any) => Promise<void>;
};

const registry: Record<string, PaymentAdapter> = {
  stripe: stripeAdapter(),
};

// Register Square only when required env vars exist so we don't throw on import.
if (process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID) {
  try {
    registry.square = squareAdapter();
  } catch (error) {
    console.warn('Square adapter disabled:', error instanceof Error ? error.message : error);
  }
}

export const getAdapter = (slug: string): PaymentAdapter | undefined => registry[slug];

export const listAdapters = (): PaymentAdapter[] => Object.values(registry);
