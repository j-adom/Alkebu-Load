export const PARTNERSHIP_INQUIRY_TYPES = ['wholesale', 'institutional', 'nonprofit'] as const;

export type PartnershipInquiryType = (typeof PARTNERSHIP_INQUIRY_TYPES)[number];

export interface WholesaleInquiryDetails {
  expectedOrderVolume?: string;
  productInterests?: string[];
  resaleOrDistributionNeeds?: string;
}

export interface StoredProductInterest {
  interest: string;
}

export interface StoredWholesaleInquiryDetails {
  expectedOrderVolume?: string;
  productInterests?: StoredProductInterest[];
  resaleOrDistributionNeeds?: string;
}

export interface InstitutionalInquiryDetails {
  institutionType?: string;
  purchasingMethod?: string;
  taxExemptStatus?: string;
  audienceOrStudentGroup?: string;
  targetTimeline?: string;
}

export interface NonprofitInquiryDetails {
  projectType?: string;
  missionOrProgramContext?: string;
  targetTimeline?: string;
  budgetRange?: string;
  supportRequested?: string;
}

export interface PartnershipInquiryInput {
  inquiryType?: PartnershipInquiryType | string;
  name?: string;
  email?: string;
  phone?: string;
  organizationName?: string;
  organizationType?: string;
  message?: string;
  sourcePath?: string;
  wholesaleDetails?: WholesaleInquiryDetails;
  institutionalDetails?: InstitutionalInquiryDetails;
  nonprofitDetails?: NonprofitInquiryDetails;
}

export interface NormalizedPartnershipInquiry extends PartnershipInquiryInput {
  inquiryType: PartnershipInquiryType | string;
  name: string;
  email: string;
  organizationName: string;
  organizationType: string;
  message: string;
  sourcePath: string;
  status?: undefined;
  crmExternalId?: undefined;
}

export interface StoredPartnershipInquiry
  extends Omit<
    NormalizedPartnershipInquiry,
    'inquiryType' | 'status' | 'crmExternalId' | 'wholesaleDetails'
  > {
  id?: string;
  inquiryType: PartnershipInquiryType;
  wholesaleDetails?: StoredWholesaleInquiryDetails;
  status: 'new';
  crmSyncStatus: 'not_configured';
  submittedAt: string;
}

export interface PartnershipInquiryValidationResult {
  valid: boolean;
  fieldErrors: Record<string, string[]>;
}

export interface PartnershipEmail {
  subject: string;
  text: string;
  html: string;
}

const inquiryTypeLabels: Record<PartnershipInquiryType, string> = {
  wholesale: 'Wholesale',
  institutional: 'Institutional',
  nonprofit: 'Nonprofit',
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanOptionalText(value: unknown): string | undefined {
  const cleaned = cleanText(value);
  return cleaned || undefined;
}

function cleanEmail(value: unknown): string {
  return cleanText(value).toLowerCase();
}

function cleanHeaderText(value: unknown): string {
  return cleanText(value)
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]+/g, '')
    .replace(/ {2,}/g, ' ')
    .trim();
}

function cleanList(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value];

  return values
    .map((item) => cleanText(item))
    .filter((item) => item.length > 0);
}

function addFieldError(fieldErrors: Record<string, string[]>, field: string, message: string) {
  fieldErrors[field] = [...(fieldErrors[field] ?? []), message];
}

function hasAllowedInquiryType(value: string): value is PartnershipInquiryType {
  return PARTNERSHIP_INQUIRY_TYPES.includes(value as PartnershipInquiryType);
}

function normalizeWholesaleDetails(details?: WholesaleInquiryDetails): WholesaleInquiryDetails | undefined {
  if (!details) {
    return undefined;
  }

  return {
    expectedOrderVolume: cleanText(details.expectedOrderVolume),
    productInterests: cleanList(details.productInterests),
    resaleOrDistributionNeeds: cleanOptionalText(details.resaleOrDistributionNeeds),
  };
}

function buildStoredWholesaleDetails(
  details?: WholesaleInquiryDetails,
): StoredWholesaleInquiryDetails | undefined {
  if (!details) {
    return undefined;
  }

  return {
    expectedOrderVolume: details.expectedOrderVolume,
    productInterests: details.productInterests?.map((interest) => ({ interest })),
    resaleOrDistributionNeeds: details.resaleOrDistributionNeeds,
  };
}

