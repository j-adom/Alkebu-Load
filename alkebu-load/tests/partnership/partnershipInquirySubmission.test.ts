import assert from 'node:assert';
import test from 'node:test';

import { submitPartnershipInquiry } from '../../src/app/utils/partnershipInquirySubmission';
import type { EmailSendResult, PartnershipInquiryData } from '../../src/app/utils/emailService';

const validBody = {
  renderedAt: Date.now() - 5000, // 5 seconds ago — passes the min-time check
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

const okEmailResult: EmailSendResult = { success: true, provider: 'amazon-ses-smtp', host: '', port: 587, secure: false, from: '', to: '', subject: '' };
const failEmailResult = (msg: string) => ({ ...okEmailResult, success: false, error: msg });

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
    updateInquiry: async (id: string | number, data: any) => {
      calls.push({ type: 'update', id, data });
      return { id, ...data };
    },
    sendStaffEmail: async (data: PartnershipInquiryData) => {
      calls.push({ type: 'staffEmail', data });
      return okEmailResult;
    },
    sendAcknowledgementEmail: async (data: PartnershipInquiryData) => {
      calls.push({ type: 'ackEmail', data });
      return okEmailResult;
    },
    ...overrides,
  };
};

test('stores inquiry, sends both emails, and records both statuses', async () => {
  const fx = deps();

  const result = await submitPartnershipInquiry({
    body: validBody,
    clientIp: '203.0.113.10',
    deps: fx,
  });

  assert.strictEqual(result.status, 200);
  assert.deepStrictEqual(result.body, {
    success: true,
    message: 'Thanks for reaching out. Your inquiry has been received.',
  });

  // create + staffEmail + staffEmail update + ackEmail + ackEmail update = 5 calls
  assert.strictEqual(fx.calls.length, 5, `expected 5 calls, got ${fx.calls.length}`);

  const createCall = fx.calls[0];
  assert.strictEqual(createCall.type, 'create');
  // emailStatus field removed — verify other stored defaults remain
  assert.strictEqual(createCall.data.status, 'new');
  assert.strictEqual(createCall.data.crmSyncStatus, 'not_configured');
  assert.deepStrictEqual(createCall.data.wholesaleDetails.productInterests, [
    { interest: 'books' },
  ]);

  const staffEmailCall = fx.calls[1];
  assert.strictEqual(staffEmailCall.type, 'staffEmail');
  assert.strictEqual(staffEmailCall.data.typeLabel, 'Wholesale');
  assert.strictEqual(staffEmailCall.data.name, 'Ada Reader');
  assert.strictEqual(staffEmailCall.data.email, 'ada@example.com');

  const staffUpdateCall = fx.calls[2];
  assert.strictEqual(staffUpdateCall.type, 'update');
  assert.strictEqual(staffUpdateCall.id, 'lead1');
  assert.strictEqual(staffUpdateCall.data.staffEmail.status, 'sent');
  assert.strictEqual(typeof staffUpdateCall.data.staffEmail.sentAt, 'string');
  assert.ok(!Number.isNaN(Date.parse(staffUpdateCall.data.staffEmail.sentAt)));

  const ackEmailCall = fx.calls[3];
  assert.strictEqual(ackEmailCall.type, 'ackEmail');
  assert.strictEqual(ackEmailCall.data.typeLabel, 'Wholesale');

  const ackUpdateCall = fx.calls[4];
  assert.strictEqual(ackUpdateCall.type, 'update');
  assert.strictEqual(ackUpdateCall.id, 'lead1');
  assert.strictEqual(ackUpdateCall.data.acknowledgementEmail.status, 'sent');
  assert.strictEqual(typeof ackUpdateCall.data.acknowledgementEmail.sentAt, 'string');
});

test('both staff AND ack emails are attempted after createInquiry', async () => {
  const fx = deps();

  await submitPartnershipInquiry({
    body: validBody,
    clientIp: '203.0.113.10',
    deps: fx,
  });

  const staffEmailCall = fx.calls.find((c: any) => c.type === 'staffEmail');
  const ackEmailCall = fx.calls.find((c: any) => c.type === 'ackEmail');
  assert.ok(staffEmailCall, 'staff email should be attempted');
  assert.ok(ackEmailCall, 'acknowledgement email should be attempted');
});

