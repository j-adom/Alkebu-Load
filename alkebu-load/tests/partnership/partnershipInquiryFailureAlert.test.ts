import assert from 'node:assert';
import test from 'node:test';

import {
  alertStaffOfPartnershipInquiryFailure,
  buildPartnershipInquiryFailureAlertEmail,
  createPartnershipInquiryWithFailureAlert,
} from '../../src/app/utils/partnershipInquiryFailureAlert';

const okEmailResult = {
  success: true,
  provider: 'ses' as const,
  host: '',
  port: 587,
  secure: false,
  from: '',
  to: '',
  subject: '',
};

test('buildPartnershipInquiryFailureAlertEmail includes the submitted inquiry data', () => {
  const { subject, html, text } = buildPartnershipInquiryFailureAlertEmail({
    inquiryType: 'wholesale',
    name: 'Ada Reader',
    email: 'ada@example.com',
    organizationName: 'Diaspora Books',
    message: 'Need bulk titles for our store.',
    sourcePath: '/wholesale',
    error: new Error('relation "partnership_inquiries" does not exist'),
  });

  assert.match(subject, /Diaspora Books/);
  for (const value of [
    'wholesale',
    'Ada Reader',
    'ada@example.com',
    'Diaspora Books',
    'Need bulk titles for our store.',
    '/wholesale',
    'relation &quot;partnership_inquiries&quot; does not exist',
  ]) {
    assert.ok(html.includes(value), `expected html to include ${JSON.stringify(value)}`);
  }
  assert.ok(text.includes('Ada Reader'));
  assert.ok(text.includes('relation "partnership_inquiries" does not exist'));
});

test('buildPartnershipInquiryFailureAlertEmail HTML-escapes user-supplied fields (no hand-rolled escaping regressions)', () => {
  const { html } = buildPartnershipInquiryFailureAlertEmail({
    inquiryType: 'nonprofit',
    name: '<script>alert(1)</script>',
    email: 'x@example.com" onmouseover="alert(2)',
    organizationName: '<img src=x onerror=alert(3)>',
    message: 'Line one\n<b>bold</b> & "quoted"',
    sourcePath: '/non-profit-projects',
    error: '<script>alert(4)</script>',
  });

  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(!html.includes('<img src=x onerror=alert(3)>'));
  assert.ok(!html.includes('<script>alert(4)</script>'));
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(html.includes('&lt;img src=x onerror=alert(3)&gt;'));
});

test('buildPartnershipInquiryFailureAlertEmail falls back to a placeholder for missing fields', () => {
  const { html, text } = buildPartnershipInquiryFailureAlertEmail({
    error: new Error('boom'),
  });

  assert.ok(html.includes('(not provided)'));
  assert.ok(text.includes('(not provided)'));
});

test('alertStaffOfPartnershipInquiryFailure sends to the configured staff email and never throws on send failure', async () => {
  const calls: any[] = [];
  await assert.doesNotReject(
    alertStaffOfPartnershipInquiryFailure(
      {
        inquiryType: 'institutional',
        name: 'Jordan',
        email: 'jordan@example.com',
        error: new Error('DB down'),
      },
      {
        staffEmail: 'staff@alkebulanimages.com',
        sendEmail: async (params) => {
          calls.push(params);
          throw new Error('SMTP unreachable');
        },
      },
    ),
  );

  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].to, 'staff@alkebulanimages.com');
  assert.match(calls[0].subject, /Jordan/);
});

test('alertStaffOfPartnershipInquiryFailure logs but does not throw when sendEmail resolves success:false', async () => {
  await assert.doesNotReject(
    alertStaffOfPartnershipInquiryFailure(
      { error: new Error('DB down') },
      {
        staffEmail: 'staff@alkebulanimages.com',
        sendEmail: async () => ({ ...okEmailResult, success: false, error: 'bounced' }),
      },
    ),
  );
});

test('createPartnershipInquiryWithFailureAlert returns the create result and never alerts on success', async () => {
  const calls: any[] = [];

  const result = await createPartnershipInquiryWithFailureAlert(
    async () => ({ id: 'inq_1' }),
    { name: 'Ada Reader', email: 'ada@example.com' },
    {
      staffEmail: 'staff@alkebulanimages.com',
      sendEmail: async (params) => {
        calls.push(params);
        return okEmailResult;
      },
    },
  );

  assert.deepStrictEqual(result, { id: 'inq_1' });
  assert.strictEqual(calls.length, 0);
});

test('createPartnershipInquiryWithFailureAlert alerts staff with the submitted data and rethrows the ORIGINAL error', async () => {
  const calls: any[] = [];
  const originalError = new Error('relation "partnership_inquiries" does not exist');

  await assert.rejects(
    createPartnershipInquiryWithFailureAlert(
      async () => {
        throw originalError;
      },
      {
        inquiryType: 'wholesale',
        name: 'Ada Reader',
        email: 'ada@example.com',
        organizationName: 'Diaspora Books',
        message: 'Need bulk titles.',
        sourcePath: '/wholesale',
      },
      {
        staffEmail: 'staff@alkebulanimages.com',
        sendEmail: async (params) => {
          calls.push(params);
          return okEmailResult;
        },
      },
    ),
    (err: unknown) => err === originalError,
  );

  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].to, 'staff@alkebulanimages.com');
  assert.ok(calls[0].html.includes('Diaspora Books'));
  assert.ok(calls[0].html.includes('relation &quot;partnership_inquiries&quot; does not exist'));
});

test('createPartnershipInquiryWithFailureAlert: an email failure does NOT mask or replace the original create error', async () => {
  const originalError = new Error('relation "partnership_inquiries" does not exist');

  await assert.rejects(
    createPartnershipInquiryWithFailureAlert(
      async () => {
        throw originalError;
      },
      { name: 'Ada Reader', email: 'ada@example.com' },
      {
        staffEmail: 'staff@alkebulanimages.com',
        sendEmail: async () => {
          throw new Error('SMTP unreachable — alert email itself failed');
        },
      },
    ),
    (err: unknown) => {
      // The caller must see the ORIGINAL create failure, not the email failure.
      assert.strictEqual(err, originalError);
      assert.strictEqual((err as Error).message, 'relation "partnership_inquiries" does not exist');
      return true;
    },
  );
});