function normalizeInstitutionalDetails(
  details?: InstitutionalInquiryDetails,
): InstitutionalInquiryDetails | undefined {
  if (!details) {
    return undefined;
  }

  return {
    institutionType: cleanText(details.institutionType),
    purchasingMethod: cleanText(details.purchasingMethod),
    taxExemptStatus: cleanOptionalText(details.taxExemptStatus),
    audienceOrStudentGroup: cleanOptionalText(details.audienceOrStudentGroup),
    targetTimeline: cleanOptionalText(details.targetTimeline),
  };
}

function normalizeNonprofitDetails(details?: NonprofitInquiryDetails): NonprofitInquiryDetails | undefined {
  if (!details) {
    return undefined;
  }

  return {
    projectType: cleanText(details.projectType),
    missionOrProgramContext: cleanOptionalText(details.missionOrProgramContext),
    targetTimeline: cleanOptionalText(details.targetTimeline),
    budgetRange: cleanOptionalText(details.budgetRange),
    supportRequested: cleanText(details.supportRequested),
  };
}

export function normalizePartnershipInquiry(
  input: PartnershipInquiryInput,
): NormalizedPartnershipInquiry {
  const inquiryType = cleanText(input.inquiryType);
  const normalized: NormalizedPartnershipInquiry = {
    inquiryType,
    name: cleanText(input.name),
    email: cleanEmail(input.email),
    phone: cleanOptionalText(input.phone),
    organizationName: cleanText(input.organizationName),
    organizationType: cleanText(input.organizationType),
    message: cleanText(input.message),
    sourcePath: cleanText(input.sourcePath),
  };

  if (inquiryType === 'wholesale') {
    normalized.wholesaleDetails = normalizeWholesaleDetails(input.wholesaleDetails);
  }

  if (inquiryType === 'institutional') {
    normalized.institutionalDetails = normalizeInstitutionalDetails(input.institutionalDetails);
  }

  if (inquiryType === 'nonprofit') {
    normalized.nonprofitDetails = normalizeNonprofitDetails(input.nonprofitDetails);
  }

  return normalized;
}

export function validatePartnershipInquiry(
  input: PartnershipInquiryInput,
): PartnershipInquiryValidationResult {
  const normalized = normalizePartnershipInquiry(input);
  const fieldErrors: Record<string, string[]> = {};

  if (!normalized.inquiryType) {
    addFieldError(fieldErrors, 'inquiryType', 'Inquiry type is required.');
  } else if (!hasAllowedInquiryType(normalized.inquiryType)) {
    addFieldError(fieldErrors, 'inquiryType', 'Inquiry type must be wholesale, institutional, or nonprofit.');
  }

  const requiredCoreFields = [
    ['name', 'Name is required.'],
    ['organizationName', 'Organization name is required.'],
    ['organizationType', 'Organization type is required.'],
    ['message', 'Message is required.'],
    ['sourcePath', 'Source path is required.'],
  ] as const;

  for (const [field, message] of requiredCoreFields) {
    if (!normalized[field]) {
      addFieldError(fieldErrors, field, message);
    }
  }

  if (!normalized.email) {
    addFieldError(fieldErrors, 'email', 'Email is required.');
  } else if (!emailPattern.test(normalized.email)) {
    addFieldError(fieldErrors, 'email', 'Email must be a valid email address.');
  }

  if (normalized.inquiryType === 'wholesale') {
    if (!normalized.wholesaleDetails?.expectedOrderVolume) {
      addFieldError(fieldErrors, 'expectedOrderVolume', 'Expected order volume is required.');
    }

    if (!normalized.wholesaleDetails?.productInterests?.length) {
      addFieldError(fieldErrors, 'productInterests', 'At least one product interest is required.');
    }
  }

  if (normalized.inquiryType === 'institutional') {
    if (!normalized.institutionalDetails?.institutionType) {
      addFieldError(fieldErrors, 'institutionType', 'Institution type is required.');
    }

    if (!normalized.institutionalDetails?.purchasingMethod) {
      addFieldError(fieldErrors, 'purchasingMethod', 'Purchasing method is required.');
    }
  }

  if (normalized.inquiryType === 'nonprofit') {
    if (!normalized.nonprofitDetails?.projectType) {
      addFieldError(fieldErrors, 'projectType', 'Project type is required.');
    }

    if (!normalized.nonprofitDetails?.supportRequested) {
      addFieldError(fieldErrors, 'supportRequested', 'Support requested is required.');
    }
  }

  return {
    valid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
  };
}

