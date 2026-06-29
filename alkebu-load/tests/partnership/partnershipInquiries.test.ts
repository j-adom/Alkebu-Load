import assert from 'node:assert';
import test from 'node:test';

import {
  buildStoredPartnershipInquiry,
  normalizePartnershipInquiry,
  PARTNERSHIP_INQUIRY_TYPES,
  validatePartnershipInquiry,
} from '../../src/app/utils/partnershipInquiries';

test('normalizes a wholesale inquiry and removes staff-only fields', () => {
  const normalized = normalizePartnershipInquiry({
    inquiryType: 'wholesale',
    name: '  Ada Reader  ',
    email: 'ADA@EXAMPLE.COM ',
    phone: ' 615-555-0100 ',
    organizationName: ' Diaspora Books ',
    organizationType: 'retailer',
    message: ' We need bulk titles. ',
    sourcePath: '/wholesale',
    status: 'contacted',
    assignedTo: 'staff-1',
    internalNotes: 'Do not trust visitor-provided workflow state',
    emailStatus: 'sent',
    crmProvider: 'salesforce',
    crmExternalId: 'crm_123',
    crmSyncStatus: 'synced',
    crmLastSyncedAt: '2026-06-26T12:00:00.000Z',
    crmSyncError: 'none',
    wholesaleDetails: {
      expectedOrderVolume: ' 100 books ',
      productInterests: ['books', 'apparel'],
      resaleOrDistributionNeeds: ' Resale in a campus shop ',
    },
    institutionalDetails: {
      institutionType: 'school',
      purchasingMethod: 'purchase_order',
    },
    nonprofitDetails: {
      projectType: 'book_drive',
      supportRequested: 'discounted_books',
    },
  } as any);

  assert.strictEqual(normalized.inquiryType, 'wholesale');
  assert.strictEqual(normalized.name, 'Ada Reader');
  assert.strictEqual(normalized.email, 'ada@example.com');
  assert.strictEqual(normalized.status, undefined);
  assert.strictEqual((normalized as any).assignedTo, undefined);
  assert.strictEqual((normalized as any).internalNotes, undefined);
  assert.strictEqual((normalized as any).emailStatus, undefined);
  assert.strictEqual((normalized as any).crmProvider, undefined);
  assert.strictEqual(normalized.crmExternalId, undefined);
  assert.strictEqual((normalized as any).crmSyncStatus, undefined);
  assert.strictEqual((normalized as any).crmLastSyncedAt, undefined);
  assert.strictEqual((normalized as any).crmSyncError, undefined);
  assert.deepStrictEqual(normalized.wholesaleDetails?.productInterests, ['books', 'apparel']);
  assert.strictEqual(normalized.institutionalDetails, undefined);
  assert.strictEqual(normalized.nonprofitDetails, undefined);
});

test('normalizes a single product interest value into a list', () => {
  const normalized = normalizePartnershipInquiry({
    inquiryType: 'wholesale',
    name: 'Nia',
    email: 'nia@example.com',
    organizationName: 'Book Table',
    organizationType: 'retailer',
    message: 'Bulk order',
    sourcePath: '/wholesale',
    wholesaleDetails: {
      expectedOrderVolume: '25 books',
      productInterests: ' books ' as any,
    },
  });

  assert.deepStrictEqual(normalized.wholesaleDetails?.productInterests, ['books']);
});

test('validates required core fields and route-specific detail fields', () => {
  const result = validatePartnershipInquiry({
    inquiryType: 'institutional',
    name: 'Maya',
    email: 'maya@example.com',
    organizationName: 'Nashville Library',
    organizationType: 'library',
    message: 'We need a curated list.',
    sourcePath: '/institutional-contracts',
    institutionalDetails: {
      institutionType: '',
      purchasingMethod: 'purchase_order',
      taxExemptStatus: 'yes',
      audienceOrStudentGroup: 'Middle school readers',
      targetTimeline: 'Fall semester',
    },
  });

  assert.strictEqual(result.valid, false);
  assert.deepStrictEqual(result.fieldErrors.institutionType, ['Institution type is required.']);
});

