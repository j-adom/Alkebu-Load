# Partnership Landing Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the three partnership landing pages, tailored inquiry forms, Payload-stored partnership inquiries, staff email notifications, and CRM-ready sync fields described in `docs/superpowers/specs/2026-06-26-partnership-landing-pages-design.md`.

**Architecture:** The backend owns trusted inquiry validation, storage, Turnstile verification, rate limiting, and staff email. The frontend owns static page content, route-specific forms, SvelteKit action validation, and user-facing success/error states. The CRM integration is represented by durable fields in Payload but no Twenty.com network call is added in this release.

**Tech Stack:** Payload CMS 3 / Next.js 15 backend, SvelteKit / Svelte 5 frontend, Node test runner, TypeScript, Cloudflare Turnstile, Nodemailer SMTP runtime config.

---

## File Structure

Backend files:

- Create `alkebu-load/src/collections/PartnershipInquiries.ts` for the Payload collection, access rules, admin columns, grouped detail fields, email status fields, and CRM-ready fields.
- Modify `alkebu-load/src/payload.config.ts` to import and register `PartnershipInquiries` near the B2B/commerce collections.
- Create `alkebu-load/src/app/utils/partnershipInquiries.ts` for shared inquiry constants, field normalization, validation, staff-only field stripping, email text/html builders, and public response shaping.
- Create `alkebu-load/src/app/utils/partnershipInquirySubmission.ts` for dependency-injected submission orchestration used by the API route and tests.
- Create `alkebu-load/src/app/api/partnership-inquiries/route.ts` as the public create-only endpoint.
- Create `alkebu-load/tests/partnership/partnershipInquiries.test.ts` for normalization, validation, public field stripping, email rendering, and default CRM/email fields.
- Create `alkebu-load/tests/partnership/partnershipInquirySubmission.test.ts` for success, Turnstile failure, honeypot, rate limit, storage failure, and email failure after storage.
- Modify `alkebu-load/tests/access/staffAccess.test.ts` to cover `PartnershipInquiries` access control.

Frontend files:

- Create `alkebu-web/src/lib/data/partnershipPages.js` for the static v1 page/form config and route map.
- Create `alkebu-web/tests/partnership-pages.test.mjs` for config coverage and route uniqueness.
- Create `alkebu-web/src/lib/server/partnershipInquiry.ts` for shared SvelteKit action parsing, validation, and POST forwarding to Payload.
- Create `alkebu-web/src/lib/components/Partnership/PartnershipLandingPage.svelte` for the shared page shell and form UI.
- Create `alkebu-web/src/routes/wholesale/+page.server.ts` and `alkebu-web/src/routes/wholesale/+page.svelte`.
- Create `alkebu-web/src/routes/institutional-contracts/+page.server.ts` and `alkebu-web/src/routes/institutional-contracts/+page.svelte`.
- Create `alkebu-web/src/routes/non-profit-projects/+page.server.ts` and `alkebu-web/src/routes/non-profit-projects/+page.svelte`.
- Modify `alkebu-web/src/routes/+page.svelte` so the homepage cards link to the new routes.

Generated/check files:

- Modify `alkebu-load/src/payload-types.ts` only by running `pnpm generate:types` after registering the collection.
- Do not hand-edit generated Payload types.

---

### Task 1: Backend Inquiry Utility Tests and Schema Helpers

**Files:**
- Create: `alkebu-load/tests/partnership/partnershipInquiries.test.ts`
- Create: `alkebu-load/src/app/utils/partnershipInquiries.ts`

- [ ] **Step 1: Write failing tests for normalization, validation, public field stripping, defaults, and email rendering**

Create `alkebu-load/tests/partnership/partnershipInquiries.test.ts`:

```ts
import assert from 'node:assert';
import test from 'node:test';

import {
  buildPartnershipEmail,
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
    status: 'closed',
    crmExternalId: 'crm_123',
    wholesaleDetails: {
      expectedOrderVolume: ' 100 books ',
      productInterests: ['books', 'apparel'],
      resaleOrDistributionNeeds: ' Resale in a campus shop ',
    },
  });

  assert.strictEqual(normalized.inquiryType, 'wholesale');
  assert.strictEqual(normalized.name, 'Ada Reader');
  assert.strictEqual(normalized.email, 'ada@example.com');
  assert.strictEqual(normalized.status, undefined);
  assert.strictEqual(normalized.crmExternalId, undefined);
  assert.deepStrictEqual(normalized.wholesaleDetails?.productInterests, ['books', 'apparel']);
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

test('builds stored defaults for email and CRM state', () => {
  const stored = buildStoredPartnershipInquiry({
    inquiryType: 'nonprofit',
    name: 'Sam',
    email: 'sam@example.com',
    organizationName: 'Community Readers',
    organizationType: 'nonprofit',
    message: 'Book drive support',
    sourcePath: '/non-profit-projects',
    nonprofitDetails: {
      projectType: 'book_drive',
      missionOrProgramContext: 'Youth literacy',
      targetTimeline: 'August',
      budgetRange: '$500-$1000',
      supportRequested: 'discounted_books',
    },
  });

  assert.strictEqual(stored.status, 'new');
  assert.strictEqual(stored.emailStatus, 'pending');
  assert.strictEqual(stored.crmProvider, 'twenty');
  assert.strictEqual(stored.crmSyncStatus, 'not_configured');
  assert.ok(stored.submittedAt);
});

test('builds staff email with route-specific details', () => {
  const email = buildPartnershipEmail({
    id: '42',
    inquiryType: 'wholesale',
    name: 'Ada Reader',
    email: 'ada@example.com',
    phone: '615-555-0100',
    organizationName: 'Diaspora Books',
    organizationType: 'retailer',
    message: 'Need 100 books.',
    sourcePath: '/wholesale',
    submittedAt: '2026-06-26T12:00:00.000Z',
    status: 'new',
    emailStatus: 'pending',
    crmProvider: 'twenty',
    crmSyncStatus: 'not_configured',
    wholesaleDetails: {
      expectedOrderVolume: '100 books',
      productInterests: ['books'],
      resaleOrDistributionNeeds: 'Campus resale',
    },
  });

  assert.match(email.subject, /Wholesale/);
  assert.match(email.text, /Diaspora Books/);
  assert.match(email.text, /100 books/);
  assert.match(email.html, /New Partnership Inquiry/);
});

test('exports the allowed inquiry type list', () => {
  assert.deepStrictEqual(PARTNERSHIP_INQUIRY_TYPES, ['wholesale', 'institutional', 'nonprofit']);
});
```

- [ ] **Step 2: Run the focused backend test and verify it fails**

Run:

```bash
cd alkebu-load
pnpm test -- tests/partnership/partnershipInquiries.test.ts
```

Expected: FAIL because `src/app/utils/partnershipInquiries.ts` does not exist.

- [ ] **Step 3: Add the inquiry utility implementation**

Create `alkebu-load/src/app/utils/partnershipInquiries.ts`:

```ts
export const PARTNERSHIP_INQUIRY_TYPES = ['wholesale', 'institutional', 'nonprofit'] as const;
export type PartnershipInquiryType = (typeof PARTNERSHIP_INQUIRY_TYPES)[number];

export type PartnershipEmailStatus = 'pending' | 'sent' | 'failed';
export type PartnershipCrmSyncStatus = 'not_configured' | 'pending' | 'synced' | 'failed';
export type PartnershipStatus = 'new' | 'in_review' | 'followed_up' | 'closed';

export interface WholesaleDetails {
  expectedOrderVolume?: string;
  productInterests?: string[];
  resaleOrDistributionNeeds?: string;
}

export interface InstitutionalDetails {
  institutionType?: string;
  purchasingMethod?: string;
  taxExemptStatus?: string;
  audienceOrStudentGroup?: string;
  targetTimeline?: string;
}

export interface NonprofitDetails {
  projectType?: string;
  missionOrProgramContext?: string;
  targetTimeline?: string;
  budgetRange?: string;
  supportRequested?: string;
}

export interface PublicPartnershipInquiryInput {
  inquiryType?: unknown;
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  organizationName?: unknown;
  organizationType?: unknown;
  message?: unknown;
  sourcePath?: unknown;
  website?: unknown;
  wholesaleDetails?: Partial<WholesaleDetails>;
  institutionalDetails?: Partial<InstitutionalDetails>;
  nonprofitDetails?: Partial<NonprofitDetails>;
  [key: string]: unknown;
}

export interface NormalizedPartnershipInquiry {
  inquiryType?: PartnershipInquiryType;
  name: string;
  email: string;
  phone: string;
  organizationName: string;
  organizationType: string;
  message: string;
  sourcePath: string;
  website: string;
  wholesaleDetails?: WholesaleDetails;
  institutionalDetails?: InstitutionalDetails;
  nonprofitDetails?: NonprofitDetails;
}

export interface StoredPartnershipInquiry extends Omit<NormalizedPartnershipInquiry, 'website'> {
  inquiryType: PartnershipInquiryType;
  status: PartnershipStatus;
  submittedAt: string;
  emailStatus: PartnershipEmailStatus;
  emailSentAt?: string;
  emailError?: string;
  crmProvider: 'twenty';
  crmExternalId?: string;
  crmSyncStatus: PartnershipCrmSyncStatus;
  crmLastSyncedAt?: string;
  crmSyncError?: string;
}

export interface ValidationResult {
  valid: boolean;
  fieldErrors: Record<string, string[]>;
}

const FIELD_LIMITS = {
  name: 120,
  email: 254,
  phone: 40,
  organizationName: 160,
  organizationType: 80,
  message: 5000,
  sourcePath: 120,
  detail: 1000,
};

const isInquiryType = (value: unknown): value is PartnershipInquiryType =>
  typeof value === 'string' && PARTNERSHIP_INQUIRY_TYPES.includes(value as PartnershipInquiryType);

const text = (value: unknown, max = FIELD_LIMITS.detail): string => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
};

const emailText = (value: unknown): string => text(value, FIELD_LIMITS.email).toLowerCase();

const list = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map((item) => text(item, 80)).filter(Boolean);
  const single = text(value, 80);
  return single ? [single] : [];
};

const validEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const addError = (errors: Record<string, string[]>, field: string, message: string) => {
  errors[field] = [...(errors[field] || []), message];
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export function normalizePartnershipInquiry(input: PublicPartnershipInquiryInput): NormalizedPartnershipInquiry {
  const normalized: NormalizedPartnershipInquiry = {
    inquiryType: isInquiryType(input.inquiryType) ? input.inquiryType : undefined,
    name: text(input.name, FIELD_LIMITS.name),
    email: emailText(input.email),
    phone: text(input.phone, FIELD_LIMITS.phone),
    organizationName: text(input.organizationName, FIELD_LIMITS.organizationName),
    organizationType: text(input.organizationType, FIELD_LIMITS.organizationType),
    message: text(input.message, FIELD_LIMITS.message),
    sourcePath: text(input.sourcePath, FIELD_LIMITS.sourcePath),
    website: text(input.website, 200),
  };

  if (normalized.inquiryType === 'wholesale') {
    normalized.wholesaleDetails = {
      expectedOrderVolume: text(input.wholesaleDetails?.expectedOrderVolume),
      productInterests: list(input.wholesaleDetails?.productInterests),
      resaleOrDistributionNeeds: text(input.wholesaleDetails?.resaleOrDistributionNeeds),
    };
  }

  if (normalized.inquiryType === 'institutional') {
    normalized.institutionalDetails = {
      institutionType: text(input.institutionalDetails?.institutionType),
      purchasingMethod: text(input.institutionalDetails?.purchasingMethod),
      taxExemptStatus: text(input.institutionalDetails?.taxExemptStatus),
      audienceOrStudentGroup: text(input.institutionalDetails?.audienceOrStudentGroup),
      targetTimeline: text(input.institutionalDetails?.targetTimeline),
    };
  }

  if (normalized.inquiryType === 'nonprofit') {
    normalized.nonprofitDetails = {
      projectType: text(input.nonprofitDetails?.projectType),
      missionOrProgramContext: text(input.nonprofitDetails?.missionOrProgramContext),
      targetTimeline: text(input.nonprofitDetails?.targetTimeline),
      budgetRange: text(input.nonprofitDetails?.budgetRange),
      supportRequested: text(input.nonprofitDetails?.supportRequested),
    };
  }

  return normalized;
}

export function validatePartnershipInquiry(input: NormalizedPartnershipInquiry): ValidationResult {
  const fieldErrors: Record<string, string[]> = {};

  if (!input.inquiryType) addError(fieldErrors, 'inquiryType', 'Inquiry type is required.');
  if (!input.name) addError(fieldErrors, 'name', 'Name is required.');
  if (!input.email) addError(fieldErrors, 'email', 'Email is required.');
  if (input.email && !validEmail(input.email)) addError(fieldErrors, 'email', 'Enter a valid email address.');
  if (!input.organizationName) addError(fieldErrors, 'organizationName', 'Organization name is required.');
  if (!input.organizationType) addError(fieldErrors, 'organizationType', 'Organization type is required.');
  if (!input.message) addError(fieldErrors, 'message', 'Message is required.');
  if (!input.sourcePath) addError(fieldErrors, 'sourcePath', 'Source path is required.');

  if (input.inquiryType === 'wholesale') {
    if (!input.wholesaleDetails?.expectedOrderVolume) addError(fieldErrors, 'expectedOrderVolume', 'Expected order volume is required.');
    if (!input.wholesaleDetails?.productInterests?.length) addError(fieldErrors, 'productInterests', 'Product interest is required.');
  }

  if (input.inquiryType === 'institutional') {
    if (!input.institutionalDetails?.institutionType) addError(fieldErrors, 'institutionType', 'Institution type is required.');
    if (!input.institutionalDetails?.purchasingMethod) addError(fieldErrors, 'purchasingMethod', 'Purchasing method is required.');
  }

  if (input.inquiryType === 'nonprofit') {
    if (!input.nonprofitDetails?.projectType) addError(fieldErrors, 'projectType', 'Project type is required.');
    if (!input.nonprofitDetails?.supportRequested) addError(fieldErrors, 'supportRequested', 'Support requested is required.');
  }

  return { valid: Object.keys(fieldErrors).length === 0, fieldErrors };
}

export function buildStoredPartnershipInquiry(input: NormalizedPartnershipInquiry): StoredPartnershipInquiry {
  if (!input.inquiryType) throw new Error('Cannot store partnership inquiry without inquiryType.');

  const { website: _website, ...publicFields } = input;

  return {
    ...publicFields,
    inquiryType: input.inquiryType,
    status: 'new',
    submittedAt: new Date().toISOString(),
    emailStatus: 'pending',
    crmProvider: 'twenty',
    crmSyncStatus: 'not_configured',
  };
}

export function buildPartnershipEmail(inquiry: StoredPartnershipInquiry & { id?: string | number }) {
  const label = inquiry.inquiryType === 'nonprofit' ? 'Non-profit Project' : inquiry.inquiryType === 'institutional' ? 'Institutional Contract' : 'Wholesale';
  const detailLines = [
    ...(inquiry.wholesaleDetails ? [
      `Expected order volume: ${inquiry.wholesaleDetails.expectedOrderVolume || 'Not provided'}`,
      `Product interests: ${(inquiry.wholesaleDetails.productInterests || []).join(', ') || 'Not provided'}`,
      `Resale/distribution needs: ${inquiry.wholesaleDetails.resaleOrDistributionNeeds || 'Not provided'}`,
    ] : []),
    ...(inquiry.institutionalDetails ? [
      `Institution type: ${inquiry.institutionalDetails.institutionType || 'Not provided'}`,
      `Purchasing method: ${inquiry.institutionalDetails.purchasingMethod || 'Not provided'}`,
      `Tax-exempt status: ${inquiry.institutionalDetails.taxExemptStatus || 'Not provided'}`,
      `Audience/student group: ${inquiry.institutionalDetails.audienceOrStudentGroup || 'Not provided'}`,
      `Target timeline: ${inquiry.institutionalDetails.targetTimeline || 'Not provided'}`,
    ] : []),
    ...(inquiry.nonprofitDetails ? [
      `Project type: ${inquiry.nonprofitDetails.projectType || 'Not provided'}`,
      `Mission/program context: ${inquiry.nonprofitDetails.missionOrProgramContext || 'Not provided'}`,
      `Target timeline: ${inquiry.nonprofitDetails.targetTimeline || 'Not provided'}`,
      `Budget range: ${inquiry.nonprofitDetails.budgetRange || 'Not provided'}`,
      `Support requested: ${inquiry.nonprofitDetails.supportRequested || 'Not provided'}`,
    ] : []),
  ];

  const textLines = [
    `New ${label} Partnership Inquiry`,
    '',
    `Name: ${inquiry.name}`,
    `Email: ${inquiry.email}`,
    inquiry.phone ? `Phone: ${inquiry.phone}` : '',
    `Organization: ${inquiry.organizationName}`,
    `Organization type: ${inquiry.organizationType}`,
    `Source: ${inquiry.sourcePath}`,
    inquiry.id ? `Payload ID: ${inquiry.id}` : '',
    '',
    ...detailLines,
    '',
    'Message:',
    inquiry.message,
  ].filter(Boolean);

  const htmlLines = textLines.map((line) => line ? `<p>${escapeHtml(line)}</p>` : '<hr />');

  return {
    subject: `[Partnership Inquiry] ${label} - ${inquiry.organizationName}`,
    text: textLines.join('\n'),
    html: `<h2>New Partnership Inquiry</h2>${htmlLines.join('')}`,
  };
}
```

