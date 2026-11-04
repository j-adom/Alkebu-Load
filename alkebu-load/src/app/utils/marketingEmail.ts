import type { Payload } from 'payload';

import { createSignedToken, verifySignedToken } from './signedLinks';

const DAY_MS = 24 * 60 * 60 * 1000;
export const CART_RECOVERY_LINK_TTL_MS = 7 * DAY_MS;
// Unsubscribe links must keep working long after the email (CAN-SPAM: 30+ days).
export const UNSUBSCRIBE_LINK_TTL_MS = 365 * DAY_MS;

const storefrontUrl = (): string =>
  (process.env.PAYLOAD_PUBLIC_SITE_URL || 'https://alkebulanimages.com').replace(/\/+$/, '');

const backendUrl = (): string =>
  (process.env.PAYLOAD_PUBLIC_SERVER_URL || 'https://payload.alkebulanimages.com').replace(/\/+$/, '');

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

/** Storefront link that restores a guest cart (see handleCartRecoveryClaim). */
export function buildCartRecoveryUrl(cartId: string | number, now: number = Date.now()): string {
  const token = createSignedToken('cart-recovery', String(cartId), CART_RECOVERY_LINK_TTL_MS, now);
  return `${storefrontUrl()}/cart/recover?t=${encodeURIComponent(token)}`;
}

export function buildUnsubscribeLinks(email: string, now: number = Date.now()): {
  /** Human-facing confirmation page on the storefront. */
  pageUrl: string;
  /** RFC 8058 one-click endpoint for the List-Unsubscribe header (mail clients POST here). */
  oneClickUrl: string;
} {
  const token = encodeURIComponent(
    createSignedToken('unsubscribe', normalizeEmail(email), UNSUBSCRIBE_LINK_TTL_MS, now),
  );
  return {
    pageUrl: `${storefrontUrl()}/unsubscribe?t=${token}`,
    oneClickUrl: `${backendUrl()}/api/email/unsubscribe?t=${token}`,
  };
}

/** Headers that make Gmail / Apple Mail show their own "Unsubscribe" button. */
export function listUnsubscribeHeaders(email: string, now: number = Date.now()): Record<string, string> {
  const { oneClickUrl } = buildUnsubscribeLinks(email, now);
  return {
    'List-Unsubscribe': `<${oneClickUrl}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}

export const verifyUnsubscribeToken = (token: unknown): string | null =>
  verifySignedToken('unsubscribe', token);

export const verifyCartRecoveryToken = (token: unknown): string | null =>
  verifySignedToken('cart-recovery', token);

async function findCustomerByEmail(payload: Payload, email: string): Promise<any | null> {
  const normalized = normalizeEmail(email);
  const result = await payload.find({
    collection: 'customers',
    where: {
      or: [{ email: { equals: normalized } }, { email: { equals: email.trim() } }],
    },
    limit: 1,
    depth: 0,
  });
  return result.docs[0] ?? null;
}

/**
 * True when this address opted out of marketing email. Opt-outs are stored on
 * the existing Customers `preferences.marketingEmails` checkbox.
 */
export async function isMarketingEmailSuppressed(payload: Payload, email: string): Promise<boolean> {
  const customer = await findCustomerByEmail(payload, email);
  return customer?.preferences?.marketingEmails === false;
}

/**
 * Record an opt-out. Updates the matching customer, or creates a "ghost"
 * customer (the same kind the order flow auto-creates) to hold the preference.
 */
export async function suppressMarketingEmail(payload: Payload, email: string): Promise<void> {
  const normalized = normalizeEmail(email);
  const existing = await findCustomerByEmail(payload, normalized);

  if (existing) {
    if (existing.preferences?.marketingEmails === false) return;
    await payload.update({
      collection: 'customers',
      id: existing.id,
      data: { preferences: { ...(existing.preferences ?? {}), marketingEmails: false } },
    });
    return;
  }

  await payload.create({
    collection: 'customers',
    data: {
      email: normalized,
      firstName: normalized.split('@')[0] || 'Customer',
      source: 'ecom',
      lifecycleStatus: 'ghost',
      preferences: { marketingEmails: false },
    } as any,
  });
}