test('validates all route-specific required fields', () => {
  const wholesale = validatePartnershipInquiry({
    inquiryType: 'wholesale',
    name: 'Maya',
    email: 'maya@example.com',
    organizationName: 'Diaspora Books',
    organizationType: 'retailer',
    message: 'Bulk order',
    sourcePath: '/wholesale',
    wholesaleDetails: {
      expectedOrderVolume: '',
      productInterests: [],
    },
  });

  const institutional = validatePartnershipInquiry({
    inquiryType: 'institutional',
    name: 'Maya',
    email: 'maya@example.com',
    organizationName: 'Nashville Library',
    organizationType: 'library',
    message: 'Curated list',
    sourcePath: '/institutional-contracts',
    institutionalDetails: {
      institutionType: '',
      purchasingMethod: '',
    },
  });

  const nonprofit = validatePartnershipInquiry({
    inquiryType: 'nonprofit',
    name: 'Sam',
    email: 'sam@example.com',
    organizationName: 'Community Readers',
    organizationType: 'nonprofit',
    message: 'Program support',
    sourcePath: '/non-profit-projects',
    nonprofitDetails: {
      projectType: '',
      supportRequested: '',
    },
  });

  assert.deepStrictEqual(wholesale.fieldErrors.expectedOrderVolume, [
    'Expected order volume is required.',
  ]);
  assert.deepStrictEqual(wholesale.fieldErrors.productInterests, [
    'At least one product interest is required.',
  ]);
  assert.deepStrictEqual(institutional.fieldErrors.institutionType, ['Institution type is required.']);
  assert.deepStrictEqual(institutional.fieldErrors.purchasingMethod, ['Purchasing method is required.']);
  assert.deepStrictEqual(nonprofit.fieldErrors.projectType, ['Project type is required.']);
  assert.deepStrictEqual(nonprofit.fieldErrors.supportRequested, ['Support requested is required.']);
});

test('validates common required fields and email format', () => {
  const result = validatePartnershipInquiry({
    inquiryType: 'unknown',
    name: ' ',
    email: 'not-an-email',
    organizationName: '',
    organizationType: '',
    message: '',
    sourcePath: '',
  });

  assert.strictEqual(result.valid, false);
  assert.deepStrictEqual(result.fieldErrors.inquiryType, [
    'Inquiry type must be wholesale, institutional, or nonprofit.',
  ]);
  assert.deepStrictEqual(result.fieldErrors.name, ['Name is required.']);
  assert.deepStrictEqual(result.fieldErrors.email, ['Email must be a valid email address.']);
  assert.deepStrictEqual(result.fieldErrors.organizationName, ['Organization name is required.']);
  assert.deepStrictEqual(result.fieldErrors.organizationType, ['Organization type is required.']);
  assert.deepStrictEqual(result.fieldErrors.message, ['Message is required.']);
  assert.deepStrictEqual(result.fieldErrors.sourcePath, ['Source path is required.']);
});

test('builds stored defaults for email and CRM state', () => {
  const stored = buildStoredPartnershipInquiry({
    inquiryType: 'nonprofit',
    name: 'Sam',
    email: 'sam@example.com',
    organizationName: 'Community Readers',
    organizationType: 'nonprofit',
    message: 'Book drive support',
    sourcePath: '/non-profit-projects',
    status: 'won',
    emailStatus: 'sent',
    crmProvider: 'salesforce',
    crmSyncStatus: 'synced',
    nonprofitDetails: {
      projectType: 'book_drive',
      missionOrProgramContext: 'Youth literacy',
      targetTimeline: 'August',
      budgetRange: '$500-$1000',
      supportRequested: 'discounted_books',
    },
  } as any);

  assert.strictEqual(stored.status, 'new');
  assert.strictEqual((stored as any).emailStatus, undefined);
  assert.strictEqual((stored as any).crmProvider, undefined);
  assert.strictEqual(stored.crmSyncStatus, 'not_configured');
  assert.ok(stored.submittedAt);
});

test('builds stored wholesale product interests in Payload array row shape', () => {
  const stored = buildStoredPartnershipInquiry({
    inquiryType: 'wholesale',
    name: 'Ada Reader',
    email: 'ada@example.com',
    organizationName: 'Diaspora Books',
    organizationType: 'retailer',
    message: 'Need bulk titles.',
    sourcePath: '/wholesale',
    wholesaleDetails: {
      expectedOrderVolume: '100 books',
      productInterests: ['books', 'apparel'],
      resaleOrDistributionNeeds: 'Campus resale',
    },
  });

  assert.deepStrictEqual(stored.wholesaleDetails?.productInterests, [
    { interest: 'books' },
    { interest: 'apparel' },
  ]);
});

test('rejects invalid inquiry types before building stored payloads', () => {
  assert.throws(
    () =>
      buildStoredPartnershipInquiry({
        inquiryType: 'sponsorship',
        name: 'Sam',
        email: 'sam@example.com',
        organizationName: 'Community Readers',
        organizationType: 'nonprofit',
        message: 'Program support',
        sourcePath: '/non-profit-projects',
      }),
    /Cannot build stored partnership inquiry with invalid inquiry type/,
  );
});

test('exports the allowed inquiry type list', () => {
  assert.deepStrictEqual(PARTNERSHIP_INQUIRY_TYPES, ['wholesale', 'institutional', 'nonprofit']);
});