- [ ] **Step 4: Run the focused backend test and verify it passes**

Run:

```bash
cd alkebu-load
pnpm test -- tests/partnership/partnershipInquiries.test.ts
```

Expected: PASS for all tests in `partnershipInquiries.test.ts`.

- [ ] **Step 5: Commit Task 1**

```bash
git add alkebu-load/src/app/utils/partnershipInquiries.ts alkebu-load/tests/partnership/partnershipInquiries.test.ts
git commit -m "test: add partnership inquiry schema helpers"
```

---

### Task 2: Payload Collection and Access Control

**Files:**
- Create: `alkebu-load/src/collections/PartnershipInquiries.ts`
- Modify: `alkebu-load/src/payload.config.ts`
- Modify: `alkebu-load/tests/access/staffAccess.test.ts`

- [ ] **Step 1: Write failing access tests**

Modify `alkebu-load/tests/access/staffAccess.test.ts` to import the collection and add access tests:

```ts
import { PartnershipInquiries } from '../../src/collections/PartnershipInquiries';
```

Add these tests near the commerce access tests:

```ts
test('PartnershipInquiries.read: staff and admins can read stored inquiries', () => {
  assert.strictEqual(callRead(PartnershipInquiries, STAFF), true);
  assert.strictEqual(callRead(PartnershipInquiries, ADMIN), true);
});

test('PartnershipInquiries.read: public and customers cannot read stored inquiries', () => {
  assert.strictEqual(callRead(PartnershipInquiries, null), false);
  assert.strictEqual(callRead(PartnershipInquiries, CUSTOMER), false);
});

test('PartnershipInquiries.create/update: staff and admins can manage inquiries through admin', () => {
  assert.strictEqual(access(PartnershipInquiries).create({ req: { user: STAFF } }), true);
  assert.strictEqual(access(PartnershipInquiries).create({ req: { user: ADMIN } }), true);
  assert.strictEqual(access(PartnershipInquiries).update({ req: { user: STAFF }, id: 'lead1' }), true);
  assert.strictEqual(access(PartnershipInquiries).update({ req: { user: ADMIN }, id: 'lead1' }), true);
});

test('PartnershipInquiries.delete stays admin-only', () => {
  assert.strictEqual(access(PartnershipInquiries).delete({ req: { user: STAFF }, id: 'lead1' }), false);
  assert.strictEqual(access(PartnershipInquiries).delete({ req: { user: ADMIN }, id: 'lead1' }), true);
});

test('PartnershipInquiries denies direct public writes', () => {
  assert.strictEqual(access(PartnershipInquiries).create({ req: { user: null } }), false);
  assert.strictEqual(access(PartnershipInquiries).update({ req: { user: null }, id: 'lead1' }), false);
  assert.strictEqual(access(PartnershipInquiries).delete({ req: { user: null }, id: 'lead1' }), false);
});
```

- [ ] **Step 2: Run the access test and verify it fails**

Run:

```bash
cd alkebu-load
pnpm test -- tests/access/staffAccess.test.ts
```

Expected: FAIL because `src/collections/PartnershipInquiries.ts` does not exist.

- [ ] **Step 3: Create the collection**

Create `alkebu-load/src/collections/PartnershipInquiries.ts`:

```ts
import type { CollectionConfig } from 'payload';

const isStaffOrAdmin = (user: any): boolean => user?.role === 'admin' || user?.role === 'staff';
const isAdmin = (user: any): boolean => user?.role === 'admin';

export const PartnershipInquiries: CollectionConfig = {
  slug: 'partnership-inquiries',
  admin: {
    useAsTitle: 'organizationName',
    defaultColumns: ['organizationName', 'inquiryType', 'status', 'followUpDate', 'emailStatus', 'crmSyncStatus', 'createdAt'],
    group: 'B2B',
    description: 'Wholesale, institutional, and non-profit partnership leads',
  },
  access: {
    read: ({ req: { user } }) => isStaffOrAdmin(user),
    create: ({ req: { user } }) => isStaffOrAdmin(user),
    update: ({ req: { user } }) => isStaffOrAdmin(user),
    delete: ({ req: { user } }) => isAdmin(user),
  },
  fields: [
    {
      name: 'inquiryType',
      type: 'select',
      required: true,
      options: [
        { label: 'Wholesale', value: 'wholesale' },
        { label: 'Institutional Contract', value: 'institutional' },
        { label: 'Non-profit Project', value: 'nonprofit' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'new',
      options: [
        { label: 'New', value: 'new' },
        { label: 'In Review', value: 'in_review' },
        { label: 'Followed Up', value: 'followed_up' },
        { label: 'Closed', value: 'closed' },
      ],
    },
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true },
    { name: 'phone', type: 'text' },
    { name: 'organizationName', type: 'text', required: true },
    { name: 'organizationType', type: 'text', required: true },
    { name: 'message', type: 'textarea', required: true },
    { name: 'sourcePath', type: 'text', required: true },
    { name: 'submittedAt', type: 'date', required: true },
    {
      name: 'wholesaleDetails',
      type: 'group',
      admin: { condition: (data) => data.inquiryType === 'wholesale' },
      fields: [
        { name: 'expectedOrderVolume', type: 'text' },
        { name: 'productInterests', type: 'array', fields: [{ name: 'interest', type: 'text' }] },
        { name: 'resaleOrDistributionNeeds', type: 'textarea' },
      ],
    },
    {
      name: 'institutionalDetails',
      type: 'group',
      admin: { condition: (data) => data.inquiryType === 'institutional' },
      fields: [
        { name: 'institutionType', type: 'text' },
        { name: 'purchasingMethod', type: 'text' },
        { name: 'taxExemptStatus', type: 'text' },
        { name: 'audienceOrStudentGroup', type: 'textarea' },
        { name: 'targetTimeline', type: 'text' },
      ],
    },
    {
      name: 'nonprofitDetails',
      type: 'group',
      admin: { condition: (data) => data.inquiryType === 'nonprofit' },
      fields: [
        { name: 'projectType', type: 'text' },
        { name: 'missionOrProgramContext', type: 'textarea' },
        { name: 'targetTimeline', type: 'text' },
        { name: 'budgetRange', type: 'text' },
        { name: 'supportRequested', type: 'text' },
      ],
    },
    { name: 'followUpDate', type: 'date' },
    { name: 'internalNotes', type: 'textarea' },
    { name: 'assignedTo', type: 'relationship', relationTo: 'users' },
    {
      name: 'emailStatus',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Sent', value: 'sent' },
        { label: 'Failed', value: 'failed' },
      ],
    },
    { name: 'emailSentAt', type: 'date' },
    { name: 'emailError', type: 'textarea' },
    { name: 'crmProvider', type: 'text', defaultValue: 'twenty' },
    { name: 'crmExternalId', type: 'text' },
    {
      name: 'crmSyncStatus',
      type: 'select',
      required: true,
      defaultValue: 'not_configured',
      options: [
        { label: 'Not Configured', value: 'not_configured' },
        { label: 'Pending', value: 'pending' },
        { label: 'Synced', value: 'synced' },
        { label: 'Failed', value: 'failed' },
      ],
    },
    { name: 'crmLastSyncedAt', type: 'date' },
    { name: 'crmSyncError', type: 'textarea' },
  ],
};
```