test('staffEmail + acknowledgementEmail statuses are recorded on success', async () => {
  const fx = deps();

  await submitPartnershipInquiry({
    body: validBody,
    clientIp: '203.0.113.10',
    deps: fx,
  });

  const updates = fx.calls.filter((c: any) => c.type === 'update');
  assert.strictEqual(updates.length, 2, 'should have 2 update calls (staff + ack)');

  const staffUpdate = updates.find((u: any) => 'staffEmail' in u.data);
  const ackUpdate = updates.find((u: any) => 'acknowledgementEmail' in u.data);

  assert.ok(staffUpdate, 'staffEmail update should exist');
  assert.ok(ackUpdate, 'acknowledgementEmail update should exist');
  assert.strictEqual(staffUpdate.data.staffEmail.status, 'sent');
  assert.strictEqual(ackUpdate.data.acknowledgementEmail.status, 'sent');
});

test('ack-email failure still returns success and records acknowledgementEmail.status=failed', async () => {
  const originalConsoleError = console.error;
  console.error = () => undefined;

  try {
    const fx = deps({
      sendAcknowledgementEmail: async () => {
        throw new Error('ACK SMTP down');
      },
    });

    const result = await submitPartnershipInquiry({
      body: validBody,
      clientIp: '203.0.113.10',
      deps: fx,
    });

    assert.strictEqual(result.status, 200);
    assert.deepStrictEqual(result.body, {
      success: true,
      message: 'Thanks for reaching out. Your inquiry has been received.',
    });

    const ackUpdate = fx.calls.find(
      (c: any) => c.type === 'update' && 'acknowledgementEmail' in c.data,
    );
    assert.ok(ackUpdate, 'acknowledgementEmail update should exist even on failure');
    assert.strictEqual(ackUpdate.data.acknowledgementEmail.status, 'failed');
    assert.ok(ackUpdate.data.acknowledgementEmail.error, 'error field should be set');
  } finally {
    console.error = originalConsoleError;
  }
});

test('min-time-to-submit (< 3000ms) is rejected like honeypot — silent success, no storage', async () => {
  const fx = deps({
    verifyTurnstile: async () => {
      throw new Error('Turnstile should not be called for fast submissions.');
    },
    createInquiry: async () => {
      throw new Error('Fast submissions should not be stored.');
    },
    sendStaffEmail: async () => {
      throw new Error('Fast submissions should not send staff email.');
    },
    sendAcknowledgementEmail: async () => {
      throw new Error('Fast submissions should not send ack email.');
    },
  });

  // Use injected now to simulate a submission that happened too quickly
  const submittedAt = 1000;
  const nowAt = submittedAt + 1000; // only 1 second later, < 3000ms

  const result = await submitPartnershipInquiry({
    body: { ...validBody, renderedAt: submittedAt },
    clientIp: '203.0.113.10',
    deps: { ...fx, now: () => nowAt },
  });

  assert.strictEqual(result.status, 200);
  assert.deepStrictEqual(result.body, { success: true });
  assert.deepStrictEqual(fx.calls, []);
});

test('missing renderedAt is treated like honeypot — silent success, no storage', async () => {
  const { renderedAt: _removed, ...bodyWithoutRenderedAt } = validBody;

  const fx = deps({
    createInquiry: async () => {
      throw new Error('Missing renderedAt submissions should not be stored.');
    },
    sendStaffEmail: async () => {
      throw new Error('Missing renderedAt submissions should not send email.');
    },
    sendAcknowledgementEmail: async () => {
      throw new Error('Missing renderedAt submissions should not send ack email.');
    },
  });

  const result = await submitPartnershipInquiry({
    body: bodyWithoutRenderedAt,
    clientIp: '203.0.113.10',
    deps: fx,
  });

  assert.strictEqual(result.status, 200);
  assert.deepStrictEqual(result.body, { success: true });
  assert.deepStrictEqual(fx.calls, []);
});

test('min-time-to-submit passes when renderedAt is at least 3000ms ago', async () => {
  const fx = deps();

  const submittedAt = 1000;
  const nowAt = submittedAt + 3001; // just over 3 seconds later

  const result = await submitPartnershipInquiry({
    body: { ...validBody, renderedAt: submittedAt },
    clientIp: '203.0.113.10',
    deps: { ...fx, now: () => nowAt },
  });

  assert.strictEqual(result.status, 200);
  assert.deepStrictEqual(result.body, {
    success: true,
    message: 'Thanks for reaching out. Your inquiry has been received.',
  });
  // create should have been called
  assert.ok(
    fx.calls.find((c: any) => c.type === 'create'),
    'createInquiry should be called when renderedAt is sufficiently old',
  );
});

