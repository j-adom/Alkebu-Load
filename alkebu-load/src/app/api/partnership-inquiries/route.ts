import config from '@payload-config';
import { getPayload } from 'payload';
import { NextRequest, NextResponse } from 'next/server';

import { submitPartnershipInquiry } from '@/app/utils/partnershipInquirySubmission';
import { sendPartnershipStaffNotification, sendPartnershipAcknowledgement } from '@/app/utils/emailService';
import { getClientIp, verifyTurnstileToken } from '@/app/utils/turnstile';

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_MAX_BUCKETS = 500;

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();
let payloadClientPromise: ReturnType<typeof getPayload> | undefined;

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

export async function POST(request: NextRequest) {
  const body = await readJsonBody(request);
  const clientIp = getClientIp(request.headers);

  const result = await submitPartnershipInquiry({
    body,
    clientIp,
    deps: {
      verifyTurnstile: verifyTurnstileToken,
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
      sendStaffEmail: sendPartnershipStaffNotification,
      sendAcknowledgementEmail: sendPartnershipAcknowledgement,
    },
  });

  return NextResponse.json(result.body, { status: result.status });
}