export function buildStoredPartnershipInquiry(input: PartnershipInquiryInput): StoredPartnershipInquiry {
  const normalized = normalizePartnershipInquiry(input);

  if (!hasAllowedInquiryType(normalized.inquiryType)) {
    throw new Error('Cannot build stored partnership inquiry with invalid inquiry type.');
  }

  return {
    ...normalized,
    inquiryType: normalized.inquiryType,
    wholesaleDetails: buildStoredWholesaleDetails(normalized.wholesaleDetails),
    status: 'new',
    crmSyncStatus: 'not_configured',
    submittedAt: new Date().toISOString(),
  };
}

function escapeHtml(value: unknown): string {
  return cleanText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatTextValue(
  value: string | string[] | StoredProductInterest[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    const textValues = value
      .map((item) => (typeof item === 'string' ? item : item.interest))
      .filter(Boolean);

    return textValues.length ? textValues.join(', ') : undefined;
  }

  return value || undefined;
}

function detailRows(inquiry: StoredPartnershipInquiry): Array<[string, string]> {
  const rows: Array<[string, string | undefined]> = [];

  if (inquiry.inquiryType === 'wholesale') {
    rows.push(
      ['Expected order volume', inquiry.wholesaleDetails?.expectedOrderVolume],
      ['Product interests', formatTextValue(inquiry.wholesaleDetails?.productInterests)],
      ['Resale or distribution needs', inquiry.wholesaleDetails?.resaleOrDistributionNeeds],
    );
  }

  if (inquiry.inquiryType === 'institutional') {
    rows.push(
      ['Institution type', inquiry.institutionalDetails?.institutionType],
      ['Purchasing method', inquiry.institutionalDetails?.purchasingMethod],
      ['Tax exempt status', inquiry.institutionalDetails?.taxExemptStatus],
      ['Audience or student group', inquiry.institutionalDetails?.audienceOrStudentGroup],
      ['Target timeline', inquiry.institutionalDetails?.targetTimeline],
    );
  }

  if (inquiry.inquiryType === 'nonprofit') {
    rows.push(
      ['Project type', inquiry.nonprofitDetails?.projectType],
      ['Mission or program context', inquiry.nonprofitDetails?.missionOrProgramContext],
      ['Target timeline', inquiry.nonprofitDetails?.targetTimeline],
      ['Budget range', inquiry.nonprofitDetails?.budgetRange],
      ['Support requested', inquiry.nonprofitDetails?.supportRequested],
    );
  }

  return rows.filter((row): row is [string, string] => Boolean(row[1]));
}

function coreRows(inquiry: StoredPartnershipInquiry): Array<[string, string]> {
  return [
    ['Inquiry ID', inquiry.id],
    ['Type', inquiryTypeLabels[inquiry.inquiryType as PartnershipInquiryType] ?? inquiry.inquiryType],
    ['Submitted', inquiry.submittedAt],
    ['Name', inquiry.name],
    ['Email', inquiry.email],
    ['Phone', inquiry.phone],
    ['Organization', inquiry.organizationName],
    ['Organization type', inquiry.organizationType],
    ['Source path', inquiry.sourcePath],
    ['Message', inquiry.message],
  ].filter((row): row is [string, string] => Boolean(row[1]));
}

function rowsToText(rows: Array<[string, string]>): string {
  return rows.map(([label, value]) => `${label}: ${value}`).join('\n');
}

function rowsToHtml(rows: Array<[string, string]>): string {
  return rows
    .map(([label, value]) => {
      const htmlValue = escapeHtml(value).replace(/\n/g, '<br>');
      return `<dt>${escapeHtml(label)}</dt><dd>${htmlValue}</dd>`;
    })
    .join('');
}

export function buildPartnershipEmail(inquiry: StoredPartnershipInquiry): PartnershipEmail {
  const inquiryTypeLabel =
    inquiryTypeLabels[inquiry.inquiryType as PartnershipInquiryType] ?? cleanText(inquiry.inquiryType);
  const details = detailRows(inquiry);
  const rows = coreRows(inquiry);
  const subject = `New ${inquiryTypeLabel} Partnership Inquiry - ${cleanHeaderText(inquiry.organizationName)}`;
  const textSections = [
    'New Partnership Inquiry',
    rowsToText(rows),
    details.length ? ['Route-specific details', rowsToText(details)].join('\n') : '',
  ].filter(Boolean);

  return {
    subject,
    text: textSections.join('\n\n'),
    html: [
      '<h1>New Partnership Inquiry</h1>',
      `<h2>${escapeHtml(inquiryTypeLabel)}</h2>`,
      `<dl>${rowsToHtml(rows)}</dl>`,
      details.length ? `<h2>Route-specific details</h2><dl>${rowsToHtml(details)}</dl>` : '',
    ]
      .filter(Boolean)
      .join(''),
  };
}