test('sanitizes visitor name before passing to staff email data', async () => {
  const fx = deps();

  await submitPartnershipInquiry({
    body: { ...validBody, name: 'Ada\r\nBCC: bad@example.com' },
    clientIp: '203.0.113.10',
    deps: fx,
  });

  const staffEmailCall = fx.calls.find((call: any) => call.type === 'staffEmail');
  // The name should be cleaned (newlines stripped by normalizePartnershipInquiry)
  assert.ok(staffEmailCall, 'staff email should be called');
  assert.ok(staffEmailCall.data.name, 'name should be set');
  assert.ok(
    !staffEmailCall.data.name.includes('\r') && !staffEmailCall.data.name.includes('\n'),
    'name in email data should not contain newlines',
  );
});

test('returns success for honeypot submission without storing', async () => {
  const fx = deps({
    verifyTurnstile: async () => {
      throw new Error('Turnstile should not be called for honeypot submissions.');
    },
    isRateLimited: () => {
      throw new Error('Rate limit should not be checked for honeypot submissions.');
    },
    createInquiry: async () => {
      throw new Error('Honeypot submissions should not be stored.');
    },
    sendStaffEmail: async () => {
      throw new Error('Honeypot submissions should not send staff email.');
    },
    sendAcknowledgementEmail: async () => {
      throw new Error('Honeypot submissions should not send ack email.');
    },
  });

  const result = await submitPartnershipInquiry({
    body: { ...validBody, website: 'https://spam.example' },
    clientIp: '203.0.113.10',
    deps: fx,
  });

  assert.strictEqual(result.status, 200);
  assert.deepStrictEqual(result.body, { success: true });
  assert.deepStrictEqual(fx.calls, []);
});

test('rejects failed Turnstile verification', async () => {
  const fx = deps({
    verifyTurnstile: async () => ({ success: false, error: 'Bot check did not pass.' }),
    isRateLimited: () => {
      throw new Error('Rate limit should not run after failed Turnstile.');
    },
    createInquiry: async () => {
      throw new Error('Failed Turnstile submissions should not be stored.');
    },
  });

  const result = await submitPartnershipInquiry({
    body: validBody,
    clientIp: '203.0.113.10',
    deps: fx,
  });

  assert.strictEqual(result.status, 403);
  assert.deepStrictEqual(result.body, {
    success: false,
    error: 'Bot check did not pass.',
  });
  assert.deepStrictEqual(fx.calls, []);
});

test('rejects rate-limited clients', async () => {
  const fx = deps({
    isRateLimited: () => true,
    createInquiry: async () => {
      throw new Error('Rate-limited submissions should not be stored.');
    },
    sendStaffEmail: async () => {
      throw new Error('Rate-limited submissions should not send staff email.');
    },
    sendAcknowledgementEmail: async () => {
      throw new Error('Rate-limited submissions should not send ack email.');
    },
  });

  const result = await submitPartnershipInquiry({
    body: validBody,
    clientIp: '203.0.113.10',
    deps: fx,
  });

  assert.strictEqual(result.status, 429);
  assert.deepStrictEqual(result.body, {
    success: false,
    error: 'Too many inquiries. Please wait a few minutes and try again.',
  });
  assert.deepStrictEqual(fx.calls, []);
});

test('returns validation errors before storage', async () => {
  const fx = deps({
    createInquiry: async () => {
      throw new Error('Invalid submissions should not be stored.');
    },
    sendStaffEmail: async () => {
      throw new Error('Invalid submissions should not send staff email.');
    },
    sendAcknowledgementEmail: async () => {
      throw new Error('Invalid submissions should not send ack email.');
    },
  });

  const result = await submitPartnershipInquiry({
    body: { ...validBody, name: ' ', email: 'not-an-email' },
    clientIp: '203.0.113.10',
    deps: fx,
  });

  assert.strictEqual(result.status, 400);
  assert.strictEqual(result.body.success, false);
  assert.strictEqual(result.body.error, 'Please complete the required fields.');
  assert.ok(result.body.fieldErrors);
  assert.deepStrictEqual(result.body.fieldErrors.name, ['Name is required.']);
  assert.deepStrictEqual(result.body.fieldErrors.email, [
    'Email must be a valid email address.',
  ]);
  assert.deepStrictEqual(fx.calls, []);
});

