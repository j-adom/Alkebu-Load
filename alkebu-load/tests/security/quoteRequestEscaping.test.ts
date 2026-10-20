import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  quoteRequestSystem,
  parseQuoteRequestBody,
  type QuoteRequest,
} from '../../src/app/utils/quoteRequestSystem';
import type { ExternalBookData } from '../../src/app/utils/externalBookAPI';
import { createRateLimiter } from '../../src/app/utils/rateLimit';

const SCRIPT = '<script>alert(1)</script>';
const SCRIPT_ESCAPED = '&lt;script&gt;alert(1)&lt;/script&gt;';
const LINK = '<a href="https://evil.example/login">Verify your account</a>';
const LINK_ESCAPED = '&lt;a href=&quot;https://evil.example/login&quot;&gt;Verify your account&lt;/a&gt;';

const PAYLOADS = [
  { raw: SCRIPT, escaped: SCRIPT_ESCAPED, rawMarker: '<script' },
  { raw: LINK, escaped: LINK_ESCAPED, rawMarker: '<a href="https://evil.example' },
];

const baseRequest = (): QuoteRequest => ({
  bookTitle: 'Their Eyes Were Watching God',
  author: 'Zora Neale Hurston',
  isbn: '9780061120060',
  format: 'paperback',
  quantity: 2,
  urgency: 'normal',
  maxBudget: 40,
  specialInstructions: 'Gift wrap please',
  customerName: 'Ada Customer',
  customerEmail: 'ada@example.com',
  customerPhone: '615-555-0100',
  preferredContact: 'email',
  requestSource: 'website-search',
});

const baseBook = (): ExternalBookData => ({
  title: 'Their Eyes Were Watching God',
  author: 'Zora Neale Hurston',
  isbn: '9780061120060',
  publisher: 'Harper',
  description: 'A novel.',
  available: true,
  pricing: [{ source: 'isbndb', price: 17.99, currency: 'USD', priceType: 'retail' }],
});

// Private builders are reached via element access, which TypeScript permits.
const customerEmail = (req: QuoteRequest, books: ExternalBookData[] = []) =>
  quoteRequestSystem['generateCustomerConfirmationEmail'](req, '42', books);
const staffEmail = (req: QuoteRequest, books: ExternalBookData[] = []) =>
  quoteRequestSystem['generateStaffNotificationEmail'](req, '42', books);
const initialContent = (req: QuoteRequest) =>
  quoteRequestSystem['generateInitialRequestContent'](req);
const followupEmail = (quote: Record<string, unknown>) =>
  quoteRequestSystem['generateFollowupEmail'](quote);

function assertEscaped(html: string, payload: (typeof PAYLOADS)[number], label: string) {
  assert.ok(!html.includes(payload.rawMarker), `${label}: raw "${payload.rawMarker}" must not appear`);
  assert.ok(html.includes(payload.escaped), `${label}: escaped payload must appear`);
}

const REQUEST_FIELDS = [
  'customerName',
  'customerEmail',
  'customerPhone',
  'bookTitle',
  'author',
  'isbn',
  'format',
  'urgency',
  'preferredContact',
  'requestSource',
  'specialInstructions',
] as const;

// Fields each HTML body actually renders.
const CUSTOMER_FIELDS = ['customerName', 'bookTitle', 'author', 'isbn', 'format', 'urgency'] as const;
const INITIAL_FIELDS = [...CUSTOMER_FIELDS, 'specialInstructions'] as const;

