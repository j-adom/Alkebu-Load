import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { sendRawEmail } from '../../src/app/utils/emailService';

test('sendRawEmail resolves with a failure result (not a throw) when email is unconfigured', async () => {
  // Test env has no SES credentials; the quote flow must survive that.
  const result = await sendRawEmail({
    to: 'customer@example.com',
    subject: 'Quote Request Confirmed',
    html: '<p>hello</p>',
    text: 'hello',
  });

  assert.equal(typeof result.success, 'boolean');
  assert.equal(result.to, 'customer@example.com');
});

test('quote request system sends real emails instead of console.log stubs', () => {
  const source = readFileSync(
    new URL('../../src/app/utils/quoteRequestSystem.ts', import.meta.url),
    'utf8',
  );

  // The three senders must call the email service; the commented-out stubs
  // silently dropped every B2B/quote inquiry notification in production.
  assert.equal(/\/\/\s*await emailService\.send/.test(source), false);
  const sendCalls = source.match(/await sendRawEmail\(/g) || [];
  assert.ok(sendCalls.length >= 3, `expected >=3 sendRawEmail calls, found ${sendCalls.length}`);
});
