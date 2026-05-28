import assert from 'node:assert';
import test from 'node:test';

import { shouldSkipEmailTransportVerify } from '../../src/app/utils/emailConfig';

const withEnv = (values: Record<string, string | undefined>, fn: () => void) => {
  const previous = new Map<string, string | undefined>();

  for (const [key, value] of Object.entries(values)) {
    previous.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    fn();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
};

test('skips SMTP transport verification during Next production builds', () => {
  withEnv({ NEXT_PHASE: 'phase-production-build', SKIP_EMAIL_VERIFY: undefined }, () => {
    assert.strictEqual(shouldSkipEmailTransportVerify(), true);
  });
});

test('allows explicit SMTP verification opt-out outside builds', () => {
  withEnv({ NEXT_PHASE: undefined, SKIP_EMAIL_VERIFY: 'true' }, () => {
    assert.strictEqual(shouldSkipEmailTransportVerify(), true);
  });
});

test('verifies SMTP transport during normal runtime by default', () => {
  withEnv({ NEXT_PHASE: undefined, SKIP_EMAIL_VERIFY: undefined }, () => {
    assert.strictEqual(shouldSkipEmailTransportVerify(), false);
  });
});