- [ ] **Step 4: Register the collection in Payload config**

Modify `alkebu-load/src/payload.config.ts`:

```ts
import { PartnershipInquiries } from './collections/PartnershipInquiries'
```

Add it to `collections` immediately after `InstitutionalAccounts`:

```ts
    InstitutionalAccounts,
    PartnershipInquiries,
```

- [ ] **Step 5: Run the access test and verify it passes**

Run:

```bash
cd alkebu-load
pnpm test -- tests/access/staffAccess.test.ts
```

Expected: PASS, including the new `PartnershipInquiries` tests.

- [ ] **Step 6: Commit Task 2**

```bash
git add alkebu-load/src/collections/PartnershipInquiries.ts alkebu-load/src/payload.config.ts alkebu-load/tests/access/staffAccess.test.ts
git commit -m "feat: add partnership inquiry collection"
```

---

### Task 3: Backend Submission Service and Public API Route

**Files:**
- Create: `alkebu-load/tests/partnership/partnershipInquirySubmission.test.ts`
- Create: `alkebu-load/src/app/utils/partnershipInquirySubmission.ts`
- Create: `alkebu-load/src/app/api/partnership-inquiries/route.ts`

- [ ] **Step 1: Write failing submission-service tests**

Create `alkebu-load/tests/partnership/partnershipInquirySubmission.test.ts`:

```ts
import assert from 'node:assert';
import test from 'node:test';

import { submitPartnershipInquiry } from '../../src/app/utils/partnershipInquirySubmission';

const validBody = {
  turnstileToken: 'token',
  inquiryType: 'wholesale',
  name: 'Ada Reader',
  email: 'ada@example.com',
  organizationName: 'Diaspora Books',
  organizationType: 'retailer',
  message: 'Need bulk titles.',
  sourcePath: '/wholesale',
  wholesaleDetails: {
    expectedOrderVolume: '100 books',
    productInterests: ['books'],
    resaleOrDistributionNeeds: 'Campus resale',
  },
};

const deps = (overrides: Partial<any> = {}) => {
  const calls: any[] = [];
  return {
    calls,
    verifyTurnstile: async () => ({ success: true }),
    isRateLimited: () => false,
    createInquiry: async (data: any) => {
      calls.push({ type: 'create', data });
      return { ...data, id: 'lead1' };
    },
    updateInquiry: async (id: string, data: any) => {
      calls.push({ type: 'update', id, data });
      return { id, ...data };
    },
    sendStaffEmail: async (email: any) => {
      calls.push({ type: 'email', email });
    },
    ...overrides,
  };
};

test('stores inquiry, sends email, and marks email sent', async () => {
  const testDeps = deps();
  const result = await submitPartnershipInquiry({ body: validBody, clientIp: '1.2.3.4', deps: testDeps });

  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.body.success, true);
  assert.deepStrictEqual(testDeps.calls.map((call) => call.type), ['create', 'email', 'update']);
  assert.strictEqual(testDeps.calls[0].data.emailStatus, 'pending');
  assert.strictEqual(testDeps.calls[2].data.emailStatus, 'sent');
});

test('returns success for honeypot submission without storing', async () => {
  const testDeps = deps();
  const result = await submitPartnershipInquiry({ body: { ...validBody, website: 'bot' }, clientIp: '1.2.3.4', deps: testDeps });

  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.body.success, true);
  assert.deepStrictEqual(testDeps.calls, []);
});

test('rejects failed Turnstile verification', async () => {
  const testDeps = deps({ verifyTurnstile: async () => ({ success: false, error: 'Bot check failed.' }) });
  const result = await submitPartnershipInquiry({ body: validBody, clientIp: '1.2.3.4', deps: testDeps });

  assert.strictEqual(result.status, 403);
  assert.strictEqual(result.body.success, false);
  assert.strictEqual(result.body.error, 'Bot check failed.');
});

test('rejects rate limited clients', async () => {
  const testDeps = deps({ isRateLimited: () => true });
  const result = await submitPartnershipInquiry({ body: validBody, clientIp: '1.2.3.4', deps: testDeps });

  assert.strictEqual(result.status, 429);
  assert.strictEqual(result.body.error, 'Too many inquiries. Please wait a few minutes and try again.');
});

test('returns validation errors before storage', async () => {
  const testDeps = deps();
  const result = await submitPartnershipInquiry({ body: { ...validBody, email: 'bad-email' }, clientIp: '1.2.3.4', deps: testDeps });

  assert.strictEqual(result.status, 400);
  assert.strictEqual(result.body.success, false);
  assert.ok(result.body.fieldErrors.email);
  assert.deepStrictEqual(testDeps.calls, []);
});

test('email failure after storage records failure and returns success', async () => {
  const testDeps = deps({ sendStaffEmail: async () => { throw new Error('SMTP down'); } });
  const result = await submitPartnershipInquiry({ body: validBody, clientIp: '1.2.3.4', deps: testDeps });

  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.body.success, true);
  assert.deepStrictEqual(testDeps.calls.map((call) => call.type), ['create', 'update']);
  assert.strictEqual(testDeps.calls[1].data.emailStatus, 'failed');
  assert.match(testDeps.calls[1].data.emailError, /SMTP down/);
});
```

- [ ] **Step 2: Run the focused submission test and verify it fails**

Run:

```bash
cd alkebu-load
pnpm test -- tests/partnership/partnershipInquirySubmission.test.ts
```

Expected: FAIL because `src/app/utils/partnershipInquirySubmission.ts` does not exist.

- [ ] **Step 3: Implement the submission service**

Create `alkebu-load/src/app/utils/partnershipInquirySubmission.ts`:

