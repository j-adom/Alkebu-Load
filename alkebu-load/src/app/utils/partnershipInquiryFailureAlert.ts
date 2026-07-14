import { escapeHtml } from './emailTemplates';
import { sendRawEmail, type EmailSendResult } from './emailService';
import { getEmailRuntimeConfig } from './emailConfig';

/**
 * Staff alert fired when a partnership inquiry (wholesale / institutional /
 * non-profit lead form) fails to save to Payload. See the incident that
 * motivated this: PartnershipInquiries was registered in the running app on
 * July 8, 2026 with no matching Postgres table — every submission 500'd and
 * was silently lost for six days because nobody was ever told.
 *
 * The alert carries the submitted inquiry data itself, so even when the DB
 * write is impossible the lead is not lost — it lands in the staff inbox for
 * manual follow-up.
 */
export interface PartnershipInquiryFailureAlertInput {
  inquiryType?: string;
  name?: string;
  email?: string;
  organizationName?: string;
  message?: string;
  sourcePath?: string;
  error: unknown;
}

export interface PartnershipInquiryFailureAlertDeps {
  sendEmail: (params: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }) => Promise<EmailSendResult>;
  staffEmail: string;
}

const NOT_PROVIDED = '(not provided)';

const displayValue = (value: string | undefined): string =>
  value && value.trim() ? value : NOT_PROVIDED;

const errorMessageFor = (error: unknown): string =>
  error instanceof Error ? error.message : String(error ?? 'Unknown error');

const defaultDeps = (): PartnershipInquiryFailureAlertDeps => ({
  sendEmail: sendRawEmail,
  staffEmail: getEmailRuntimeConfig().staffNotificationEmail,
});

export function buildPartnershipInquiryFailureAlertEmail(
  input: PartnershipInquiryFailureAlertInput,
): { subject: string; html: string; text: string } {
  const inquiryType = displayValue(input.inquiryType);
  const name = displayValue(input.name);
  const email = displayValue(input.email);
  const organizationName = displayValue(input.organizationName);
  const message = displayValue(input.message);
  const sourcePath = displayValue(input.sourcePath);
  const errorMessage = errorMessageFor(input.error);

  const subject = `URGENT: partnership inquiry failed to save — ${
    organizationName !== NOT_PROVIDED ? organizationName : name
  }`;

  const rows: Array<[string, string]> = [
    ['Inquiry type', inquiryType],
    ['Name', name],
    ['Email', email],
    ['Organization', organizationName],
    ['Source path', sourcePath],
    ['Message', message],
  ];

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
      <h2 style="color: #b91c1c;">A partnership inquiry failed to save</h2>
      <p>
        This lead did <strong>not</strong> make it into the admin — the database write failed.
        Follow up with the contact below directly and investigate the underlying error.
      </p>
      <table style="border-collapse: collapse; width: 100%;">
        ${rows
          .map(
            ([label, value]) => `
        <tr>
          <td style="padding: 4px 8px; font-weight: bold; vertical-align: top; white-space: nowrap;">${escapeHtml(label)}</td>
          <td style="padding: 4px 8px; white-space: pre-line;">${escapeHtml(value)}</td>
        </tr>`,
          )
          .join('')}
      </table>
      <p style="margin-top: 16px; color: #b91c1c;">
        <strong>Save error:</strong> ${escapeHtml(errorMessage)}
      </p>
    </div>`;

  const text = `A partnership inquiry failed to save.

This lead did NOT make it into the admin -- the database write failed.
Follow up with the contact below directly and investigate the underlying error.

${rows.map(([label, value]) => `${label}: ${value}`).join('\n')}

Save error: ${errorMessage}
`;

  return { subject, html, text };
}

/**
 * Send the failure alert to staff. Never throws — an email delivery failure
 * must not mask the original save failure that triggered it. Callers should
 * invoke this from inside a catch block and rethrow the original error
 * afterward regardless of how this resolves.
 */
export async function alertStaffOfPartnershipInquiryFailure(
  input: PartnershipInquiryFailureAlertInput,
  depsOverride: Partial<PartnershipInquiryFailureAlertDeps> = {},
): Promise<void> {
  const deps = { ...defaultDeps(), ...depsOverride };
  const template = buildPartnershipInquiryFailureAlertEmail(input);

  try {
    const result = await deps.sendEmail({ to: deps.staffEmail, ...template });
    if (!result.success) {
      console.error('Partnership inquiry failure alert email failed:', result.error);
    }
  } catch (err) {
    console.error('Partnership inquiry failure alert email threw:', err);
  }
}

/**
 * Wraps a Payload `create` call: on failure, alerts staff with the submitted
 * inquiry data (so the lead isn't lost) and then rethrows the ORIGINAL error
 * unchanged so the caller's existing error handling/response is untouched.
 */
export async function createPartnershipInquiryWithFailureAlert<T>(
  createFn: () => Promise<T>,
  alertInput: Omit<PartnershipInquiryFailureAlertInput, 'error'>,
  depsOverride: Partial<PartnershipInquiryFailureAlertDeps> = {},
): Promise<T> {
  try {
    return await createFn();
  } catch (error) {
    await alertStaffOfPartnershipInquiryFailure({ ...alertInput, error }, depsOverride);
    throw error;
  }
}