test('staff email failure after storage records failure and returns success', async () => {
  const originalConsoleError = console.error;
  console.error = () => undefined;

  try {
    const fx = deps({
      sendStaffEmail: async () => {
        throw new Error('SMTP down');
      },
    });

    const result = await submitPartnershipInquiry({
      body: validBody,
      clientIp: '203.0.113.10',
      deps: fx,
    });

    assert.strictEqual(result.status, 200);
    assert.deepStrictEqual(result.body, {
      success: true,
      message: 'Thanks for reaching out. Your inquiry has been received.',
    });

    // create + staffEmail update (failed) + ackEmail + ackEmail update = 4 calls
    const createCall = fx.calls.find((c: any) => c.type === 'create');
    assert.ok(createCall, 'create should have been called');

    const staffUpdate = fx.calls.find(
      (c: any) => c.type === 'update' && 'staffEmail' in c.data,
    );
    assert.ok(staffUpdate, 'staffEmail update should exist');
    assert.strictEqual(staffUpdate.id, 'lead1');
    assert.strictEqual(staffUpdate.data.staffEmail.status, 'failed');
    assert.strictEqual(staffUpdate.data.staffEmail.error, 'SMTP down');
  } finally {
    console.error = originalConsoleError;
  }
});

test('sent status update failure does not prevent visitor from getting success', async () => {
  const originalConsoleError = console.error;
  console.error = () => undefined;

  try {
    const fx = deps({
      updateInquiry: async (id: string | number, data: any) => {
        fx.calls.push({ type: 'update', id, data });
        // Simulate failure on staffEmail status update
        if (data.staffEmail?.status === 'sent') {
          throw new Error('Status update down');
        }
        return { id, ...data };
      },
    });

    const result = await submitPartnershipInquiry({
      body: validBody,
      clientIp: '203.0.113.10',
      deps: fx,
    });

    assert.strictEqual(result.status, 200);
    assert.deepStrictEqual(result.body, {
      success: true,
      message: 'Thanks for reaching out. Your inquiry has been received.',
    });
  } finally {
    console.error = originalConsoleError;
  }
});

test('storage failure returns error and does not send email', async () => {
  const fx = deps({
    createInquiry: async () => {
      throw new Error('Database unavailable');
    },
    sendStaffEmail: async () => {
      throw new Error('Email should not send after storage failure.');
    },
    sendAcknowledgementEmail: async () => {
      throw new Error('Ack email should not send after storage failure.');
    },
    updateInquiry: async () => {
      throw new Error('Storage failure should not update email state.');
    },
  });

  const result = await submitPartnershipInquiry({
    body: validBody,
    clientIp: '203.0.113.10',
    deps: fx,
  });

  assert.strictEqual(result.status, 500);
  assert.deepStrictEqual(result.body, {
    success: false,
    error: 'Unable to save your inquiry right now. Please try again later.',
  });
  assert.deepStrictEqual(fx.calls, []);
});

test('public and staff-only body fields are ignored by the helper path', async () => {
  const fx = deps();

  await submitPartnershipInquiry({
    body: {
      ...validBody,
      status: 'closed',
      assignedTo: 'staff-1',
      internalNotes: 'Visitor-controlled notes',
      staffEmail: { status: 'sent' },
      acknowledgementEmail: { status: 'sent' },
      crmProvider: 'salesforce',
      crmExternalId: 'crm_123',
      crmSyncStatus: 'synced',
      crmLastSyncedAt: '2026-06-01T12:00:00.000Z',
      crmSyncError: 'none',
    },
    clientIp: '203.0.113.10',
    deps: fx,
  });

  const stored = fx.calls.find((call: any) => call.type === 'create').data;
  assert.strictEqual(stored.status, 'new');
  // New schema — no emailStatus on stored
  assert.strictEqual((stored as any).emailStatus, undefined);
  assert.strictEqual(stored.assignedTo, undefined);
  assert.strictEqual(stored.internalNotes, undefined);
  assert.strictEqual((stored as any).crmProvider, undefined);
  assert.strictEqual(stored.crmExternalId, undefined);
  assert.strictEqual(stored.crmSyncStatus, 'not_configured');
  assert.strictEqual((stored as any).crmLastSyncedAt, undefined);
  assert.strictEqual((stored as any).crmSyncError, undefined);
});
