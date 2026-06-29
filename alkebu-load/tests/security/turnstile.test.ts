import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { getClientIp } from '../../src/app/utils/turnstile.js';

describe('getClientIp', () => {
  it('prefers cf-connecting-ip over x-forwarded-for', () => {
    const headers = new Headers({
      'cf-connecting-ip': '1.2.3.4',
      'x-forwarded-for': '9.9.9.9, 8.8.8.8',
    });
    assert.equal(getClientIp(headers), '1.2.3.4');
  });

  it('falls back to first (trimmed) x-forwarded-for entry', () => {
    const headers = new Headers({
      'x-forwarded-for': '  5.6.7.8  , 10.0.0.1',
    });
    assert.equal(getClientIp(headers), '5.6.7.8');
  });

  it("returns 'unknown' when neither header present", () => {
    const headers = new Headers();
    assert.equal(getClientIp(headers), 'unknown');
  });
});
