import { fail } from '@sveltejs/kit';
import { getPayloadApiUrl, getPayloadAuthHeader } from '$lib/server/payloadEnv';

const text = (formData: FormData, key: string): string => String(formData.get(key) || '').trim();

const list = (formData: FormData, key: string): string[] =>
  formData
    .getAll(key)
    .map((value) => String(value).trim())
    .filter(Boolean);

export function buildInitialPartnershipValues(page: any) {
  return {
    inquiryType: page.type,
    name: '',
    email: '',
    phone: '',
    organizationName: '',
    organizationType: '',
    message: '',
    website: '',
    [page.form.detailGroup]: {},
  };
}

export async function handlePartnershipInquiryAction({
  request,
  fetch,
  page,
}: {
  request: Request;
  fetch: typeof globalThis.fetch;
  page: any;
}) {
  const formData = await request.formData();
  const detailGroup = page.form.detailGroup;
  const detailValues: Record<string, unknown> = {};

  for (const field of page.form.detailFields) {
    detailValues[field.name] =
      field.type === 'checkboxes'
        ? list(formData, `${detailGroup}.${field.name}`)
        : text(formData, `${detailGroup}.${field.name}`);
  }

  const values = {
    inquiryType: page.type,
    name: text(formData, 'name'),
    email: text(formData, 'email'),
    phone: text(formData, 'phone'),
    organizationName: text(formData, 'organizationName'),
    organizationType: text(formData, 'organizationType'),
    message: text(formData, 'message'),
    website: text(formData, 'website'),
    sourcePath: page.path,
    [detailGroup]: detailValues,
  };

  const turnstileToken = text(formData, 'cf-turnstile-response');
  // Backend anti-spam silently drops submissions without a plausible
  // renderedAt timestamp — forward it as a number or not at all.
  const renderedAt = Number(formData.get('renderedAt'));

  if (!values.name || !values.email || !values.organizationName || !values.organizationType || !values.message) {
    return fail(400, {
      success: false,
      values,
      error: 'Please complete the required fields before sending your inquiry.',
    });
  }

  if (!turnstileToken) {
    return fail(400, {
      success: false,
      values,
      error: 'Please complete the bot check before sending your inquiry.',
    });
  }

  try {
    const response = await fetch(`${getPayloadApiUrl()}/api/partnership-inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getPayloadAuthHeader() },
      body: JSON.stringify({
        ...values,
        turnstileToken,
        ...(Number.isFinite(renderedAt) && renderedAt > 0 ? { renderedAt } : {}),
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return fail(response.status, {
        success: false,
        values,
        fieldErrors: data.fieldErrors || {},
        error: typeof data.error === 'string' ? data.error : 'Unable to send your inquiry right now.',
      });
    }

    return {
      success: true,
      message: data.message || 'Thanks for reaching out. Your inquiry has been received.',
      values: buildInitialPartnershipValues(page),
    };
  } catch (error) {
    console.error('Partnership inquiry action failed:', error);
    return fail(500, {
      success: false,
      values,
      error: 'Unable to send your inquiry right now. Please try again later.',
    });
  }
}
