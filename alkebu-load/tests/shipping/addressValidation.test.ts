import assert from 'node:assert';
import test from 'node:test';

import {
  clearAddressValidationCache,
  validateShippingAddress,
} from '../../src/app/utils/addressValidation';

const originalToken = process.env.SHIPPO_API_TOKEN;
const originalKey = process.env.SHIPPO_API_KEY;

test.beforeEach(() => {
  clearAddressValidationCache();
  process.env.SHIPPO_API_TOKEN = 'shippo_test_token';
  delete process.env.SHIPPO_API_KEY;
});

test.after(() => {
  if (originalToken) process.env.SHIPPO_API_TOKEN = originalToken;
  else delete process.env.SHIPPO_API_TOKEN;
  if (originalKey) process.env.SHIPPO_API_KEY = originalKey;
  else delete process.env.SHIPPO_API_KEY;
});

const shippoReply = (body: Record<string, unknown>, ok = true) => {
  const calls: unknown[] = [];
  const fetchImpl = (async (...args: unknown[]) => {
    calls.push(args);
    return { ok, json: async () => body } as any;
  }) as typeof fetch;
  return { fetchImpl, calls };
};

test('formatting-only differences (suffix spelling, case, ZIP+4) count as valid', async () => {
  const { fetchImpl } = shippoReply({
    street1: '2721 Jefferson St', city: 'Nashville', state: 'TN', zip: '37208-2828',
    validation_results: { is_valid: true, messages: [] },
  });

  const result = await validateShippingAddress(
    { street: '2721 jefferson street', city: 'nashville', state: 'tn', zip: '37208', country: 'US' },
    { fetchImpl },
  );
  assert.strictEqual(result.status, 'valid');
});

test('a corrected city or ZIP comes back as a suggestion', async () => {
  const { fetchImpl } = shippoReply({
    street1: '1600 Pennsylvania Ave NW', city: 'Washington', state: 'DC', zip: '20500-0005',
    validation_results: {
      is_valid: true,
      messages: [{ type: 'address_correction', text: 'Corrected ZIP in the ZIP code field' }],
    },
  });

  const result = await validateShippingAddress(
    { street: '1600 Pennsylvania Avenue NW', city: 'Washington', state: 'DC', zip: '20501' },
    { fetchImpl },
  );
  assert.strictEqual(result.status, 'corrected');
  assert.deepStrictEqual(result.status === 'corrected' && result.suggested, {
    street: '1600 Pennsylvania Ave NW', city: 'Washington', state: 'DC', zip: '20500-0005',
  });
  assert.deepStrictEqual(result.status === 'corrected' && result.messages, ['Corrected ZIP in the ZIP code field']);
});

test('an address Shippo cannot find is invalid, with its message', async () => {
  const { fetchImpl } = shippoReply({
    street1: '99999 NOWHERE BLVD', city: 'NASHVILLE', state: 'TN', zip: '37208',
    validation_results: { is_valid: false, messages: [{ type: 'address_error', text: 'Unable to find a valid address.' }] },
  });

  const result = await validateShippingAddress(
    { street: '99999 Nowhere Blvd', city: 'Nashville', state: 'TN', zip: '37208' },
    { fetchImpl },
  );
  assert.deepStrictEqual(result, { status: 'invalid', messages: ['Unable to find a valid address.'] });
});

test('Shippo errors, timeouts and missing keys degrade to unavailable', async () => {
  const address = { street: '1 Main St', city: 'Nashville', state: 'TN', zip: '37208' };

  assert.strictEqual((await validateShippingAddress(address, { fetchImpl: shippoReply({}, false).fetchImpl })).status, 'unavailable');

  const throwing = (async () => { throw new Error('timeout'); }) as unknown as typeof fetch;
  assert.strictEqual((await validateShippingAddress(address, { fetchImpl: throwing })).status, 'unavailable');

  delete process.env.SHIPPO_API_TOKEN;
  const { fetchImpl, calls } = shippoReply({});
  assert.strictEqual((await validateShippingAddress(address, { fetchImpl })).status, 'unavailable');
  assert.strictEqual(calls.length, 0, 'no call without a key');
});

test('results are cached per address so repeated previews do not re-call Shippo', async () => {
  const { fetchImpl, calls } = shippoReply({
    street1: '2721 Jefferson St', city: 'Nashville', state: 'TN', zip: '37208',
    validation_results: { is_valid: true, messages: [] },
  });
  const address = { street: '2721 Jefferson St', city: 'Nashville', state: 'TN', zip: '37208' };

  await validateShippingAddress(address, { fetchImpl });
  await validateShippingAddress({ ...address, street: '2721 JEFFERSON STREET' }, { fetchImpl });
  assert.strictEqual(calls.length, 1);
});
