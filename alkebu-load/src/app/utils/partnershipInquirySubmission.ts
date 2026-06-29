import {
  buildStoredPartnershipInquiry,
  normalizePartnershipInquiry,
  type StoredPartnershipInquiry,
  validatePartnershipInquiry,
} from './partnershipInquiries';
import type { EmailSendResult, PartnershipInquiryData } from './emailService';

type CreatedPartnershipInquiry = Omit<StoredPartnershipInquiry, 'id'> & {
  id: string | number;
};

type EmailGroupUpdate = {
  status: 'pending' | 'sent' | 'failed' | 'skipped';
  sentAt?: string;
  error?: string;
};

type PartnershipInquiryUpdate = {
  staffEmail?: EmailGroupUpdate;
  acknowledgementEmail?: EmailGroupUpdate;
};

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
  sendStaffEmail: (data: PartnershipInquiryData) => Promise<EmailSendResult>;
  sendAcknowledgementEmail: (data: PartnershipInquiryData) => Promise<EmailSendResult>;
  now?: () => number;
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

const MIN_TIME_TO_SUBMIT_MS = 3000;

const inquiryTypeLabels: Record<string, string> = {
  wholesale: 'Wholesale',
  institutional: 'Institutional',
  nonprofit: 'Non-profit',
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const cleanText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const cleanHeaderText = (value: string): string =>
  value
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

function buildPartnershipInquiryData(
  created: CreatedPartnershipInquiry,
): PartnershipInquiryData {
  const typeLabel =
    inquiryTypeLabels[created.inquiryType] ?? created.inquiryType;

  // Collect type-specific detail fields into a flat key→value map
  const details: Record<string, unknown> = {};

  if (created.inquiryType === 'wholesale' && created.wholesaleDetails) {
    const d = created.wholesaleDetails;
    if (d.expectedOrderVolume) details['Expected order volume'] = d.expectedOrderVolume;
    if (d.productInterests?.length) {
      details['Product interests'] = d.productInterests
        .map((item) => (typeof item === 'string' ? item : item.interest))
        .filter(Boolean)
        .join(', ');
    }
    if (d.resaleOrDistributionNeeds) details['Resale or distribution needs'] = d.resaleOrDistributionNeeds;
  }

  if (created.inquiryType === 'institutional' && created.institutionalDetails) {
    const d = created.institutionalDetails;
    if (d.institutionType) details['Institution type'] = d.institutionType;
    if (d.purchasingMethod) details['Purchasing method'] = d.purchasingMethod;
    if (d.taxExemptStatus) details['Tax exempt status'] = d.taxExemptStatus;
    if (d.audienceOrStudentGroup) details['Audience or student group'] = d.audienceOrStudentGroup;
    if (d.targetTimeline) details['Target timeline'] = d.targetTimeline;
  }

  if (created.inquiryType === 'nonprofit' && created.nonprofitDetails) {
    const d = created.nonprofitDetails;
    if (d.projectType) details['Project type'] = d.projectType;
    if (d.missionOrProgramContext) details['Mission or program context'] = d.missionOrProgramContext;
    if (d.targetTimeline) details['Target timeline'] = d.targetTimeline;
    if (d.budgetRange) details['Budget range'] = d.budgetRange;
    if (d.supportRequested) details['Support requested'] = d.supportRequested;
  }

  const adminBaseUrl =
    process.env.ORDER_ADMIN_BASE_URL || process.env.PAYLOAD_PUBLIC_SERVER_URL || '';
  const adminUrl = adminBaseUrl
    ? `${adminBaseUrl}/admin/collections/partnership-inquiries/${String(created.id)}`
    : undefined;

  return {
    inquiryType: created.inquiryType,
    typeLabel,
    name: cleanHeaderText(created.name),
    email: created.email,
    phone: created.phone ?? undefined,
    organizationName: created.organizationName,
    message: created.message,
    sourcePath: created.sourcePath,
    details,
    adminUrl,
  };
}

export async function submitPartnershipInquiry({
  body,
  clientIp,
  deps,
}: PartnershipInquirySubmissionInput): Promise<PartnershipInquirySubmissionResult> {
  const input = isRecord(body) ? body : {};
  const now = deps.now ?? (() => Date.now());

  // Honeypot check — silent success, no side effects
  if (cleanText(input.website)) {
    return { status: 200, body: { success: true } };
  }

  // Minimum-time-to-submit anti-spam check (same silent-success pattern as honeypot)
  const renderedAt = typeof input.renderedAt === 'number' ? input.renderedAt : null;
  if (renderedAt === null || now() - renderedAt < MIN_TIME_TO_SUBMIT_MS) {
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

  const inquiryData = buildPartnershipInquiryData(created);

  // --- Staff email (best-effort) ---
  const staffEmailResult = await deps.sendStaffEmail(inquiryData).catch((error: unknown) => ({
    success: false,
    error: errorMessageFor(error),
  } as Pick<{ success: boolean; error?: string }, 'success' | 'error'>));

  try {
    await deps.updateInquiry(created.id, {
      staffEmail: {
        status: staffEmailResult.success ? 'sent' : 'failed',
        sentAt: staffEmailResult.success ? new Date().toISOString() : undefined,
        error: staffEmailResult.success ? undefined : staffEmailResult.error,
      },
    });
  } catch (updateError) {
    console.error('Unable to record partnership staff email status:', updateError);
  }

  if (!staffEmailResult.success) {
    console.error(
      'Partnership inquiry staff email failed:',
      staffEmailResult.error,
    );
  }

  // --- Acknowledgement email (best-effort) ---
  const ackEmailResult = await deps.sendAcknowledgementEmail(inquiryData).catch((error: unknown) => ({
    success: false,
    error: errorMessageFor(error),
  } as Pick<{ success: boolean; error?: string }, 'success' | 'error'>));

  try {
    await deps.updateInquiry(created.id, {
      acknowledgementEmail: {
        status: ackEmailResult.success ? 'sent' : 'failed',
        sentAt: ackEmailResult.success ? new Date().toISOString() : undefined,
        error: ackEmailResult.success ? undefined : ackEmailResult.error,
      },
    });
  } catch (updateError) {
    console.error('Unable to record partnership acknowledgement email status:', updateError);
  }

  if (!ackEmailResult.success) {
    console.error(
      'Partnership inquiry acknowledgement email failed:',
      ackEmailResult.error,
    );
  }

  return successResult();
}