```ts
import {
  buildPartnershipEmail,
  buildStoredPartnershipInquiry,
  normalizePartnershipInquiry,
  validatePartnershipInquiry,
  type StoredPartnershipInquiry,
} from './partnershipInquiries';

interface TurnstileResult {
  success: boolean;
  error?: string;
}

interface SubmitDeps {
  verifyTurnstile: (token: string, clientIp: string) => Promise<TurnstileResult>;
  isRateLimited: (clientIp: string) => boolean;
  createInquiry: (data: StoredPartnershipInquiry) => Promise<StoredPartnershipInquiry & { id: string | number }>;
  updateInquiry: (id: string | number, data: Partial<StoredPartnershipInquiry>) => Promise<unknown>;
  sendStaffEmail: (email: { subject: string; text: string; html: string; replyTo?: string }) => Promise<void>;
}

interface SubmitArgs {
  body: any;
  clientIp: string;
  deps: SubmitDeps;
}

export async function submitPartnershipInquiry({ body, clientIp, deps }: SubmitArgs) {
  const turnstileToken = typeof body?.turnstileToken === 'string' ? body.turnstileToken.trim() : '';

  if (!turnstileToken) {
    return { status: 400, body: { success: false, error: 'Bot check is required. Please refresh the page and try again.' } };
  }

  const turnstile = await deps.verifyTurnstile(turnstileToken, clientIp);
  if (!turnstile.success) {
    return { status: 403, body: { success: false, error: turnstile.error || 'Bot check failed.' } };
  }

  if (deps.isRateLimited(clientIp)) {
    return { status: 429, body: { success: false, error: 'Too many inquiries. Please wait a few minutes and try again.' } };
  }

  const normalized = normalizePartnershipInquiry(body);

  if (normalized.website) {
    return { status: 200, body: { success: true } };
  }

  const validation = validatePartnershipInquiry(normalized);
  if (!validation.valid) {
    return { status: 400, body: { success: false, error: 'Please complete the required fields.', fieldErrors: validation.fieldErrors } };
  }

  let created: StoredPartnershipInquiry & { id: string | number };

  try {
    created = await deps.createInquiry(buildStoredPartnershipInquiry(normalized));
  } catch (error) {
    console.error('Partnership inquiry storage failed:', error);
    return { status: 500, body: { success: false, error: 'Unable to save your inquiry right now. Please try again later.' } };
  }

  try {
    const email = buildPartnershipEmail(created);
    await deps.sendStaffEmail({ ...email, replyTo: `${created.name} <${created.email}>` });
    await deps.updateInquiry(created.id, { emailStatus: 'sent', emailSentAt: new Date().toISOString() } as Partial<StoredPartnershipInquiry>);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown email failure';
    console.error('Partnership inquiry email failed:', error);
    await deps.updateInquiry(created.id, { emailStatus: 'failed', emailError: message } as Partial<StoredPartnershipInquiry>);
  }

  return { status: 200, body: { success: true, message: 'Thanks for reaching out. Your inquiry has been received.' } };
}
```

- [ ] **Step 4: Run the focused submission test and verify it passes**

Run:

```bash
cd alkebu-load
pnpm test -- tests/partnership/partnershipInquirySubmission.test.ts
```

Expected: PASS for all submission service tests.

- [ ] **Step 5: Implement the public API route**

Create `alkebu-load/src/app/api/partnership-inquiries/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getPayload } from 'payload';
import config from '@payload-config';
import { getEmailRuntimeConfig } from '@/app/utils/emailConfig';
import { submitPartnershipInquiry } from '@/app/utils/partnershipInquirySubmission';

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const buckets = new Map<string, { count: number; resetAt: number }>();

const getClientIp = (request: NextRequest): string =>
  request.headers.get('cf-connecting-ip') ||
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
  'unknown';

const isRateLimited = (key: string): boolean => {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  current.count += 1;
  return current.count > RATE_LIMIT_MAX;
};

const verifyTurnstile = async (token: string, clientIp: string) => {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { success: false, error: 'Bot protection is not configured on the server.' };

  const body = new URLSearchParams({ secret, response: token });
  if (clientIp && clientIp !== 'unknown') body.set('remoteip', clientIp);

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) return { success: false, error: 'Bot check failed. Please try again.' };

  const data = await response.json() as { success?: boolean };
  return data.success === true
    ? { success: true }
    : { success: false, error: 'Bot check failed. Please refresh the page and try again.' };
};

export async function POST(request: NextRequest) {
  const payload = await getPayload({ config });
  const emailConfig = getEmailRuntimeConfig();
  const body = await request.json().catch(() => ({}));

  const result = await submitPartnershipInquiry({
    body,
    clientIp: getClientIp(request),
    deps: {
      verifyTurnstile,
      isRateLimited,
      createInquiry: async (data) => payload.create({ collection: 'partnership-inquiries', data, overrideAccess: true }) as any,
      updateInquiry: async (id, data) => payload.update({ collection: 'partnership-inquiries', id, data, overrideAccess: true }),
      sendStaffEmail: async (email) => {
        if (!emailConfig.configured) throw new Error('Contact email is not configured on the server.');
        const transporter = nodemailer.createTransport({
          host: emailConfig.host,
          port: emailConfig.port,
          secure: emailConfig.secure,
          auth: { user: emailConfig.user, pass: emailConfig.password },
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
```

- [ ] **Step 6: Run backend partnership tests**

Run:

```bash
cd alkebu-load
pnpm test -- tests/partnership/partnershipInquiries.test.ts tests/partnership/partnershipInquirySubmission.test.ts tests/access/staffAccess.test.ts
```

Expected: PASS for all partnership and access tests.

- [ ] **Step 7: Commit Task 3**

```bash
git add alkebu-load/src/app/utils/partnershipInquirySubmission.ts alkebu-load/src/app/api/partnership-inquiries/route.ts alkebu-load/tests/partnership/partnershipInquirySubmission.test.ts
git commit -m "feat: add partnership inquiry endpoint"
```

---

### Task 4: Frontend Static Page Config and Tests

**Files:**
- Create: `alkebu-web/src/lib/data/partnershipPages.js`
- Create: `alkebu-web/tests/partnership-pages.test.mjs`

- [ ] **Step 1: Write failing config tests**

Create `alkebu-web/tests/partnership-pages.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';

import { partnershipPages, partnershipPageList, getPartnershipPageByPath } from '../src/lib/data/partnershipPages.js';

test('defines the three required partnership pages with unique paths', () => {
  assert.deepEqual(Object.keys(partnershipPages).sort(), ['institutional', 'nonprofit', 'wholesale']);
  assert.equal(new Set(partnershipPageList.map((page) => page.path)).size, 3);
  assert.deepEqual(partnershipPageList.map((page) => page.path).sort(), [
    '/institutional-contracts',
    '/non-profit-projects',
    '/wholesale',
  ]);
});

test('each page has SEO, benefits, process steps, and tailored fields', () => {
  for (const page of partnershipPageList) {
    assert.ok(page.seo.title);
    assert.ok(page.seo.description);
    assert.ok(page.hero.headline);
    assert.equal(page.benefits.length, 3);
    assert.equal(page.process.length, 3);
    assert.ok(page.form.detailFields.length >= 2);
  }
});

test('path lookup returns matching page config', () => {
  assert.equal(getPartnershipPageByPath('/wholesale').type, 'wholesale');
  assert.equal(getPartnershipPageByPath('/institutional-contracts').type, 'institutional');
  assert.equal(getPartnershipPageByPath('/non-profit-projects').type, 'nonprofit');
});
```

- [ ] **Step 2: Run frontend tests and verify failure**

Run:

```bash
cd alkebu-web
npm test -- tests/partnership-pages.test.mjs
```

Expected: FAIL because `src/lib/data/partnershipPages.js` does not exist.

- [ ] **Step 3: Create the static page config**

Create `alkebu-web/src/lib/data/partnershipPages.js`:

