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
    updateInquiry: async (id: string | number, data: any) => {
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

  assert.strictEqual(fx.calls.length, 3);

  const createCall = fx.calls[0];
  assert.strictEqual(createCall.type, 'create');
  assert.strictEqual(createCall.data.emailStatus, 'pending');
  assert.deepStrictEqual(createCall.data.wholesaleDetails.productInterests, [
    { interest: 'books' },
  ]);

  const emailCall = fx.calls[1];
  assert.strictEqual(emailCall.type, 'email');
  assert.match(emailCall.email.subject, /Wholesale/);
  assert.deepStrictEqual(emailCall.email.replyTo, {
    name: 'Ada Reader',
    address: 'ada@example.com',
  });

  const sentUpdate = fx.calls[2];
  assert.strictEqual(sentUpdate.type, 'update');
  assert.strictEqual(sentUpdate.id, 'lead1');
  assert.strictEqual(sentUpdate.data.emailStatus, 'sent');
  assert.strictEqual(typeof sentUpdate.data.emailSentAt, 'string');
  assert.ok(!Number.isNaN(Date.parse(sentUpdate.data.emailSentAt)));
});

test('sanitizes visitor name before using it in the reply-to header', async () => {
  const fx = deps();

  const result = await submitPartnershipInquiry({
    body: { ...validBody, name: 'Ada\r\nBCC: bad@example.com' },
    clientIp: '203.0.113.10',
    deps: fx,
  });

  assert.strictEqual(result.status, 200);

  const emailCall = fx.calls.find((call: any) => call.type === 'email');
  assert.deepStrictEqual(emailCall.email.replyTo, {
    name: 'Ada BCC: bad@example.com',
    address: 'ada@example.com',
  });
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
      throw new Error('Honeypot submissions should not send email.');
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
      throw new Error('Rate-limited submissions should not send email.');
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
      throw new Error('Invalid submissions should not send email.');
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

test('email failure after storage records failure and returns success', async () => {
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

    assert.strictEqual(fx.calls.length, 2);
    assert.strictEqual(fx.calls[0].type, 'create');
    assert.strictEqual(fx.calls[1].type, 'update');
    assert.strictEqual(fx.calls[1].id, 'lead1');
    assert.deepStrictEqual(fx.calls[1].data, {
      emailStatus: 'failed',
      emailError: 'SMTP down',
    });
  } finally {
    console.error = originalConsoleError;
  }
});

test('sent status update failure does not mark delivered email as failed', async () => {
  const originalConsoleError = console.error;
  console.error = () => undefined;

  try {
    const fx = deps({
      updateInquiry: async (id: string | number, data: any) => {
        fx.calls.push({ type: 'update', id, data });
        if (data.emailStatus === 'sent') {
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
    assert.deepStrictEqual(
      fx.calls.map((call: any) => call.type),
      ['create', 'email', 'update'],
    );
    assert.deepStrictEqual(
      fx.calls.filter((call: any) => call.type === 'update').map((call: any) => call.data.emailStatus),
      ['sent'],
    );
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
      emailStatus: 'sent',
      emailSentAt: '2026-06-01T12:00:00.000Z',
      emailError: 'none',
      crmProvider: 'salesforce',
      crmExternalId: 'crm_123',
      crmSyncStatus: 'synced',
      crmLastSyncedAt: '2026-06-01T12:00:00.000Z',
      crmSyncError: 'none',
    },
    clientIp: '203.0.113.10',
    deps: fx,
  });

  const stored = fx.calls.find((call) => call.type === 'create').data;
  assert.strictEqual(stored.status, 'new');
  assert.strictEqual(stored.emailStatus, 'pending');
  assert.strictEqual(stored.emailSentAt, undefined);
  assert.strictEqual(stored.emailError, undefined);
  assert.strictEqual(stored.assignedTo, undefined);
  assert.strictEqual(stored.internalNotes, undefined);
  assert.strictEqual((stored as any).crmProvider, undefined);
  assert.strictEqual(stored.crmExternalId, undefined);
  assert.strictEqual(stored.crmSyncStatus, 'not_configured');
  assert.strictEqual((stored as any).crmLastSyncedAt, undefined);
  assert.strictEqual((stored as any).crmSyncError, undefined);
});
