import {
  buildPartnershipEmail,
  buildStoredPartnershipInquiry,
  normalizePartnershipInquiry,
  type StoredPartnershipInquiry,
  validatePartnershipInquiry,
} from './partnershipInquiries';

type CreatedPartnershipInquiry = Omit<StoredPartnershipInquiry, 'id'> & {
  id: string | number;
};

type EmailStatusUpdate = {
  emailStatus?: 'pending' | 'sent' | 'failed';
  emailSentAt?: string;
  emailError?: string;
};

type EmailReplyTo = { name: string; address: string };

type PartnershipInquiryUpdate = Omit<
  Partial<StoredPartnershipInquiry>,
  'emailStatus' | 'id'
> &
  EmailStatusUpdate;

export interface PartnershipInquirySubmissionDeps {
  verifyTurnstile: (
    token: string,
    clientIp: string,
  ) => Promise<{ success: boolean; error?: string }>;
  isRateLimited: (clientIp: string) => boolean;
  createInquiry: (data: StoredPartnershipInquiry) => Promise<CreatedPartnershipInquiry>;
  updateInquiry: (
    id: string | number,
    data: PartnershipInquiryUpdate,
  ) => Promise<unknown>;
  sendStaffEmail: (email: {
    subject: string;
    text: string;
    html: string;
    replyTo?: EmailReplyTo;
  }) => Promise<void>;
}

export interface PartnershipInquirySubmissionInput {
  body: unknown;
  clientIp: string;
  deps: PartnershipInquirySubmissionDeps;
}

export interface PartnershipInquirySubmissionResult {
  status: number;
  body: {
    success: boolean;
    message?: string;
    error?: string;
    fieldErrors?: Record<string, string[]>;
  };
}

const SUCCESS_MESSAGE = 'Thanks for reaching out. Your inquiry has been received.';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const cleanText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const cleanHeaderText = (value: unknown): string =>
  cleanText(value)
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]+/g, '')
    .replace(/ {2,}/g, ' ')
    .trim();

const errorMessageFor = (error: unknown): string =>
  error instanceof Error ? error.message : String(error || 'Unknown email error');

const successResult = (): PartnershipInquirySubmissionResult => ({
  status: 200,
  body: {
    success: true,
    message: SUCCESS_MESSAGE,
  },
});

export async function submitPartnershipInquiry({
  body,
  clientIp,
  deps,
}: PartnershipInquirySubmissionInput): Promise<PartnershipInquirySubmissionResult> {
  const input = isRecord(body) ? body : {};

  if (cleanText(input.website)) {
    return { status: 200, body: { success: true } };
  }

  const turnstileToken = cleanText(input.turnstileToken);
  if (!turnstileToken) {
    return {
      status: 400,
      body: {
        success: false,
        error: 'Bot check is required. Please refresh the page and try again.',
      },
    };
  }

  const turnstileResult = await deps.verifyTurnstile(turnstileToken, clientIp);
  if (!turnstileResult.success) {
    return {
      status: 403,
      body: {
        success: false,
        error: turnstileResult.error || 'Bot check failed.',
      },
    };
  }

  if (deps.isRateLimited(clientIp)) {
    return {
      status: 429,
      body: {
        success: false,
        error: 'Too many inquiries. Please wait a few minutes and try again.',
      },
    };
  }

  const normalized = normalizePartnershipInquiry(input);
  const validation = validatePartnershipInquiry(normalized);
  if (!validation.valid) {
    return {
      status: 400,
      body: {
        success: false,
        error: 'Please complete the required fields.',
        fieldErrors: validation.fieldErrors,
      },
    };
  }

  const stored = buildStoredPartnershipInquiry(normalized);
  let created: CreatedPartnershipInquiry;

  try {
    created = await deps.createInquiry(stored);
  } catch {
    return {
      status: 500,
      body: {
        success: false,
        error: 'Unable to save your inquiry right now. Please try again later.',
      },
    };
  }

  const staffEmail = buildPartnershipEmail({ ...created, id: String(created.id) });

  try {
    await deps.sendStaffEmail({
      ...staffEmail,
      replyTo: { name: cleanHeaderText(created.name), address: created.email },
    });
  } catch (error) {
    const message = errorMessageFor(error);
    console.error('Partnership inquiry email failed:', error);

    try {
      await deps.updateInquiry(created.id, {
        emailStatus: 'failed',
        emailError: message,
      });
    } catch (updateError) {
      console.error('Unable to record partnership inquiry email failure:', updateError);
    }

    return successResult();
  }

  try {
    await deps.updateInquiry(created.id, {
      emailStatus: 'sent',
      emailSentAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Unable to record partnership inquiry email success:', error);
  }

  return successResult();
}