```js
export const partnershipPages = {
  wholesale: {
    type: 'wholesale',
    path: '/wholesale',
    seo: {
      title: 'Wholesale Books and Cultural Products | Alkebu-Lan Images',
      description: 'Partner with Alkebu-Lan Images for bulk orders, wholesale books, cultural products, and resale-friendly sourcing.',
    },
    hero: {
      eyebrow: 'Wholesale Solutions',
      headline: 'Bulk ordering rooted in culture and community.',
      body: 'Source books, apparel, wellness items, and cultural goods for your shop, program, or organization with help from Nashville\'s Black-owned bookstore.',
      cta: 'Start a wholesale inquiry',
    },
    fit: ['Retailers and pop-up shops', 'Organizations buying in bulk', 'Campus stores and cultural vendors', 'Distribution and resale partners'],
    benefits: [
      { title: 'Bulk sourcing', body: 'Tell us what you need and we will help identify available titles and products.' },
      { title: 'Cultural curation', body: 'We can recommend products aligned with Black literature, wellness, art, and community programming.' },
      { title: 'Flexible fulfillment', body: 'Coordinate local pickup, shipping, or follow-up for larger orders.' },
    ],
    process: ['Share the products and quantities you need.', 'We review availability and fit.', 'We follow up with pricing and next steps.'],
    form: {
      heading: 'Wholesale Inquiry',
      submitLabel: 'Send wholesale inquiry',
      detailGroup: 'wholesaleDetails',
      detailFields: [
        { name: 'expectedOrderVolume', label: 'Expected order volume', type: 'text', required: true },
        { name: 'productInterests', label: 'Product interests', type: 'checkboxes', required: true, options: ['books', 'apparel', 'health_beauty', 'home_goods'] },
        { name: 'resaleOrDistributionNeeds', label: 'Resale or distribution needs', type: 'textarea' },
      ],
    },
  },
  institutional: {
    type: 'institutional',
    path: '/institutional-contracts',
    seo: {
      title: 'Institutional Book Orders | Alkebu-Lan Images',
      description: 'Books and culturally relevant materials for schools, libraries, churches, and institutions.',
    },
    hero: {
      eyebrow: 'Institutional Contracts',
      headline: 'Books and resources for classrooms, libraries, and institutions.',
      body: 'Work with Alkebu-Lan Images on curated orders, purchase-order friendly workflows, and materials that serve your audience.',
      cta: 'Start an institutional inquiry',
    },
    fit: ['Schools and universities', 'Libraries', 'Churches and cultural institutions', 'Programs using purchase orders or invoices'],
    benefits: [
      { title: 'Audience-aware curation', body: 'We help match titles and materials to your readers, students, or community.' },
      { title: 'Institution-friendly details', body: 'Share purchasing method, tax-exempt status, and timeline from the start.' },
      { title: 'Follow-up with context', body: 'Your inquiry lands in Payload with enough structure for staff to respond clearly.' },
    ],
    process: ['Describe your institution and audience.', 'We review purchasing and timeline details.', 'We follow up with recommended next steps.'],
    form: {
      heading: 'Institutional Inquiry',
      submitLabel: 'Send institutional inquiry',
      detailGroup: 'institutionalDetails',
      detailFields: [
        { name: 'institutionType', label: 'Institution type', type: 'select', required: true, options: ['school', 'university', 'library', 'church', 'cultural_institution', 'government', 'other'] },
        { name: 'purchasingMethod', label: 'Purchasing method', type: 'select', required: true, options: ['card', 'purchase_order', 'invoice', 'check', 'not_sure'] },
        { name: 'taxExemptStatus', label: 'Tax-exempt status', type: 'select', options: ['yes', 'no', 'not_sure'] },
        { name: 'audienceOrStudentGroup', label: 'Audience or student group', type: 'textarea' },
        { name: 'targetTimeline', label: 'Target timeline', type: 'text' },
      ],
    },
  },
  nonprofit: {
    type: 'nonprofit',
    path: '/non-profit-projects',
    seo: {
      title: 'Non-profit Projects | Alkebu-Lan Images',
      description: 'Community project, book drive, sponsorship, and mission-aligned partnership inquiries for Alkebu-Lan Images.',
    },
    hero: {
      eyebrow: 'Non-profit Projects',
      headline: 'Mission-aligned support for community projects.',
      body: 'Tell us about your program, book drive, sponsorship idea, or community initiative so we can explore the right fit.',
      cta: 'Start a project inquiry',
    },
    fit: ['Community programs', 'Book drives and literacy projects', 'Mission-aligned sponsorships', 'Grassroots and non-profit organizations'],
    benefits: [
      { title: 'Project context first', body: 'The form captures mission, timeline, budget, and support requested.' },
      { title: 'Community-centered review', body: 'Staff can understand the purpose before responding.' },
      { title: 'CRM-ready history', body: 'Inquiries are stored for follow-up now and future CRM sync later.' },
    ],
    process: ['Share your project and mission.', 'We review fit, timeline, and support requested.', 'We follow up with next steps.'],
    form: {
      heading: 'Non-profit Project Inquiry',
      submitLabel: 'Send project inquiry',
      detailGroup: 'nonprofitDetails',
      detailFields: [
        { name: 'projectType', label: 'Project type', type: 'select', required: true, options: ['book_drive', 'sponsorship', 'program_support', 'event', 'other'] },
        { name: 'missionOrProgramContext', label: 'Mission or program context', type: 'textarea' },
        { name: 'targetTimeline', label: 'Target timeline', type: 'text' },
        { name: 'budgetRange', label: 'Budget range', type: 'select', options: ['under_500', '500_1000', '1000_2500', '2500_plus', 'not_sure'] },
        { name: 'supportRequested', label: 'Support requested', type: 'select', required: true, options: ['discounted_books', 'donation', 'sponsorship', 'curation', 'not_sure'] },
      ],
    },
  },
};

export const partnershipPageList = Object.values(partnershipPages);

export function getPartnershipPageByPath(path) {
  return partnershipPageList.find((page) => page.path === path);
}
```

- [ ] **Step 4: Run frontend tests and verify they pass**

Run:

```bash
cd alkebu-web
npm test -- tests/partnership-pages.test.mjs
```

Expected: PASS for all partnership page config tests.

- [ ] **Step 5: Commit Task 4**

```bash
git add alkebu-web/src/lib/data/partnershipPages.js alkebu-web/tests/partnership-pages.test.mjs
git commit -m "feat: add partnership page config"
```

---

### Task 5: Frontend Server Action Helper and Routes

**Files:**
- Create: `alkebu-web/src/lib/server/partnershipInquiry.ts`
- Create: `alkebu-web/src/routes/wholesale/+page.server.ts`
- Create: `alkebu-web/src/routes/institutional-contracts/+page.server.ts`
- Create: `alkebu-web/src/routes/non-profit-projects/+page.server.ts`
- Create route page files in Task 6.

- [ ] **Step 1: Add the server action helper**

Create `alkebu-web/src/lib/server/partnershipInquiry.ts`:

```ts
import { fail } from '@sveltejs/kit';
import { getPayloadApiUrl, getPayloadAuthHeader } from '$lib/server/payloadEnv';

const text = (formData: FormData, key: string): string => String(formData.get(key) || '').trim();
const list = (formData: FormData, key: string): string[] => formData.getAll(key).map((value) => String(value).trim()).filter(Boolean);

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

export async function handlePartnershipInquiryAction({ request, fetch, page }: { request: Request; fetch: typeof globalThis.fetch; page: any }) {
  const formData = await request.formData();
  const detailGroup = page.form.detailGroup;
  const detailValues: Record<string, unknown> = {};

  for (const field of page.form.detailFields) {
    detailValues[field.name] = field.type === 'checkboxes'
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

  if (!values.name || !values.email || !values.organizationName || !values.organizationType || !values.message) {
    return fail(400, { success: false, values, error: 'Please complete the required fields before sending your inquiry.' });
  }

  if (!turnstileToken) {
    return fail(400, { success: false, values, error: 'Please complete the bot check before sending your inquiry.' });
  }

  const response = await fetch(`${getPayloadApiUrl()}/api/partnership-inquiries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getPayloadAuthHeader() },
    body: JSON.stringify({ ...values, turnstileToken }),
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
}
```

- [ ] **Step 2: Add route server files**

Create `alkebu-web/src/routes/wholesale/+page.server.ts`:

```ts
import { buildSEOData } from '$lib/seo';
import { PUBLIC_SITE_URL } from '$env/static/public';
import { partnershipPages } from '$lib/data/partnershipPages';
import { handlePartnershipInquiryAction } from '$lib/server/partnershipInquiry';
import type { Actions, PageServerLoad } from './$types';

