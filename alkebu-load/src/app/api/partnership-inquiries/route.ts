import config from '@payload-config';
import { getPayload } from 'payload';
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

import { getEmailRuntimeConfig } from '@/app/utils/emailConfig';
import { submitPartnershipInquiry } from '@/app/utils/partnershipInquirySubmission';

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_MAX_BUCKETS = 500;
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();
let payloadClientPromise: ReturnType<typeof getPayload> | undefined;

const getClientIp = (request: NextRequest): string =>
  request.headers.get('cf-connecting-ip') || 'unknown';

const pruneRateLimitBuckets = (now: number): void => {
  for (const [key, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= now) {
      rateLimitBuckets.delete(key);
    }
  }

  while (rateLimitBuckets.size > RATE_LIMIT_MAX_BUCKETS) {
    const oldestKey = rateLimitBuckets.keys().next().value as string | undefined;
    if (!oldestKey) break;
    rateLimitBuckets.delete(oldestKey);
  }
};

const isRateLimited = (key: string): boolean => {
  const now = Date.now();
  pruneRateLimitBuckets(now);

  const current = rateLimitBuckets.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  current.count += 1;
  return current.count > RATE_LIMIT_MAX;
};

const getPayloadClient = () => {
  payloadClientPromise ??= getPayload({ config });
  return payloadClientPromise;
};

const readJsonBody = async (request: NextRequest): Promise<unknown> => {
  try {
    return await request.json();
  } catch {
    return {};
  }
};

const verifyTurnstile = async (
  token: string,
  remoteIp: string,
): Promise<{ success: boolean; error?: string }> => {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.error('TURNSTILE_SECRET_KEY is not set; rejecting partnership inquiry.');
    return { success: false, error: 'Bot protection is not configured on the server.' };
  }

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp && remoteIp !== 'unknown') {
      body.set('remoteip', remoteIp);
    }

    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) {
      console.warn('Turnstile siteverify returned non-2xx:', response.status);
      return { success: false, error: 'Bot check failed. Please try again.' };
    }

    const data = (await response.json()) as { success?: boolean; 'error-codes'?: string[] };
    if (data.success !== true) {
      console.warn('Turnstile verification rejected partnership token:', data['error-codes']);
      return { success: false, error: 'Bot check failed. Please refresh the page and try again.' };
    }

    return { success: true };
  } catch (error) {
    console.error('Turnstile verification request failed:', error);
    return { success: false, error: 'Bot check failed. Please try again in a moment.' };
  }
};

export async function POST(request: NextRequest) {
  const body = await readJsonBody(request);
  const clientIp = getClientIp(request);

  const result = await submitPartnershipInquiry({
    body,
    clientIp,
    deps: {
      verifyTurnstile,
      isRateLimited,
      createInquiry: async (data) => {
        const payload = await getPayloadClient();
        const { id: _id, ...createData } = data;
        const created = await payload.create({
          collection: 'partnership-inquiries',
          data: createData,
          overrideAccess: true,
        });

        return { ...data, id: created.id };
      },
      updateInquiry: async (id, data) => {
        const payload = await getPayloadClient();
        return payload.update({
          collection: 'partnership-inquiries',
          id,
          data,
          overrideAccess: true,
        });
      },
      sendStaffEmail: async (email) => {
        const emailConfig = getEmailRuntimeConfig();

        if (!emailConfig.configured) {
          throw new Error('Partnership inquiry email is not configured on the server.');
        }

        const transporter = nodemailer.createTransport({
          host: emailConfig.host,
          port: emailConfig.port,
          secure: emailConfig.secure,
          auth: {
            user: emailConfig.user,
            pass: emailConfig.password,
          },
        });

        await transporter.sendMail({
          from: `${emailConfig.fromName} <${emailConfig.fromEmail}>`,
          to: emailConfig.staffNotificationEmail || 'info@alkebulanimages.com',
          replyTo: email.replyTo,
          subject: email.subject,
          text: email.text,
          html: email.html,
        });
      },
    },
  });

  return NextResponse.json(result.body, { status: result.status });
}
