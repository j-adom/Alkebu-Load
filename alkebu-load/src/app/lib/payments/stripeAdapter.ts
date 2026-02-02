import type { PaymentAdapter } from './adapters';
import type { CheckoutSessionData } from '@/app/utils/stripeHelpers';
import {
  createCheckoutSession,
  processStripeWebhook,
  verifyStripeWebhook,
} from '@/app/utils/stripeHelpers';

type StripeAdapterDeps = {
  createCheckoutSessionImpl?: typeof createCheckoutSession;
};

export const stripeAdapter = (deps: StripeAdapterDeps = {}): PaymentAdapter => {
  const { createCheckoutSessionImpl = createCheckoutSession } = deps;

  return {
    slug: 'stripe',

    initPayment: async (payload, params) => {
      const sessionData: CheckoutSessionData = {
        cartId: params.cartId,
        customerEmail: params.customerEmail,
        successUrl: params.successUrl,
        cancelUrl: params.cancelUrl,
        taxExempt: params.taxExempt,
      };

      const { sessionId, checkoutUrl } = await createCheckoutSessionImpl(payload, sessionData);

      return {
        checkoutUrl,
        provider: 'stripe',
        providerPaymentId: sessionId,
      };
    },

    validateWebhook: (rawBody, headers) => {
      const signature = headers.get('stripe-signature');
      if (!signature) {
        throw new Error('Missing Stripe signature');
      }

      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        throw new Error('STRIPE_WEBHOOK_SECRET not configured');
      }

      return verifyStripeWebhook(rawBody, signature, webhookSecret);
    },

    handleWebhook: async (payload, event) => {
      await processStripeWebhook(payload, event);
    },
  };
};