const page = partnershipPages.wholesale;

export const load: PageServerLoad = async ({ setHeaders }) => {
  setHeaders({ 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800', 'Vary': 'Accept-Encoding', 'x-key': 'partnership-wholesale' });
  return { page, seo: buildSEOData({ title: page.seo.title, description: page.seo.description, canonical: `${PUBLIC_SITE_URL}${page.path}` }) };
};

export const actions: Actions = {
  default: async ({ request, fetch }) => handlePartnershipInquiryAction({ request, fetch, page }),
};
```

Create `alkebu-web/src/routes/institutional-contracts/+page.server.ts` with the same structure and these replacements:

```ts
const page = partnershipPages.institutional;
// x-key: partnership-institutional
```

Create `alkebu-web/src/routes/non-profit-projects/+page.server.ts` with the same structure and these replacements:

```ts
const page = partnershipPages.nonprofit;
// x-key: partnership-nonprofit
```

- [ ] **Step 3: Run SvelteKit type check and verify the server files compile**

Run:

```bash
cd alkebu-web
npm run check
```

Expected: PASS or only pre-existing unrelated failures. If there are failures caused by these new files, fix them before continuing.

- [ ] **Step 4: Commit Task 5**

```bash
git add alkebu-web/src/lib/server/partnershipInquiry.ts alkebu-web/src/routes/wholesale/+page.server.ts alkebu-web/src/routes/institutional-contracts/+page.server.ts alkebu-web/src/routes/non-profit-projects/+page.server.ts
git commit -m "feat: add partnership inquiry route actions"
```

---

### Task 6: Svelte Page Shell, Route Pages, and Homepage Links

**Files:**
- Create: `alkebu-web/src/lib/components/Partnership/PartnershipLandingPage.svelte`
- Create: `alkebu-web/src/routes/wholesale/+page.svelte`
- Create: `alkebu-web/src/routes/institutional-contracts/+page.svelte`
- Create: `alkebu-web/src/routes/non-profit-projects/+page.svelte`
- Modify: `alkebu-web/src/routes/+page.svelte`

- [ ] **Step 1: Create the reusable Svelte page shell**

Create `alkebu-web/src/lib/components/Partnership/PartnershipLandingPage.svelte`:

```svelte
<script>
  import { enhance } from '$app/forms';
  import Meta from '$lib/components/Meta.svelte';
  import { ArrowRight, CheckCircle2, Send } from 'lucide-svelte';
  import { PUBLIC_TURNSTILE_SITE_KEY } from '$env/static/public';

  let { data, form } = $props();
  const page = $derived(data.page);
  const metadata = $derived({ title: page.seo.title, description: page.seo.description, image: '/assets/images/resources/logo.png', imageAlt: 'Alkebu-Lan Images Logo', url: page.path });
  const values = $derived(form?.values ?? {});
  const detailValues = $derived(values?.[page.form.detailGroup] ?? {});
  const fieldErrors = $derived(form?.fieldErrors ?? {});
</script>

<svelte:head>
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
</svelte:head>

<Meta {metadata} />

<section class="relative overflow-hidden bg-kente-forest text-white">
  <div class="absolute inset-0 bg-gradient-to-br from-kente-forest via-kente-indigo/80 to-kente-forest"></div>
  <div class="container relative z-10 mx-auto grid gap-10 px-4 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
    <div>
      <p class="mb-3 text-sm font-semibold uppercase tracking-wide text-kente-gold">{page.hero.eyebrow}</p>
      <h1 class="font-display text-4xl font-bold leading-tight md:text-5xl">{page.hero.headline}</h1>
      <p class="mt-5 max-w-2xl text-lg text-white/82">{page.hero.body}</p>
      <a href="#inquiry" class="btn-primary btn-lg mt-8 inline-flex items-center gap-2">
        {page.hero.cta}
        <ArrowRight class="h-5 w-5" />
      </a>
    </div>
    <div class="rounded-lg border border-white/15 bg-white/10 p-6 backdrop-blur">
      <h2 class="font-display text-2xl font-bold">Who this is for</h2>
      <div class="mt-5 grid gap-3">
        {#each page.fit as item}
          <div class="flex items-start gap-3 text-white/88">
            <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-kente-gold" />
            <span>{item}</span>
          </div>
        {/each}
      </div>
    </div>
  </div>
</section>

<section class="section bg-background">
  <div class="container mx-auto px-4">
    <div class="grid gap-6 md:grid-cols-3">
      {#each page.benefits as benefit}
        <article class="card-modern p-6">
          <h2 class="font-display text-xl font-bold">{benefit.title}</h2>
          <p class="mt-3 text-sm leading-6 text-muted-foreground">{benefit.body}</p>
        </article>
      {/each}
    </div>
  </div>
</section>

<section class="section bg-muted/30">
  <div class="container mx-auto px-4">
    <div class="mx-auto max-w-3xl text-center">
      <p class="mb-2 text-sm font-semibold uppercase tracking-wide text-primary-strong">How it works</p>
      <h2 class="font-display text-3xl font-bold">Simple next steps</h2>
    </div>
    <div class="mt-10 grid gap-6 md:grid-cols-3">
      {#each page.process as step, index}
        <div class="text-center">
          <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">{index + 1}</div>
          <p class="mt-4 font-semibold">{step}</p>
        </div>
      {/each}
    </div>
  </div>
</section>

<section id="inquiry" class="section bg-background">
  <div class="container mx-auto grid gap-10 px-4 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
    <div>
      <p class="mb-2 text-sm font-semibold uppercase tracking-wide text-primary-strong">Let's work together</p>
      <h2 class="font-display text-3xl font-bold">{page.form.heading}</h2>
      <p class="mt-4 text-muted-foreground">Share a few details and the Alkebu-Lan Images team will follow up with next steps.</p>
    </div>

    <div class="card-modern p-6 md:p-8">
      {#if form?.success}
        <div class="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{form.message}</div>
      {/if}
      {#if form?.error}
        <div class="mb-6 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{form.error}</div>
      {/if}

      <form method="POST" class="grid gap-5" use:enhance>
        <input type="hidden" name="inquiryType" value={page.type} />
        <div class="hidden" aria-hidden="true">
          <label for="website">Website</label>
          <input id="website" name="website" tabindex="-1" autocomplete="off" value={values.website || ''} />
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <label class="grid gap-2 text-sm font-medium">Name<input class="input-modern" name="name" value={values.name || ''} required /></label>
          <label class="grid gap-2 text-sm font-medium">Email<input class="input-modern" name="email" type="email" value={values.email || ''} required /></label>
          <label class="grid gap-2 text-sm font-medium">Phone<input class="input-modern" name="phone" type="tel" value={values.phone || ''} /></label>
          <label class="grid gap-2 text-sm font-medium">Organization<input class="input-modern" name="organizationName" value={values.organizationName || ''} required /></label>
        </div>

        <label class="grid gap-2 text-sm font-medium">Organization type<input class="input-modern" name="organizationType" value={values.organizationType || ''} required /></label>

        {#each page.form.detailFields as field}
          <div class="grid gap-2 text-sm font-medium">
            <span>{field.label}</span>
            {#if field.type === 'textarea'}
              <textarea class="textarea-modern" name={`${page.form.detailGroup}.${field.name}`} rows="4" required={field.required}>{detailValues[field.name] || ''}</textarea>
            {:else if field.type === 'select'}
              <select class="select-modern" name={`${page.form.detailGroup}.${field.name}`} required={field.required}>
                <option value="">Select one</option>
                {#each field.options as option}
                  <option value={option} selected={detailValues[field.name] === option}>{option.replaceAll('_', ' ')}</option>
                {/each}
              </select>
            {:else if field.type === 'checkboxes'}
              <div class="grid gap-2 sm:grid-cols-2">
                {#each field.options as option}
                  <label class="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-normal">
                    <input type="checkbox" name={`${page.form.detailGroup}.${field.name}`} value={option} checked={(detailValues[field.name] || []).includes(option)} />
                    {option.replaceAll('_', ' ')}
                  </label>
                {/each}
              </div>
            {:else}
              <input class="input-modern" name={`${page.form.detailGroup}.${field.name}`} value={detailValues[field.name] || ''} required={field.required} />
            {/if}
            {#if fieldErrors[field.name]}
              <p class="text-sm text-destructive">{fieldErrors[field.name].join(' ')}</p>
            {/if}
          </div>
        {/each}

        <label class="grid gap-2 text-sm font-medium">Message<textarea class="textarea-modern" name="message" rows="5" required>{values.message || ''}</textarea></label>
        <div class="cf-turnstile" data-sitekey={PUBLIC_TURNSTILE_SITE_KEY} data-theme="light"></div>
        <button type="submit" class="btn-primary inline-flex items-center gap-2 justify-self-start"><Send class="h-5 w-5" />{page.form.submitLabel}</button>
      </form>
    </div>
  </div>
</section>

<section class="section bg-muted/30">
  <div class="container mx-auto px-4">
    <h2 class="font-display text-2xl font-bold">Other ways to work with us</h2>
    <div class="mt-6 grid gap-4 md:grid-cols-2">
      {#each data.relatedPages as related}
        <a href={related.path} class="card-modern block p-5 transition-transform hover:-translate-y-1">
          <p class="font-semibold">{related.hero.eyebrow}</p>
          <p class="mt-2 text-sm text-muted-foreground">{related.hero.headline}</p>
        </a>
      {/each}
    </div>
  </div>
</section>
```

- [ ] **Step 2: Create route page wrappers**

Create each route `+page.svelte` with this content.

`alkebu-web/src/routes/wholesale/+page.svelte`:

```svelte
<script>
  import PartnershipLandingPage from '$lib/components/Partnership/PartnershipLandingPage.svelte';
  let { data, form } = $props();
</script>

<PartnershipLandingPage {data} {form} />
```

Use the same content for:

- `alkebu-web/src/routes/institutional-contracts/+page.svelte`
- `alkebu-web/src/routes/non-profit-projects/+page.svelte`

- [ ] **Step 3: Include related page data in each route server load**

Modify each partnership route server file so the returned object includes related pages:

```ts
const relatedPages = Object.values(partnershipPages).filter((item) => item.path !== page.path);
return { page, relatedPages, seo: buildSEOData({ title: page.seo.title, description: page.seo.description, canonical: `${PUBLIC_SITE_URL}${page.path}` }) };
```

- [ ] **Step 4: Update homepage card links**

Modify the `businessServices` data in `alkebu-web/src/routes/+page.svelte` so each item has `href`:

```js
{
  title: "Wholesale",
  subtitle: "solutions",
  href: "/wholesale",
  image: section4.images[0],
  desc: "Partner with us for bulk orders and wholesale pricing for retailers and distributors.",
},
{
  title: "Institutional",
  subtitle: "Contracts",
  href: "/institutional-contracts",
  image: section4.images[1],
  desc: "Libraries, schools, and organizations can benefit from our institutional partnerships.",
},
{
  title: "Non-profit",
  subtitle: "projects",
  href: "/non-profit-projects",
  image: section4.images[2],
  desc: "We support community initiatives and non-profit organizations with special programs.",
},
```

Then change the card anchor from:

```svelte
<a href="/contact" class="group">
```

to:

```svelte
<a href={service.href} class="group">
```

- [ ] **Step 5: Run frontend verification**

Run:

```bash
cd alkebu-web
npm run check
npm test -- tests/partnership-pages.test.mjs
```

Expected: `npm run check` passes, and the partnership page config test passes.

- [ ] **Step 6: Commit Task 6**

```bash
git add alkebu-web/src/lib/components/Partnership/PartnershipLandingPage.svelte alkebu-web/src/routes/wholesale/+page.svelte alkebu-web/src/routes/institutional-contracts/+page.svelte alkebu-web/src/routes/non-profit-projects/+page.svelte alkebu-web/src/routes/wholesale/+page.server.ts alkebu-web/src/routes/institutional-contracts/+page.server.ts alkebu-web/src/routes/non-profit-projects/+page.server.ts alkebu-web/src/routes/+page.svelte
git commit -m "feat: add partnership landing pages"
```

---

### Task 7: Payload Types, Full Verification, and Final Commit Hygiene

**Files:**
- Modify generated: `alkebu-load/src/payload-types.ts`
- Modify generated if needed: `alkebu-load/src/app/(payload)/admin/importMap.js` only if Payload requests import map changes.

- [ ] **Step 1: Generate Payload types**

Run:

```bash
cd alkebu-load
pnpm generate:types
```

Expected: `src/payload-types.ts` includes `partnership-inquiries` types.

- [ ] **Step 2: Run backend tests**

Run:

```bash
cd alkebu-load
pnpm test -- tests/partnership/partnershipInquiries.test.ts tests/partnership/partnershipInquirySubmission.test.ts tests/access/staffAccess.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run frontend checks**

Run:

```bash
cd alkebu-web
npm run check
npm test -- tests/partnership-pages.test.mjs
```

Expected: PASS.

- [ ] **Step 4: Run broader checks if time allows**

Run:

```bash
cd alkebu-load
pnpm test
```

Expected: PASS, except for unrelated pre-existing failures documented in the final handoff if they appear.

Run:

```bash
cd alkebu-web
npm run build
```

Expected: PASS. If the backend must be reachable for the build, start `alkebu-load` first with `pnpm dev` and rerun.

- [ ] **Step 5: Review changed files**

Run:

```bash
git status --short
git diff --stat
```

Expected: changed files are limited to partnership inquiry backend, partnership landing pages frontend, generated Payload types, `.gitignore` if not already committed, and the plan/spec docs.

- [ ] **Step 6: Commit generated types and final verification changes**

```bash
git add alkebu-load/src/payload-types.ts .gitignore docs/superpowers/plans/2026-06-26-partnership-landing-pages-implementation.md
git commit -m "chore: finalize partnership landing page implementation"
```

If `.gitignore` or the plan file was already committed before execution, stage only the generated types and remaining implementation files.

---

## Self-Review

Spec coverage:

- Three top-level routes are covered in Tasks 4-6.
- Shared static frontend config is covered in Task 4.
- Reusable Svelte page shell is covered in Task 6.
- Homepage card links are covered in Task 6.
- `PartnershipInquiries` collection and access control are covered in Task 2.
- Tailored form details are covered in Tasks 1, 4, 5, and 6.
- Protected backend submission flow is covered in Task 3.
- Staff email status behavior is covered in Tasks 1 and 3.
- CRM-ready fields without live Twenty.com sync are covered in Tasks 1 and 2.
- Frontend/backend verification is covered in Task 7.

Type consistency:

- Inquiry type values are `wholesale`, `institutional`, and `nonprofit` in backend utilities, Payload collection, frontend config, and route action payloads.
- Frontend detail group names match backend detail group names: `wholesaleDetails`, `institutionalDetails`, and `nonprofitDetails`.
- Email status values match across collection and submission service: `pending`, `sent`, `failed`.
- CRM sync values match across collection and utility defaults: `not_configured`, `pending`, `synced`, `failed`.