describe('quote request emails escape caller-supplied fields', () => {
  for (const payload of PAYLOADS) {
    for (const field of REQUEST_FIELDS) {
      const req = { ...baseRequest(), [field]: payload.raw } as QuoteRequest;

      it(`staff notification escapes ${field} (${payload.rawMarker})`, () => {
        assertEscaped(staffEmail(req).html, payload, `staff.${field}`);
      });

      if ((CUSTOMER_FIELDS as readonly string[]).includes(field)) {
        it(`customer confirmation escapes ${field} (${payload.rawMarker})`, () => {
          assertEscaped(customerEmail(req).html, payload, `customer.${field}`);
        });
      }

      if ((INITIAL_FIELDS as readonly string[]).includes(field)) {
        it(`communications log entry escapes ${field} (${payload.rawMarker})`, () => {
          assertEscaped(initialContent(req), payload, `initial.${field}`);
        });
      }
    }

    for (const field of ['title', 'author', 'isbn', 'publisher', 'description'] as const) {
      it(`external result ${field} is escaped in both emails (${payload.rawMarker})`, () => {
        const book = { ...baseBook(), [field]: payload.raw } as ExternalBookData;
        assertEscaped(staffEmail(baseRequest(), [book]).html, payload, `staff.book.${field}`);
        if (field === 'title' || field === 'author') {
          assertEscaped(customerEmail(baseRequest(), [book]).html, payload, `customer.book.${field}`);
        }
      });
    }

    it(`follow-up email escapes stored customerName and bookTitle (${payload.rawMarker})`, () => {
      for (const field of ['customerName', 'bookTitle']) {
        const quote = { id: 7, customerEmail: 'ada@example.com', customerName: 'Ada', bookTitle: 'Book', [field]: payload.raw };
        assertEscaped(followupEmail(quote).html, payload, `followup.${field}`);
      }
    });
  }

  it('keeps the staff admin link intact', () => {
    assert.match(staffEmail(baseRequest()).html, /<a href="[^"]*\/admin\/collections\/bookQuotes\/42"/);
  });

  it('strips CR/LF from every subject line', () => {
    const title = 'Book\r\nBcc: victim@example.com\nX-Evil: 1';
    const req = { ...baseRequest(), bookTitle: title };
    const subjects = [
      customerEmail(req).subject,
      staffEmail(req).subject,
      followupEmail({ id: 7, customerEmail: 'a@example.com', customerName: 'A', bookTitle: title }).subject,
    ];
    for (const subject of subjects) {
      assert.ok(!/[\r\n]/.test(subject), `subject must be a single line: ${JSON.stringify(subject)}`);
      assert.ok(subject.includes('Bcc: victim@example.com'), 'text is kept, only line breaks removed');
    }
  });
});

describe('parseQuoteRequestBody', () => {
  const validBody = () => ({
    bookTitle: '  Kindred ',
    customerName: 'Ada',
    customerEmail: 'Ada@Example.com',
    quantity: '2',
  });

  it('normalizes a valid body and applies enum defaults', () => {
    const result = parseQuoteRequestBody(validBody());
    assert.ok(result.ok);
    assert.equal(result.quoteRequest.bookTitle, 'Kindred');
    assert.equal(result.quoteRequest.customerEmail, 'ada@example.com');
    assert.equal(result.quoteRequest.quantity, 2);
    assert.equal(result.quoteRequest.format, 'any');
    assert.equal(result.quoteRequest.requestSource, 'website-search');
  });

  it('ignores searchAnalyticsId and other unknown fields', () => {
    const result = parseQuoteRequestBody({ ...validBody(), searchAnalyticsId: 123, status: 'approved' });
    assert.ok(result.ok);
    assert.equal('searchAnalyticsId' in result.quoteRequest, false);
    assert.equal('status' in result.quoteRequest, false);
  });

  it('rejects values outside the select options', () => {
    for (const field of ['format', 'urgency', 'preferredContact', 'requestSource']) {
      const result = parseQuoteRequestBody({ ...validBody(), [field]: SCRIPT });
      assert.equal(result.ok, false, field);
    }
  });

  it('rejects missing fields, non-string fields, bad email, bad quantity and over-long text', () => {
    const bad = [
      { ...validBody(), bookTitle: undefined },
      { ...validBody(), bookTitle: { $ne: '' } },
      { ...validBody(), customerEmail: 'not-an-email' },
      { ...validBody(), customerEmail: 'a@b.co\r\nBcc: x@y.z' },
      { ...validBody(), quantity: 0 },
      { ...validBody(), quantity: 1.5 },
      { ...validBody(), quantity: 101 },
      { ...validBody(), specialInstructions: 'x'.repeat(2001) },
      null,
    ];
    for (const body of bad) {
      assert.equal(parseQuoteRequestBody(body).ok, false, JSON.stringify(body));
    }
  });
});

describe('createRateLimiter', () => {
  it('allows max requests per window, then blocks until the window resets', () => {
    const isLimited = createRateLimiter({ windowMs: 1000, max: 2 });
    assert.equal(isLimited('k', 0), false);
    assert.equal(isLimited('k', 10), false);
    assert.equal(isLimited('k', 20), true);
    assert.equal(isLimited('other', 20), false);
    assert.equal(isLimited('k', 1000), false);
  });
});

describe('quote-request route', () => {
  const source = readFileSync(
    new URL('../../src/app/api/quote-request/route.ts', import.meta.url),
    'utf8',
  );

  it('requires Turnstile and rate limits before processing', () => {
    assert.match(source, /verifyTurnstileToken\(/);
    assert.match(source, /createRateLimiter\(/);
  });

  it('does not pass a caller-supplied searchAnalyticsId through', () => {
    assert.equal(/body\.searchAnalyticsId|body\[['"]searchAnalyticsId/.test(source), false);
  });
});
