# Partnership Landing Pages and CRM-Ready Inquiries Design

## Summary

Build three top-level partnership landing pages for the existing "More than just Retail" homepage section:

- `/wholesale`
- `/institutional-contracts`
- `/non-profit-projects`

Each page will use a shared SvelteKit landing-page shell with static v1 content from a single frontend config. Each page will include tailored copy, route-specific inquiry fields, SEO metadata, and a direct form. Submissions will be Turnstile-protected, stored in Payload, emailed to staff, and structured for a later Twenty.com CRM sync.

## Goals

- Give each homepage partnership card a real destination instead of sending all visitors to `/contact`.
- Capture higher-quality leads through tailored forms for wholesale, institutional, and non-profit inquiries.
- Store inquiries in Payload so staff can see and follow up on leads.
- Keep v1 content static in code, but organized so it can move to Payload later.
- Include CRM sync fields now so a later Twenty.com integration does not require reshaping submitted data.

## Non-Goals

- Do not connect to Twenty.com in v1.
- Do not build a full CRM inside Payload.
- Do not make the landing page copy editable in Payload yet.
- Do not replace the existing general contact form.
- Do not alter unrelated checkout, refund, order, or catalog behavior.

## Routes and Frontend Architecture

The frontend will add three top-level routes:

- `/wholesale`
- `/institutional-contracts`
- `/non-profit-projects`

All three routes will render through a reusable partnership landing-page shell. Route content will come from one shared frontend config keyed by inquiry type. The config will include:

- slug and route path
- page title and SEO metadata
- hero headline, eyebrow, body copy, and CTA label
- use cases / audience fit copy
- benefit blocks
- process steps
- page-specific form fields
- cross-links to the other two partnership pages

This keeps the first implementation lean while leaving a clean migration path to Payload-managed page content later.

## Page Structure

Each page will follow the same structure with page-specific content.

### Hero

The hero will identify the audience, explain the offer in practical terms, and include a primary CTA that jumps to the inquiry form.

### Fit / Use Cases

This section explains who the page is for:

- Wholesale: retailers, organizations, bulk buyers, resale, and distribution needs.
- Institutional Contracts: schools, libraries, churches, cultural institutions, and purchase-order style buying.
- Non-profit Projects: community programs, book drives, sponsorships, and mission-aligned projects.

### How We Help

Each page will include three tailored benefit blocks. Examples include bulk book sourcing, culturally relevant curation, invoice-friendly workflows, local pickup/shipping coordination, and community project support.

### Process

Each page will show a simple process:

1. Tell us what you need.
2. We review the request.
3. We follow up with next steps.

### Inquiry Form

The form will be embedded directly on the page, not routed through `/contact`. It will be Turnstile-protected and tailored to the page type.

### Cross-Links

A small "Other ways to work with us" section will link to the other two partnership pages.

### Homepage Links

The homepage business-service cards will link to these new routes instead of `/contact`.

## Payload Data Model

Add a `PartnershipInquiries` collection for stored lead and light pipeline management.

### Core Fields

- `inquiryType`: `wholesale`, `institutional`, or `nonprofit`
- `status`: light pipeline status, defaulting to `new`
- `name`
- `email`
- `phone`
- `organizationName`
- `organizationType`
- `message`
- `sourcePath`
- `submittedAt`

### Page-Specific Details

`wholesaleDetails`:

- expected order volume
- product interests
- resale or distribution needs

`institutionalDetails`:

- institution type
- purchasing method
- tax-exempt status
- audience or student group
- target timeline

`nonprofitDetails`:

- project type
- mission or program context
- target timeline
- budget range
- support requested

### Pipeline Fields

- `followUpDate`
- `internalNotes`
- nullable `assignedTo` relationship to a Payload user

### Email Fields

- `emailStatus`: `pending`, `sent`, or `failed`
- `emailSentAt`
- `emailError`

### CRM-Ready Fields

- `crmProvider`
- `crmExternalId`
- `crmSyncStatus`: `not_configured`, `pending`, `synced`, or `failed`
- `crmLastSyncedAt`
- `crmSyncError`

These fields support a future Twenty.com sync without requiring a schema redesign.

## Access Control

Public visitors can only create records through the protected inquiry endpoint. They cannot list or read inquiries.

Admin and staff users can read and manage records in Payload admin. Staff-only fields such as status, follow-up date, internal notes, assigned user, and CRM sync fields must not be writable from the public request body.

## Submission Flow

1. Visitor submits a tailored form from one of the three pages.
2. SvelteKit validates required fields and preserves entered values when validation fails.
3. SvelteKit forwards a normalized payload and Turnstile token to the Payload inquiry endpoint.
4. Payload verifies Turnstile.
5. Payload rate-limits by client IP.
6. Payload sanitizes and validates submitted fields.
7. Payload creates the `PartnershipInquiries` record.
8. Payload sends a staff email.
9. Payload updates email status fields.
10. SvelteKit returns a success state and clears the form.

The storage step happens before the staff email. If the email fails after storage, staff can still recover the lead in Payload admin because the record remains with `emailStatus: failed` and `emailError`. In that case the visitor still receives a success message because the inquiry was captured. If storage fails, no email is sent and the visitor receives an error.

## Error Handling

The user-facing form will handle:

- missing required fields
- invalid email
- failed Turnstile verification
- rate limiting
- backend unavailable
- storage failure
- unexpected submission failure

Errors should be shown inline near the form. Successful submission should clear the form and show a confirmation message that the inquiry was received.

## Spam and Security

Use the same general protections as the existing contact flow:

- honeypot field
- Cloudflare Turnstile token
- server-side Turnstile verification
- per-client rate limiting
- server-side validation and sanitization
- public create-only endpoint
- staff/admin-only access for inquiry records

The public endpoint must ignore or reject staff-only fields supplied by a visitor.

## Email Behavior

Staff emails should include:

- inquiry type
- contact information
- organization information
- page-specific details
- message
- source path
- direct admin context if available

The email should be formatted for quick staff triage and use the existing SMTP/runtime email configuration pattern.

## Testing

Frontend verification should cover:

- all three routes render
- route-specific copy and tailored fields display correctly
- SEO metadata is set per route
- homepage cards link to the new routes
- required-field errors preserve entered values
- successful submission clears the form
- failed submissions show useful inline messages

Backend verification should cover:

- Payload type generation after adding the collection
- collection access control
- sanitization and validation
- successful inquiry record creation
- staff-only fields cannot be set from public submissions
- staff email success updates email status
- email failure after storage keeps the record, records the error, and still returns success to the visitor
- Turnstile failure
- honeypot submission
- rate limiting
- CRM field defaults

## Rollout

V1 stops at CRM-ready local lead capture. It does not sync to Twenty.com.

A later CRM integration can add a sync job or webhook/queue adapter that:

1. Finds unsynced `PartnershipInquiries`.
2. Creates or updates leads in Twenty.com.
3. Writes the external CRM ID and sync status back to Payload.
4. Records sync errors for staff visibility.

## Implementation Notes

Exact route copy and form option labels can be adjusted during implementation without changing the architecture.
