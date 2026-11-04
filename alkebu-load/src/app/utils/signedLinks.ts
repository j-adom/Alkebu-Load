import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Tamper-proof, expiring tokens for links we email (cart recovery, unsubscribe).
 * Format: `<base64url subject>.<expiry ms>.<base64url HMAC-SHA256>`, keyed by
 * PAYLOAD_SECRET and bound to a purpose so a token minted for one link type
 * can never be replayed as another. No database state, so nothing to migrate.
 */

export type SignedLinkPurpose = 'cart-recovery' | 'unsubscribe';

const b64url = (value: string | Buffer): string => Buffer.from(value).toString('base64url');

const getSecret = (): string => {
  const secret = process.env.PAYLOAD_SECRET?.trim();
  if (!secret) throw new Error('PAYLOAD_SECRET is required to sign email links');
  return secret;
};

const sign = (purpose: SignedLinkPurpose, encodedSubject: string, expiresAt: number): Buffer =>
  createHmac('sha256', getSecret()).update(`${purpose}.${encodedSubject}.${expiresAt}`).digest();

export function createSignedToken(
  purpose: SignedLinkPurpose,
  subject: string,
  ttlMs: number,
  now: number = Date.now(),
): string {
  const encodedSubject = b64url(subject);
  const expiresAt = now + ttlMs;
  return `${encodedSubject}.${expiresAt}.${b64url(sign(purpose, encodedSubject, expiresAt))}`;
}

/** The token's subject when it is genuine, unexpired and for this purpose; otherwise null. */
export function verifySignedToken(
  purpose: SignedLinkPurpose,
  token: unknown,
  now: number = Date.now(),
): string | null {
  if (typeof token !== 'string' || token.length > 1024) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [encodedSubject, expiresRaw, signature] = parts;

  if (!/^\d{1,16}$/.test(expiresRaw)) return null;
  const expiresAt = Number(expiresRaw);
  if (expiresAt <= now) return null;

  let provided: Buffer;
  try {
    provided = Buffer.from(signature, 'base64url');
  } catch {
    return null;
  }
  const expected = sign(purpose, encodedSubject, expiresAt);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;

  const subject = Buffer.from(encodedSubject, 'base64url').toString('utf8');
  return subject || null;
}
