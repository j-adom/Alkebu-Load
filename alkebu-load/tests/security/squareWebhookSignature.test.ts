import assert from 'node:assert';
import crypto from 'node:crypto';
import test from 'node:test';

import {
  buildSquareWebhookSignature,
  getSquareWebhookUrl,
  isValidSquareWebhookSignature,
} from '../../src/app/utils/squareWebhookSignature';

test('validates Square webhook signatures against the exact notification URL and raw body', () => {
  const notificationUrl = 'https://payload.alkebulanimages.com/api/webhooks/square-catalog';
  const rawBody = '{"type":"catalog.version.updated","merchant_id":"merchant"}';
  const signatureKey = 'sandbox-webhook-key';
  const signature = crypto
    .createHmac('sha256', signatureKey)
    .update(notificationUrl + rawBody)
    .digest('base64');

  assert.strictEqual(
    isValidSquareWebhookSignature({
      notificationUrl,
      rawBody,
      signature,
      signatureKey,
    }),
    true,
  );
});

test('rejects missing and mismatched Square webhook signatures', () => {
  const notificationUrl = 'https://payload.alkebulanimages.com/api/webhooks/square-catalog';
  const rawBody = '{"type":"catalog.version.updated"}';
  const signatureKey = 'sandbox-webhook-key';
  const signature = buildSquareWebhookSignature({
    notificationUrl,
    rawBody,
    signatureKey,
  });

  assert.strictEqual(
    isValidSquareWebhookSignature({
      notificationUrl,
      rawBody,
      signature: null,
      signatureKey,
    }),
    false,
  );
  assert.strictEqual(
    isValidSquareWebhookSignature({
      notificationUrl,
      rawBody: `${rawBody}\n`,
      signature,
      signatureKey,
    }),
    false,
  );
  assert.strictEqual(
    isValidSquareWebhookSignature({
      notificationUrl,
      rawBody,
      signature,
      signatureKey: undefined,
    }),
    false,
  );
});

test('builds the catalog webhook URL from the configured Payload server URL', () => {
  assert.strictEqual(
    getSquareWebhookUrl('https://payload.alkebulanimages.com/'),
    'https://payload.alkebulanimages.com/api/webhooks/square-catalog',
  );
});
